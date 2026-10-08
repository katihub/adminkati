import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { createError, readBody } from "h3"
import { describe, expect, it, vi } from "vitest"
import TransitionDialog from "@/components/orders/TransitionDialog.vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

async function mountDialog(transition: string) {
  const wrapper = await mountSuspended(TransitionDialog, {
    props: {
      reference: "NT-000042",
      transition: transition as never,
      modeRemise: "retrait" as const,
      confirmeParClient: false,
      recuLe: null,
      open: true,
    },
    attachTo: document.body,
  })
  return { wrapper }
}

async function clickConfirm() {
  const button = document.body.querySelector<HTMLButtonElement>("[data-testid='orders-transition-confirm']")
  if (!button) throw new Error("Transition dialog did not mount")
  button.click()
  await flushPromises()
}

function registerBoth() {
  const avancer = { bodies: [] as unknown[] }
  const confirmer = { calls: 0, bodies: [] as unknown[] }
  const c1 = registerEndpoint("/api/v1/commandes/NT-000042/avancer", {
    method: "POST",
    handler: async event => {
      avancer.bodies.push(await readBody(event))
      return { id: "commande-1", reference: "NT-000042", statut: "en_preparation" }
    },
  })
  const c2 = registerEndpoint("/api/v1/commandes/NT-000042/confirmer", {
    method: "POST",
    handler: async event => {
      confirmer.calls += 1
      confirmer.bodies.push(await readBody(event))
      return { id: "commande-1", reference: "NT-000042", statut: "confirmee" }
    },
  })
  function cleanup() {
    c1()
    c2()
  }
  return { avancer, confirmer, cleanup }
}

describe("orders transition dialog", () => {
  it("requires a closure reason before allowing a close transition", async () => {
    const wrapper = await mountSuspended(TransitionDialog, {
      props: {
        reference: "NT-000042",
        transition: "close",
        modeRemise: "domicile" as const,
        confirmeParClient: false,
        recuLe: null,
        open: true,
      },
      attachTo: document.body,
    })

    const closureReason = document.body.querySelector("[data-testid='orders-transition-dialog-motif-cloture']")
    const confirmButton = document.body.querySelector<HTMLButtonElement>("[data-testid='orders-transition-confirm']")

    expect(closureReason).not.toBeNull()
    expect(confirmButton?.disabled).toBe(true)

    wrapper.unmount()
  })

  it("sends an optional reason to /avancer for a non-confirmation transition", async () => {
    let observedBody: unknown
    const cleanup = registerEndpoint("/api/v1/commandes/NT-000042/avancer", {
      method: "POST",
      handler: async event => {
        observedBody = await readBody(event)
        return { id: "commande-1", reference: "NT-000042", statut: "en_preparation" }
      },
    })
    const { wrapper } = await mountDialog("en_preparation")
    const motif = document.body.querySelector<HTMLTextAreaElement>("[data-testid='orders-transition-dialog-motif']")
    if (!motif) throw new Error("Transition dialog did not mount")
    motif.value = "Validation comptoir"
    motif.dispatchEvent(new Event("input", { bubbles: true }))
    await flushPromises()
    await clickConfirm()

    expect(observedBody).toEqual({ vers: "en_preparation", motif: "Validation comptoir" })

    cleanup()
    wrapper.unmount()
  })

  it("advances to en_preparation through /avancer and never calls /confirmer", async () => {
    const { avancer, confirmer, cleanup } = registerBoth()
    const { wrapper } = await mountDialog("en_preparation")
    await clickConfirm()

    expect(avancer.bodies).toEqual([{ vers: "en_preparation" }])
    expect(confirmer.calls).toBe(0)

    cleanup()
    wrapper.unmount()
  })

  it("confirms through /confirmer without a body, closes and emits completed", async () => {
    const { avancer, confirmer, cleanup } = registerBoth()
    const { wrapper } = await mountDialog("confirmee")
    await clickConfirm()

    expect(confirmer.calls).toBe(1)
    expect(confirmer.bodies[0]).toBeFalsy()
    expect(avancer.bodies).toHaveLength(0)
    await vi.waitFor(() => expect(wrapper.emitted("completed")).toHaveLength(1))
    expect(document.body.querySelector("[data-testid='orders-transition-dialog']")).toBeNull()

    cleanup()
    wrapper.unmount()
  })

  it("does not send the optional note to /confirmer", async () => {
    const { confirmer, cleanup } = registerBoth()
    const { wrapper } = await mountDialog("confirmee")
    const motif = document.body.querySelector<HTMLTextAreaElement>("[data-testid='orders-transition-dialog-motif']")
    if (!motif) throw new Error("Transition dialog did not mount")
    motif.value = "Validation comptoir"
    motif.dispatchEvent(new Event("input", { bubbles: true }))
    await flushPromises()
    await clickConfirm()

    expect(confirmer.calls).toBe(1)
    expect(JSON.stringify(confirmer.bodies[0] ?? null)).not.toContain("Validation comptoir")

    cleanup()
    wrapper.unmount()
  })

  it("invalidates order and product queries after a successful confirmation", async () => {
    const queryClient = useNuxtApp().$queryClient
    const ordersKey = apiQueryKeys.orders.list()
    const productsKey = apiQueryKeys.products.list()
    queryClient.setQueryData(ordersKey, [])
    queryClient.setQueryData(productsKey, [])
    const { cleanup } = registerBoth()
    const { wrapper } = await mountDialog("confirmee")
    await clickConfirm()

    expect(queryClient.getQueryState(ordersKey)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(productsKey)?.isInvalidated).toBe(true)

    cleanup()
    wrapper.unmount()
  })

  it("lists unavailable references with human motif labels on a stock conflict", async () => {
    const cleanup = registerEndpoint("/api/v1/commandes/NT-000042/confirmer", {
      method: "POST",
      handler: () => {
        throw createError({
          statusCode: 409,
          data: {
            message: "Des références ne sont plus disponibles.",
            lignes: [
              { slug: "tapis-x", motif: "stock_insuffisant" },
              { slug: "cable-y", motif: "rupture" },
            ],
          },
        })
      },
    })
    const { wrapper } = await mountDialog("confirmee")
    await clickConfirm()

    const lines = document.body.querySelector("[data-testid='orders-transition-dialog-conflict-lines']")
    expect(lines).not.toBeNull()
    const items = Array.from(lines?.querySelectorAll("li") ?? [])
    expect(items).toHaveLength(2)
    expect(items[0]?.textContent).toContain("tapis-x")
    expect(items[1]?.textContent).toContain("cable-y")
    expect(lines?.textContent).not.toContain("stock_insuffisant")
    expect(lines?.textContent).not.toContain("rupture")
    expect(document.body.querySelector("[data-testid='orders-transition-dialog']")).not.toBeNull()
    expect(wrapper.emitted("completed")).toBeUndefined()

    cleanup()
    wrapper.unmount()
  })

  it("shows both totals and refreshes orders on an amount drift conflict", async () => {
    const queryClient = useNuxtApp().$queryClient
    const listKey = apiQueryKeys.orders.list()
    const detailKey = apiQueryKeys.orders.detail("NT-000042")
    queryClient.setQueryData(listKey, [])
    queryClient.setQueryData(detailKey, {})
    const cleanup = registerEndpoint("/api/v1/commandes/NT-000042/confirmer", {
      method: "POST",
      handler: () => {
        throw createError({
          statusCode: 409,
          data: {
            message: "Le montant a changé. Le client doit ré-accepter avant confirmation.",
            totalPrecedent: 300_000,
            totalPropose: 450_000,
          },
        })
      },
    })
    const { wrapper } = await mountDialog("confirmee")
    await clickConfirm()

    const drift = document.body.querySelector("[data-testid='orders-transition-dialog-drift']")
    expect(drift).not.toBeNull()
    expect(drift?.textContent).toMatch(/300/)
    expect(drift?.textContent).toMatch(/450/)
    expect(document.body.querySelector("[data-testid='orders-transition-dialog']")).not.toBeNull()
    expect(wrapper.emitted("completed")).toBeUndefined()
    expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(detailKey)?.isInvalidated).toBe(true)

    cleanup()
    wrapper.unmount()
  })

  it("shows the generic error and no conflict detail on a 500", async () => {
    const cleanup = registerEndpoint("/api/v1/commandes/NT-000042/confirmer", {
      method: "POST",
      handler: () => {
        throw createError({ statusCode: 500 })
      },
    })
    const { wrapper } = await mountDialog("confirmee")
    await clickConfirm()

    expect(document.body.querySelector("[data-testid='orders-transition-dialog-error']")).not.toBeNull()
    expect(document.body.querySelector("[data-testid='orders-transition-dialog-conflict-lines']")).toBeNull()
    expect(document.body.querySelector("[data-testid='orders-transition-dialog-drift']")).toBeNull()
    expect(document.body.querySelector("[data-testid='orders-transition-dialog']")).not.toBeNull()
    expect(wrapper.emitted("completed")).toBeUndefined()

    cleanup()
    wrapper.unmount()
  })
})

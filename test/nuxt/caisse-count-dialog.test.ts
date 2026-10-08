import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody } from "h3"
import { afterEach, describe, expect, it } from "vitest"
import CaisseCountDialog from "@/components/caisse/CountDialog.vue"

const CAISSE_ID = "caisse-1"
const CAISSES_PATH = "/api/v1/caisses"

function mount(props: { disabled?: boolean; disabledReason?: string | null } = {}) {
  return mountSuspended(CaisseCountDialog, {
    props: { caisseId: CAISSE_ID, ...props },
    attachTo: document.body,
  })
}

async function openDialog() {
  document.body.querySelector<HTMLButtonElement>("[data-testid='caisse-count-dialog-trigger']")?.click()
  await flushPromises()
}

async function fillAmount(value: string) {
  const input = document.body.querySelector<HTMLInputElement>("[data-testid='caisse-count-dialog-amount']")!
  input.value = value
  input.dispatchEvent(new Event("input"))
  await flushPromises()
}

function confirm() {
  document.body.querySelector<HTMLButtonElement>("[data-testid='caisse-count-dialog-confirm']")?.click()
}

/**
 * Matches the reka-ui pointer-event interaction established in
 *  `products-category-picker.test.ts` — SelectTrigger opens on `pointerdown`, SelectItem
 *  commits on `pointerup`, and SelectContent is teleported so items live under `document.body`.
 *  Opening and picking are two steps with a flush between them — the portal content mounts
 *  asynchronously after the trigger's `pointerdown`.
 */
function openMotifSelect() {
  document.body
    .querySelector("[data-testid='caisse-count-dialog-motif']")!
    .dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerId: 1 }))
}

function pickMotif(label: string) {
  const item = Array.from(document.body.querySelectorAll("[data-slot='select-item']")).find(
    element => element.textContent?.trim() === label,
  )
  if (!item) throw new Error(`no motif select item found for label "${label}"`)
  item.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0, pointerId: 1 }))
}

describe("caisse count dialog", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("closes on a matching count, without ever showing the discrepancy step", async () => {
    let countBody: { montantCompte: number } | null = null
    const cleanup = registerEndpoint(`${CAISSES_PATH}/${CAISSE_ID}/compter`, {
      method: "POST",
      handler: async event => {
        countBody = await readBody(event)
        return {
          id: CAISSE_ID,
          porteurId: "membre-1",
          journee: "2026-09-08T00:00:00.000Z",
          statut: "comptee",
          montantAttendu: 15_000,
          montantCompte: 15_000,
          ecart: 0,
          compteePar: "membre-2",
          compteeLe: "2026-09-08T20:00:00.000Z",
          valideePar: null,
          valideeLe: null,
          note: null,
          creeLe: "2026-09-08T08:00:00.000Z",
        }
      },
    })

    const wrapper = await mount()
    await openDialog()
    await fillAmount("15000")
    confirm()
    await flushPromises()
    await flushPromises()

    expect(countBody).toEqual({ montantCompte: 15_000 })
    expect(document.body.querySelector("[data-testid='caisse-count-dialog-dialog']")).toBeNull()
    expect(document.body.querySelector("[data-testid='caisse-count-dialog-motif']")).toBeNull()

    cleanup()
    wrapper.unmount()
  })

  it("chains into the discrepancy step on a mismatched count, and does not close yet", async () => {
    const cleanupCount = registerEndpoint(`${CAISSES_PATH}/${CAISSE_ID}/compter`, {
      method: "POST",
      handler: () => ({
        id: CAISSE_ID,
        porteurId: "membre-1",
        journee: "2026-09-08T00:00:00.000Z",
        statut: "litige",
        montantAttendu: 15_000,
        montantCompte: 14_500,
        ecart: -500,
        compteePar: "membre-2",
        compteeLe: "2026-09-08T20:00:00.000Z",
        valideePar: null,
        valideeLe: null,
        note: null,
        creeLe: "2026-09-08T08:00:00.000Z",
      }),
    })

    const wrapper = await mount()
    await openDialog()
    await fillAmount("14500")
    confirm()
    await flushPromises()
    await flushPromises()

    expect(document.body.querySelector("[data-testid='caisse-count-dialog-dialog']")).not.toBeNull()
    expect(document.body.querySelector("[data-testid='caisse-count-dialog-motif']")).not.toBeNull()
    expect(document.body.querySelector("[data-testid='caisse-count-dialog-amount']")).toBeNull()

    cleanupCount()
    wrapper.unmount()
  })

  it("closes only after the discrepancy is named", async () => {
    const cleanupCount = registerEndpoint(`${CAISSES_PATH}/${CAISSE_ID}/compter`, {
      method: "POST",
      handler: () => ({
        id: CAISSE_ID,
        porteurId: "membre-1",
        journee: "2026-09-08T00:00:00.000Z",
        statut: "litige",
        montantAttendu: 15_000,
        montantCompte: 14_500,
        ecart: -500,
        compteePar: "membre-2",
        compteeLe: "2026-09-08T20:00:00.000Z",
        valideePar: null,
        valideeLe: null,
        note: null,
        creeLe: "2026-09-08T08:00:00.000Z",
      }),
    })
    let namedBody: { montant: number; motif: string } | null = null
    const cleanupEcart = registerEndpoint(`${CAISSES_PATH}/${CAISSE_ID}/ecart`, {
      method: "POST",
      handler: async event => {
        namedBody = await readBody(event)
        return {
          id: "ec1",
          remiseCaisseId: CAISSE_ID,
          montant: 500,
          motif: "erreur_rendu_monnaie",
          commentaire: null,
          arbitrePar: "membre-2",
          creeLe: "2026-09-08T20:05:00.000Z",
        }
      },
    })

    const wrapper = await mount()
    await openDialog()
    await fillAmount("14500")
    confirm()
    await flushPromises()
    await flushPromises()

    openMotifSelect()
    await flushPromises()
    pickMotif("Wrong change given")
    await flushPromises()
    confirm()
    await flushPromises()
    await flushPromises()

    expect(namedBody).toEqual({ montant: 500, motif: "erreur_rendu_monnaie" })
    expect(document.body.querySelector("[data-testid='caisse-count-dialog-dialog']")).toBeNull()

    cleanupCount()
    cleanupEcart()
    wrapper.unmount()
  })

  it("shows an inline error and stays open when the count request fails", async () => {
    useNuxtApp().$queryClient.setDefaultOptions({ queries: { retry: false }, mutations: { retry: false } })
    const cleanup = registerEndpoint(`${CAISSES_PATH}/${CAISSE_ID}/compter`, {
      method: "POST",
      handler: () => {
        throw createError({ statusCode: 500 })
      },
    })

    const wrapper = await mount()
    await openDialog()
    await fillAmount("15000")
    confirm()
    await flushPromises()
    await flushPromises()

    expect(document.body.querySelector("[data-testid='caisse-count-dialog-error']")).not.toBeNull()
    expect(document.body.querySelector("[data-testid='caisse-count-dialog-dialog']")).not.toBeNull()

    cleanup()
    wrapper.unmount()
    useNuxtApp().$queryClient.setDefaultOptions({ queries: { retry: 1 } })
  })

  it("disables the trigger and carries the duty reason as a title when disabled", async () => {
    const wrapper = await mount({ disabled: true, disabledReason: "caisse.duty.cannotCountOwn" })
    await flushPromises()

    const trigger = wrapper.get("[data-testid='caisse-count-dialog-trigger']")
    expect(trigger.attributes("disabled")).toBeDefined()
    expect(trigger.attributes("title")).toBe("You opened this caisse — someone else must count it")

    wrapper.unmount()
  })
})

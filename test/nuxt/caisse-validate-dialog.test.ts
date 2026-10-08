import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import CaisseValidateDialog from "@/components/caisse/ValidateDialog.vue"

const CAISSE_ID = "caisse-1"
const VALIDATE_PATH = `/api/v1/caisses/${CAISSE_ID}/valider`

function mount(props: Partial<{ disabled: boolean; disabledReason: string | null }> = {}) {
  return mountSuspended(CaisseValidateDialog, {
    props: {
      caisseId: CAISSE_ID,
      montantAttendu: 15_000,
      montantCompte: 15_000,
      ecart: 0,
      counterName: "Paul Eto",
      ...props,
    },
    attachTo: document.body,
  })
}

async function openDialog() {
  document.body.querySelector<HTMLButtonElement>("[data-testid='caisse-validate-dialog-trigger']")?.click()
  await flushPromises()
}

async function confirm() {
  document.body.querySelector<HTMLButtonElement>("[data-testid='caisse-validate-dialog-confirm']")?.click()
  await flushPromises()
  await flushPromises()
}

describe("caisse validate dialog", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("shows the expected/counted/gap amounts and who counted", async () => {
    const wrapper = await mount()
    await openDialog()

    expect(document.body.querySelector("[data-testid='caisse-validate-dialog-expected']")?.textContent).toContain(
      "15,000",
    )
    expect(document.body.querySelector("[data-testid='caisse-validate-dialog-counted']")?.textContent).toContain(
      "15,000",
    )
    expect(document.body.querySelector("[data-testid='caisse-validate-dialog']")?.textContent).toContain("Paul Eto")

    wrapper.unmount()
  })

  it("closes on a successful validation", async () => {
    let validateCalled = false
    const cleanup = registerEndpoint(VALIDATE_PATH, {
      method: "POST",
      handler: () => {
        validateCalled = true
        return { id: CAISSE_ID, statut: "validee" }
      },
    })

    const wrapper = await mount()
    await openDialog()
    await confirm()

    expect(validateCalled).toBe(true)
    expect(document.body.querySelector("[data-testid='caisse-validate-dialog']")).toBeNull()

    cleanup()
    wrapper.unmount()
  })

  it("shows an inline error and stays open when validation fails", async () => {
    useNuxtApp().$queryClient.setDefaultOptions({ queries: { retry: false } })
    const cleanup = registerEndpoint(VALIDATE_PATH, {
      method: "POST",
      handler: () => {
        throw createError({ statusCode: 409 })
      },
    })

    const wrapper = await mount()
    await openDialog()
    await confirm()

    expect(document.body.querySelector("[data-testid='caisse-validate-dialog-error']")).not.toBeNull()
    expect(document.body.querySelector("[data-testid='caisse-validate-dialog']")).not.toBeNull()

    cleanup()
    wrapper.unmount()
    useNuxtApp().$queryClient.setDefaultOptions({ queries: { retry: 1 } })
  })

  it("disables the trigger and carries the reason as a title when disabled", async () => {
    const wrapper = await mount({ disabled: true, disabledReason: "caisse.duty.needsDiscrepancyFirst" })
    await flushPromises()

    const trigger = wrapper.get("[data-testid='caisse-validate-dialog-trigger']")
    expect(trigger.attributes("disabled")).toBeDefined()
    expect(trigger.attributes("title")).toBe("Name the discrepancy before validating")

    wrapper.unmount()
  })
})

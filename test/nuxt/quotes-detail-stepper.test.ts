import type { DevisDetail } from "@/types/api/devis"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import QuotesDetailStepper from "@/components/quotes/DetailStepper.vue"

const baseQuote: DevisDetail = {
  id: "devis-1",
  reference: "DV-000042",
  clientId: "client-1",
  statut: "ouvert",
  catalogueGenereLe: null,
  totalTtc: 125_000,
  totalHt: 105_042,
  tva: 19_958,
  tauxTva: "0.1900",
  commandeId: null,
  commandeReference: null,
  creeLe: "2026-01-05T10:00:00.000Z",
  majLe: "2026-01-05T10:00:00.000Z",
  lignes: [],
}

describe("QuotesDetailStepper", () => {
  it("renders active ouvert step and upcoming commande step for open quotes", async () => {
    const wrapper = await mountSuspended(QuotesDetailStepper, {
      props: { quote: baseQuote },
    })

    const progress = wrapper.get("[role='progressbar']")
    expect(progress.attributes("aria-valuenow")).toBe("1")
    expect(wrapper.text()).toContain("Open")
    expect(wrapper.text()).toContain("Converted")

    wrapper.unmount()
  })

  it("renders completed ouvert step and active commande step for converted quotes", async () => {
    const wrapper = await mountSuspended(QuotesDetailStepper, {
      props: { quote: { ...baseQuote, statut: "commande" } },
    })

    const progress = wrapper.get("[role='progressbar']")
    expect(progress.attributes("aria-valuenow")).toBe("2")
    expect(wrapper.text()).toContain("Open")
    expect(wrapper.text()).toContain("Converted")

    wrapper.unmount()
  })

  it("renders archive badge instead of progressbar for archived quotes", async () => {
    const wrapper = await mountSuspended(QuotesDetailStepper, {
      props: { quote: { ...baseQuote, statut: "archive" } },
    })

    expect(wrapper.find("[role='progressbar']").exists()).toBe(false)
    expect(wrapper.text()).toContain("Archived")

    wrapper.unmount()
  })
})

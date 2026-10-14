import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { getQuery } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import MarketplaceQuotesWorkspace from "@/components/operations/MarketplaceQuotesWorkspace.vue"

const downloadBlob = vi.hoisted(() => vi.fn())
vi.mock("@/utils/download-file", () => ({ downloadBlob }))

const TRACKING = {
  indicateurs: { total: 8, acceptes: 2, tauxConversionBps: 2500, partiesEnRetard: 1 },
  devis: [
    {
      id: "d1",
      reference: "DM-LATE01",
      statut: "ouvert",
      entreprise: "Batiplus SARL",
      totalFcfa: 750000,
      creeLe: "2026-10-13T08:00:00.000Z",
      commande: null,
      client: { nom: "Awa Mbarga", ville: "Douala", courriel: "awa@exemple.cm" },
      parties: [
        {
          id: "p1",
          reference: "DM-LATE01-1",
          statut: "en_attente",
          totalFcfa: 500000,
          creeLe: "2026-10-13T08:00:00.000Z",
          valideJusquau: null,
          enRetard: true,
          lignes: 2,
          boutique: { id: "b1", nom: "TechMall", ville: "Douala" },
        },
        {
          id: "p2",
          reference: "DM-LATE01-2",
          statut: "confirmee",
          totalFcfa: 250000,
          creeLe: "2026-10-13T08:00:00.000Z",
          valideJusquau: "2026-10-20T08:00:00.000Z",
          enRetard: false,
          lignes: 1,
          boutique: { id: "b2", nom: "Digital House", ville: "Douala" },
        },
      ],
    },
  ],
}

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach(cleanup => cleanup())
  cleanups = []
  downloadBlob.mockReset()
  useNuxtApp().$queryClient.clear()
})

describe("marketplace quotes workspace", () => {
  it("shows conversion, late shop answers and the quote PDF, and filters late quotes", async () => {
    const queries: Array<Record<string, unknown>> = []
    let reminders = 0
    cleanups = [
      registerEndpoint("/api/v1/marketplace/administration/devis", {
        method: "GET",
        handler: event => {
          queries.push(getQuery(event))
          return TRACKING
        },
      }),
      registerEndpoint("/api/v1/marketplace/administration/devis/DM-LATE01/pdf", {
        method: "GET",
        handler: () => new Blob(["%PDF-1.4"], { type: "application/pdf" }),
      }),
      registerEndpoint("/api/v1/marketplace/administration/devis/relances", {
        method: "POST",
        handler: () => {
          reminders += 1
          return { boutiquesRelancees: 1, clientsPrevenus: 0 }
        },
      }),
    ]
    const wrapper = await mountSuspended(MarketplaceQuotesWorkspace)
    await flushPromises()

    await vi.waitFor(() => expect(wrapper.find("[data-testid='quotes-indicators']").exists()).toBe(true))
    expect(wrapper.get("[data-testid='quotes-indicators']").text()).toContain("25 %")
    const late = wrapper.get("[data-testid='quote-part-DM-LATE01-1']")
    expect(late.text()).toContain("late")
    expect(late.classes()).toContain("border-amber-300")
    expect(wrapper.get("[data-testid='quote-DM-LATE01']").text()).toContain("Batiplus SARL")

    await wrapper.get("[data-testid='quotes-late']").setValue(true)
    await vi.waitFor(() => expect(queries.at(-1)).toEqual({ enRetard: "true" }))
    await vi.waitFor(() => expect(wrapper.find("[data-testid='quote-DM-LATE01']").exists()).toBe(true))

    await wrapper
      .get("[data-testid='quote-DM-LATE01']")
      .findAll("button")
      .find(button => button.text().includes("PDF"))!
      .trigger("click")
    await vi.waitFor(() => expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), "devis-DM-LATE01.pdf"))

    await wrapper.get("[data-testid='quotes-remind']").trigger("click")
    await vi.waitFor(() => expect(reminders).toBe(1))
    wrapper.unmount()
  })
})

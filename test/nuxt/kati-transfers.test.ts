import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { getQuery } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import KatiWorkspace from "@/components/operations/kati/KatiWorkspace.vue"

const PAGE = {
  total: 2,
  page: 1,
  taille: 30,
  pages: 1,
  totaux: { transferts: 2, points: 200, valeurFcfa: 2000 },
  elements: [
    {
      id: "t2",
      creeLe: "2026-10-23T09:30:00.000Z",
      points: 80,
      valeurFcfa: 800,
      expediteur: { id: "a", nom: "Marie Nguema", courriel: "marie@example.cm", telephone: "+237 690 00 00 01" },
      destinataire: { id: "b", nom: null, courriel: "paul@example.cm", telephone: null },
    },
    {
      id: "t1",
      creeLe: "2026-10-23T09:00:00.000Z",
      points: 120,
      valeurFcfa: 1200,
      expediteur: { id: "a", nom: "Marie Nguema", courriel: "marie@example.cm", telephone: "+237 690 00 00 01" },
      destinataire: { id: "b", nom: null, courriel: "paul@example.cm", telephone: null },
    },
  ],
}

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach(cleanup => cleanup())
  cleanups = []
  useNuxtApp().$queryClient.clear()
})

describe("KATI transfers", () => {
  it("lists every transfer between clients with its totals and searches either side", async () => {
    const queries: Array<Record<string, unknown>> = []
    cleanups = [
      registerEndpoint("/api/v1/marketplace/kati/administration/transferts", {
        method: "GET",
        handler: event => {
          queries.push(getQuery(event))
          return PAGE
        },
      }),
      registerEndpoint("/api/v1/marketplace/kati/administration/indicateurs", { method: "GET", handler: () => null }),
    ]
    const wrapper = await mountSuspended(KatiWorkspace)
    await wrapper.find('[data-testid="kati-section-transfers"]').trigger("click")
    await vi.waitFor(() => expect(wrapper.find('[data-testid="kati-transfer-t2"]').exists()).toBe(true))

    expect(wrapper.find('[data-testid="kati-transfers-totals"]').text()).toMatch(/2 transfers, 200 KATI \(2,000 FCFA\)/)
    const row = wrapper.find('[data-testid="kati-transfer-t2"]').text()
    expect(row).toContain("Marie Nguema")
    expect(row).toContain("paul@example.cm")
    expect(row).toContain("80 KATI")
    expect(row).toContain("800 FCFA")

    await wrapper.find('[data-testid="kati-transfers-search"]').setValue("paul")
    await vi.waitFor(() => expect(queries.at(-1)).toMatchObject({ recherche: "paul", page: "1" }))
  })
})

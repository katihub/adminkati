import type { DevisListItem } from "@/types/api/devis"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import QuotesListPanel from "@/components/quotes/ListPanel.vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

const firstQuote: DevisListItem = {
  id: "devis-1",
  reference: "DV-000001",
  statut: "ouvert",
  totalTtc: 25_000,
  creeLe: "2026-01-05T10:00:00.000Z",
  clientId: "client-1",
  _count: { lignes: 2 },
}

const secondQuote: DevisListItem = {
  ...firstQuote,
  id: "devis-2",
  reference: "DV-000002",
  statut: "commande",
}

describe("quotes list panel", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("renders team quote rows and emits the selected reference", async () => {
    useNuxtApp().$queryClient.setQueryData(apiQueryKeys.quotes.list(), [firstQuote, secondQuote])

    const wrapper = await mountSuspended(QuotesListPanel, { props: { status: undefined } })
    await flushPromises()

    expect(wrapper.findAll("[data-testid='quotes-list-item-reference']").map(node => node.text())).toEqual([
      firstQuote.reference,
      secondQuote.reference,
    ])

    await wrapper.get("[data-testid='quotes-list-item'][data-quote-reference='DV-000002']").trigger("click")
    expect(wrapper.emitted("select")).toEqual([[secondQuote.reference]])

    wrapper.unmount()
  })

  it("emits a status filter change when a quote status pill is toggled", async () => {
    useNuxtApp().$queryClient.setQueryData(apiQueryKeys.quotes.list(), [firstQuote])

    const wrapper = await mountSuspended(QuotesListPanel, { props: { status: undefined } })
    await flushPromises()

    await wrapper.get("[data-testid='quotes-status-pill'][data-status='commande']").trigger("click")
    expect(wrapper.emitted("update:status")).toEqual([["commande"]])

    wrapper.unmount()
  })
})

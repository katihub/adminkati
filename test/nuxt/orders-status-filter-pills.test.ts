import type { StatutCommande } from "@/types/api/commandes"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import OrdersStatusFilterPills from "@/components/orders/StatusFilterPills.vue"

/**
 * Mirrors `i18n/locales/orders/en.json`'s `orders.status.*` keys exactly — the full 10-value
 *  `StatutCommande` enum, in `app/types/api/commandes.ts`.
 */
const STATUS_LABELS: Record<StatutCommande, string> = {
  soumise: "Submitted",
  confirmee: "Confirmed",
  refusee: "Refused",
  en_preparation: "Preparing",
  prete_au_retrait: "Pickup ready",
  en_remise: "Handover",
  retour_ouvert: "Return",
  annulation_demandee: "Cancel pending",
  annulee: "Cancelled",
  close: "Closed",
}

const ALL_STATUSES = Object.keys(STATUS_LABELS) as StatutCommande[]

describe("orders status filter pills", () => {
  it("renders exactly one pill per status, labeled with the matching orders.status copy", async () => {
    const wrapper = await mountSuspended(OrdersStatusFilterPills)

    const pills = wrapper.findAll("[data-testid='orders-status-pill']")
    expect(pills).toHaveLength(ALL_STATUSES.length)

    const labelByStatus = new Map(pills.map(pill => [pill.attributes("data-status"), pill.text()]))
    expect(new Set(labelByStatus.keys())).toEqual(new Set(ALL_STATUSES))
    for (const status of ALL_STATUSES) expect(labelByStatus.get(status)).toBe(STATUS_LABELS[status])

    wrapper.unmount()
  })

  it("marks no pill as pressed when there is no active status", async () => {
    const wrapper = await mountSuspended(OrdersStatusFilterPills)

    expect(wrapper.findAll("[data-testid='orders-status-pill'][aria-pressed='true']")).toHaveLength(0)

    wrapper.unmount()
  })

  it("marks only the active status's pill as pressed", async () => {
    const wrapper = await mountSuspended(OrdersStatusFilterPills, { props: { activeStatus: "confirmee" } })

    const pressed = wrapper
      .findAll("[data-testid='orders-status-pill'][aria-pressed='true']")
      .map(pill => pill.attributes("data-status"))
    expect(pressed).toEqual(["confirmee"])

    wrapper.unmount()
  })

  it("emits select with the clicked status when it differs from the current active status", async () => {
    const wrapper = await mountSuspended(OrdersStatusFilterPills, { props: { activeStatus: "soumise" } })

    await wrapper.get("[data-testid='orders-status-pill'][data-status='confirmee']").trigger("click")

    expect(wrapper.emitted("select")).toEqual([["confirmee"]])

    wrapper.unmount()
  })

  it("emits select with undefined when clicking the pill that is already the active status", async () => {
    const wrapper = await mountSuspended(OrdersStatusFilterPills, { props: { activeStatus: "confirmee" } })

    await wrapper.get("[data-testid='orders-status-pill'][data-status='confirmee']").trigger("click")

    expect(wrapper.emitted("select")).toEqual([[undefined]])

    wrapper.unmount()
  })
})

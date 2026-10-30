import type { CommandeDetail } from "@/types/api/commandes"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import RecordedEvents from "@/components/orders/RecordedEvents/RecordedEvents.vue"

const dates: Pick<CommandeDetail, "creeLe" | "livreurAffecteLe" | "recuLe" | "closeLe" | "motifCloture"> = {
  creeLe: "2026-10-27T08:00:00Z",
  livreurAffecteLe: null,
  recuLe: null,
  closeLe: null,
  motifCloture: null,
}

describe("recorded order events", () => {
  it("shows only events with a recorded date and never infers completed stages from status", async () => {
    const wrapper = await mountSuspended(RecordedEvents, { props: { order: dates } })
    expect(wrapper.findAll("time").map(time => time.attributes("datetime"))).toEqual([dates.creeLe])
    expect(wrapper.text()).not.toMatch(/courier assigned|received|closed/i)
    wrapper.unmount()
  })

  it("sorts recorded events chronologically and displays the actual closure reason", async () => {
    const order = {
      ...dates,
      livreurAffecteLe: "2026-10-28T09:00:00Z",
      recuLe: "2026-10-28T08:00:00Z",
      closeLe: "2026-10-28T10:00:00Z",
      motifCloture: "livree_partielle" as const,
    }
    const wrapper = await mountSuspended(RecordedEvents, { props: { order } })
    expect(wrapper.findAll("time").map(time => time.attributes("datetime"))).toEqual([
      order.creeLe,
      order.recuLe,
      order.livreurAffecteLe,
      order.closeLe,
    ])
    expect(wrapper.text()).toContain("Partially delivered")
    wrapper.unmount()
  })
})

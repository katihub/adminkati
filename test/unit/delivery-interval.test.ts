import type { DelaiLivraison, DelaiLivraisonInput, DelaiUnite } from "../../app/types/api/delais-livraison"
import { describe, expect, it } from "vitest"
import {
  deliveryIntervalLabel,
  findDuplicateInterval,
  resolveSelectedInterval,
  sortDeliveryIntervals,
} from "../../app/utils/delivery-interval"

function option(overrides: Partial<DelaiLivraison> & Pick<DelaiLivraison, "id">): DelaiLivraison {
  return {
    min_valeur: 1,
    max_valeur: null,
    unite: "jours",
    est_defaut: false,
    actif: true,
    utilise_par: 0,
    ...overrides,
  }
}

const UNITES: DelaiUnite[] = ["minutes", "heures", "jours_ouvres", "jours", "semaines", "mois"]

describe("deliveryIntervalLabel", () => {
  it.each(UNITES)("builds the single key for %s with the value as count and param", unite => {
    expect(deliveryIntervalLabel({ min_valeur: 3, max_valeur: null, unite })).toEqual({
      key: `products.delivery.label.single.${unite}`,
      count: 3,
      params: { count: 3 },
    })
  })

  it.each(UNITES)("builds the range key for %s with min and max params and max as count", unite => {
    expect(deliveryIntervalLabel({ min_valeur: 2, max_valeur: 5, unite })).toEqual({
      key: `products.delivery.label.range.${unite}`,
      count: 5,
      params: { min: 2, max: 5 },
    })
  })

  it("normalises the default 30..4320 minutes into a minutes-to-hours range", () => {
    expect(deliveryIntervalLabel({ min_valeur: 30, max_valeur: 4320, unite: "minutes" })).toEqual({
      key: "products.delivery.label.range.minutes_heures",
      count: 72,
      params: { min: 30, max: 72 },
    })
  })

  it("turns a single 60 minutes into 1 hour", () => {
    expect(deliveryIntervalLabel({ min_valeur: 60, max_valeur: null, unite: "minutes" })).toEqual({
      key: "products.delivery.label.single.heures",
      count: 1,
      params: { count: 1 },
    })
  })

  it("keeps a single 90 minutes in minutes because it is not a whole number of hours", () => {
    expect(deliveryIntervalLabel({ min_valeur: 90, max_valeur: null, unite: "minutes" })).toEqual({
      key: "products.delivery.label.single.minutes",
      count: 90,
      params: { count: 90 },
    })
  })

  it("turns a 60..120 minutes range into a 1..2 hours range", () => {
    expect(deliveryIntervalLabel({ min_valeur: 60, max_valeur: 120, unite: "minutes" })).toEqual({
      key: "products.delivery.label.range.heures",
      count: 2,
      params: { min: 1, max: 2 },
    })
  })

  it("keeps a 45..90 minutes range in minutes because neither bound converts", () => {
    expect(deliveryIntervalLabel({ min_valeur: 45, max_valeur: 90, unite: "minutes" })).toEqual({
      key: "products.delivery.label.range.minutes",
      count: 90,
      params: { min: 45, max: 90 },
    })
  })

  it("collapses a range whose max equals min into the single form", () => {
    expect(deliveryIntervalLabel({ min_valeur: 4, max_valeur: 4, unite: "heures" })).toEqual({
      key: "products.delivery.label.single.heures",
      count: 4,
      params: { count: 4 },
    })
  })
})

describe("sortDeliveryIntervals", () => {
  it("orders by approximate duration: 72 heures before 5 jours ouvres", () => {
    const sorted = sortDeliveryIntervals([
      option({ id: 1, min_valeur: 5, unite: "jours_ouvres" }),
      option({ id: 2, min_valeur: 72, unite: "heures" }),
    ])

    expect(sorted.map(o => o.id)).toEqual([2, 1])
  })

  it("breaks a duration tie by min_valeur: 1 semaine before 5 jours ouvres", () => {
    const sorted = sortDeliveryIntervals([
      option({ id: 1, min_valeur: 5, unite: "jours_ouvres" }),
      option({ id: 2, min_valeur: 1, unite: "semaines" }),
    ])

    expect(sorted.map(o => o.id)).toEqual([2, 1])
  })

  it("breaks a full tie by id ascending", () => {
    const sorted = sortDeliveryIntervals([
      option({ id: 9, min_valeur: 2, unite: "jours" }),
      option({ id: 3, min_valeur: 2, unite: "jours" }),
    ])

    expect(sorted.map(o => o.id)).toEqual([3, 9])
  })

  it("sorts on the upper bound of a range, not its lower bound", () => {
    const sorted = sortDeliveryIntervals([
      option({ id: 1, min_valeur: 1, max_valeur: 10, unite: "jours" }),
      option({ id: 2, min_valeur: 5, unite: "jours" }),
    ])

    expect(sorted.map(o => o.id)).toEqual([2, 1])
  })

  it("orders 2 semaines (equal to 10 jours ouvres, smaller min first), 10 jours ouvres, 1 mois, 3 mois", () => {
    const sorted = sortDeliveryIntervals([
      option({ id: 4, min_valeur: 3, unite: "mois" }),
      option({ id: 3, min_valeur: 1, unite: "mois" }),
      option({ id: 2, min_valeur: 2, unite: "semaines" }),
      option({ id: 1, min_valeur: 10, unite: "jours_ouvres" }),
    ])

    expect(sorted.map(o => o.id)).toEqual([2, 1, 3, 4])
  })

  it("puts the default first even when it is longer than the others", () => {
    const sorted = sortDeliveryIntervals([
      option({ id: 1, min_valeur: 1, unite: "heures" }),
      option({ id: 2, min_valeur: 3, unite: "mois", est_defaut: true }),
      option({ id: 3, min_valeur: 2, unite: "jours" }),
    ])

    expect(sorted.map(o => o.id)).toEqual([2, 1, 3])
  })

  it("sorts archived options like any other", () => {
    const sorted = sortDeliveryIntervals([
      option({ id: 1, min_valeur: 2, unite: "jours" }),
      option({ id: 2, min_valeur: 1, unite: "jours", actif: false }),
    ])

    expect(sorted.map(o => o.id)).toEqual([2, 1])
  })

  it("returns a new array and leaves the input untouched", () => {
    const input = [option({ id: 1, min_valeur: 3, unite: "mois" }), option({ id: 2, min_valeur: 1, unite: "heures" })]
    const snapshot = input.map(o => o.id)

    const sorted = sortDeliveryIntervals(input)

    expect(sorted).not.toBe(input)
    expect(input.map(o => o.id)).toEqual(snapshot)
  })
})

describe("findDuplicateInterval", () => {
  const candidate: DelaiLivraisonInput = { min_valeur: 3, max_valeur: 5, unite: "jours" }

  it("finds an existing option with the same unit, min and max", () => {
    const existing = option({ id: 7, min_valeur: 3, max_valeur: 5, unite: "jours" })

    expect(findDuplicateInterval([option({ id: 1 }), existing], candidate)).toBe(existing)
  })

  it("returns an archived match so the UI can offer to restore it", () => {
    const archived = option({ id: 7, min_valeur: 3, max_valeur: 5, unite: "jours", actif: false })

    expect(findDuplicateInterval([archived], candidate)?.actif).toBe(false)
  })

  it("does not treat the same numbers in a different unit as a duplicate", () => {
    const other = option({ id: 7, min_valeur: 3, max_valeur: 5, unite: "semaines" })

    expect(findDuplicateInterval([other], candidate)).toBeUndefined()
  })

  it("matches a candidate range 5-5 against an existing single 5", () => {
    const single = option({ id: 7, min_valeur: 5, max_valeur: null, unite: "jours" })

    expect(findDuplicateInterval([single], { min_valeur: 5, max_valeur: 5, unite: "jours" })).toBe(single)
  })

  it("ignores the option being edited via excludeId", () => {
    const self = option({ id: 7, min_valeur: 3, max_valeur: 5, unite: "jours" })

    expect(findDuplicateInterval([self], candidate, 7)).toBeUndefined()
  })

  it("returns undefined when nothing matches", () => {
    expect(findDuplicateInterval([option({ id: 1, min_valeur: 9, unite: "mois" })], candidate)).toBeUndefined()
  })
})

describe("resolveSelectedInterval", () => {
  const standard = option({ id: 1, est_defaut: true })
  const express = option({ id: 2, min_valeur: 1 })
  const archived = option({ id: 3, min_valeur: 9 })

  it("picks the listed option the product points at", () => {
    expect(resolveSelectedInterval([standard, express], 2)).toBe(express)
  })

  it("follows the default option when the product has no choice of its own", () => {
    expect(resolveSelectedInterval([express, standard], null)).toBe(standard)
  })

  it("falls back to the resolved option when the id is not in the list", () => {
    expect(resolveSelectedInterval([standard], 3, archived)).toBe(archived)
  })

  it("falls back to the resolved option while the list is empty or has no default", () => {
    expect(resolveSelectedInterval([], null, archived)).toBe(archived)
    expect(resolveSelectedInterval([express], null, archived)).toBe(archived)
  })

  it("is null when nothing can be resolved", () => {
    expect(resolveSelectedInterval([], null)).toBeNull()
    expect(resolveSelectedInterval([express], 9, null)).toBeNull()
  })
})

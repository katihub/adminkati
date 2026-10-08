import type { DelaiLivraison } from "../../app/types/api/delais-livraison"
import { describe, expect, it } from "vitest"
import { checkDeliveryDraft, initialDraft } from "../../app/utils/delivery-draft"

function option(overrides: Partial<DelaiLivraison> & Pick<DelaiLivraison, "id">): DelaiLivraison {
  return {
    min_valeur: 2,
    max_valeur: null,
    unite: "jours",
    est_defaut: false,
    actif: true,
    utilise_par: 0,
    ...overrides,
  }
}

describe("delivery draft opening", () => {
  it("starts blank in days when creating", () => {
    expect(initialDraft(null)).toEqual({ unit: "jours", mode: "single", min: "", max: "" })
    expect(initialDraft()).toEqual({ unit: "jours", mode: "single", min: "", max: "" })
  })

  it("starts from a single-value option as single mode", () => {
    expect(initialDraft(option({ id: 1, min_valeur: 3, unite: "semaines" }))).toEqual({
      unit: "semaines",
      mode: "single",
      min: "3",
      max: "",
    })
  })

  it("starts from a range option as range mode", () => {
    expect(initialDraft(option({ id: 1, min_valeur: 2, max_valeur: 5, unite: "heures" }))).toEqual({
      unit: "heures",
      mode: "range",
      min: "2",
      max: "5",
    })
  })
})

describe("delivery draft check", () => {
  it("accepts a valid single value and normalises the missing max to null", () => {
    expect(checkDeliveryDraft({ min_valeur: 3, unite: "jours" }, [])).toEqual({
      input: { min_valeur: 3, max_valeur: null, unite: "jours" },
      errorKey: null,
    })
  })

  it.each([
    ["an empty minimum", { min_valeur: Number.NaN, max_valeur: null, unite: "jours" }],
    ["a maximum below the minimum", { min_valeur: 5, max_valeur: 2, unite: "jours" }],
    ["a zero minimum", { min_valeur: 0, max_valeur: null, unite: "jours" }],
    ["an unknown unit", { min_valeur: 1, max_valeur: null, unite: "annees" }],
  ])("rejects %s as invalid", (_label, draft) => {
    expect(checkDeliveryDraft(draft, [])).toEqual({ input: null, errorKey: "products.delivery.dialog.invalid" })
  })

  it("rejects a duplicate of an active option", () => {
    const draft = { min_valeur: 2, max_valeur: null, unite: "jours" }
    expect(checkDeliveryDraft(draft, [option({ id: 1 })])).toEqual({
      input: null,
      errorKey: "products.delivery.dialog.duplicate",
    })
  })

  it("points a duplicate of an archived option at its restore", () => {
    const draft = { min_valeur: 2, max_valeur: null, unite: "jours" }
    expect(checkDeliveryDraft(draft, [option({ id: 1, actif: false })]).errorKey).toBe(
      "products.delivery.dialog.duplicateArchived",
    )
  })

  it("does not count the option being edited as its own duplicate", () => {
    const draft = { min_valeur: 2, max_valeur: null, unite: "jours" }
    expect(checkDeliveryDraft(draft, [option({ id: 1 })], 1).errorKey).toBeNull()
  })
})

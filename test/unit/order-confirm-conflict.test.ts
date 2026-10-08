import { describe, expect, it } from "vitest"
import { parseConfirmConflict } from "../../app/utils/order-confirm-conflict"

const stockLignes = [
  { slug: "tapis-x", motif: "stock_insuffisant" },
  { slug: "cable-y", motif: "rupture" },
]

describe("parseConfirmConflict", () => {
  it("extracts unavailable lines from a stock 409 (payload under data)", () => {
    expect(parseConfirmConflict({ statusCode: 409, data: { message: "x", lignes: stockLignes } })).toEqual({
      kind: "stock",
      lignes: stockLignes,
    })
  })

  it("extracts unavailable lines when the payload is nested under data.data", () => {
    expect(parseConfirmConflict({ statusCode: 409, data: { data: { lignes: stockLignes } } })).toEqual({
      kind: "stock",
      lignes: stockLignes,
    })
  })

  it("extracts both totals from a drift 409", () => {
    expect(parseConfirmConflict({ statusCode: 409, data: { totalPrecedent: 300_000, totalPropose: 450_000 } })).toEqual(
      { kind: "drift", totalPrecedent: 300_000, totalPropose: 450_000 },
    )
  })

  it("extracts totals nested under data.data", () => {
    expect(parseConfirmConflict({ statusCode: 409, data: { data: { totalPrecedent: 1, totalPropose: 2 } } })).toEqual({
      kind: "drift",
      totalPrecedent: 1,
      totalPropose: 2,
    })
  })

  it("returns undefined for a 409 carrying neither lines nor totals", () => {
    expect(
      parseConfirmConflict({ statusCode: 409, data: { message: "Statut changé", statutReel: "annulee" } }),
    ).toBeUndefined()
  })

  it("returns undefined for a non-409 error even with a conflict payload", () => {
    expect(parseConfirmConflict({ statusCode: 500, data: { lignes: stockLignes } })).toBeUndefined()
    expect(parseConfirmConflict({ statusCode: 400, data: { totalPrecedent: 1, totalPropose: 2 } })).toBeUndefined()
  })

  it("ignores lignes that is not an array", () => {
    expect(parseConfirmConflict({ statusCode: 409, data: { lignes: "tapis-x" } })).toBeUndefined()
  })

  it("drops items without a string slug and returns undefined when none remain", () => {
    expect(parseConfirmConflict({ statusCode: 409, data: { lignes: [{ motif: "rupture" }, null, 3] } })).toBeUndefined()
    expect(
      parseConfirmConflict({
        statusCode: 409,
        data: { lignes: [{ motif: "rupture" }, { slug: "cable-y", motif: "rupture" }] },
      }),
    ).toEqual({ kind: "stock", lignes: [{ slug: "cable-y", motif: "rupture" }] })
  })

  it("ignores totals that are not numbers", () => {
    expect(
      parseConfirmConflict({ statusCode: 409, data: { totalPrecedent: "300000", totalPropose: 450_000 } }),
    ).toBeUndefined()
  })

  it("returns undefined for non-object input", () => {
    expect(parseConfirmConflict(undefined)).toBeUndefined()
    expect(parseConfirmConflict(null)).toBeUndefined()
    expect(parseConfirmConflict("409")).toBeUndefined()
    expect(parseConfirmConflict(409)).toBeUndefined()
  })
})

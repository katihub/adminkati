import { describe, expect, it } from "vitest"
import { classifyStockImportError } from "../../app/utils/stock-import-errors"

function fail(statusCode: number, data?: unknown) {
  return { statusCode, data }
}
describe("stock import error classification", () => {
  it.each([0, 500, 502, 503, 504, 429])("treats status %i as retryable", status => {
    expect(classifyStockImportError(fail(status)).kind).toBe("retryable")
  })
  it("treats an error without any status (network failure) as retryable", () => {
    expect(classifyStockImportError(new TypeError("Failed to fetch"))).toMatchObject({ kind: "retryable", status: 0 })
  })
  it("reads the status from `status` when `statusCode` is absent", () => {
    expect(classifyStockImportError({ status: 502 })).toMatchObject({ kind: "retryable", status: 502 })
  })
  it("treats a 409 importation_en_cours as in progress", () => {
    expect(classifyStockImportError(fail(409, { code_erreur: "importation_en_cours", message: "En cours" }))).toEqual({
      kind: "inProgress",
      status: 409,
      code: "importation_en_cours",
      message: "En cours",
    })
  })
  it.each([
    [400, { code_erreur: "colonnes_manquantes", message: "Colonne manquante" }],
    [400, undefined],
    [401, undefined],
    [403, undefined],
    [409, { code_erreur: "cle_idempotence_conflit", message: "Conflit" }],
    [409, undefined],
    [413, undefined],
    [422, undefined],
  ])("treats status %i %j as rejected", (status, data) => {
    expect(classifyStockImportError(fail(status, data)).kind).toBe("rejected")
  })
  it("exposes the backend code and message", () => {
    expect(
      classifyStockImportError(fail(400, { code_erreur: "colonnes_manquantes", message: "Colonne manquante" })),
    ).toEqual({ kind: "rejected", status: 400, code: "colonnes_manquantes", message: "Colonne manquante" })
  })
  it("reads a body nested under data.data", () => {
    expect(
      classifyStockImportError({
        statusCode: 400,
        data: { data: { code_erreur: "csv_invalide", message: "Mal formé" } },
      }),
    ).toMatchObject({
      code: "csv_invalide",
      message: "Mal formé",
    })
  })
  it("drops class-validator message arrays, blank messages and non-string codes", () => {
    expect(classifyStockImportError(fail(400, { message: ["motif must be a string"], code_erreur: 12 }))).toMatchObject(
      {
        code: null,
        message: null,
      },
    )
    expect(classifyStockImportError(fail(400, { message: "   " })).message).toBeNull()
  })
  it.each([null, undefined, "boom", 42])("does not throw on %j", value => {
    expect(classifyStockImportError(value)).toMatchObject({ kind: "retryable", status: 0, code: null, message: null })
  })
})

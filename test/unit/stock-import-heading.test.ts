import type { ReponseImportStock } from "../../app/types/api/stock-import"
import type { StockImportFailure } from "../../app/types/stock-import"
import { describe, expect, it } from "vitest"
import { stockImportHeading } from "../../app/utils/stock-import-heading"

function response(over: Partial<ReponseImportStock> = {}): ReponseImportStock {
  return {
    importation_id: null,
    apercu: true,
    mode: "count",
    total_lignes: 0,
    appliquees: 0,
    ignorees: 0,
    echouees: 0,
    stock_modifiees: 0,
    inclure_stock_modifie: false,
    lignes: [],
    ...over,
  }
}
const failure = (over: Partial<StockImportFailure>): StockImportFailure => ({
  kind: "rejected",
  status: 400,
  code: null,
  message: null,
  ...over,
})
const none = { preview: null, result: null, failure: null, phase: "apply" as const }

describe("stock import heading", () => {
  it.each(["setup", "previewing", "submitting"] as const)("uses the fixed %s heading", stage => {
    expect(stockImportHeading({ ...none, stage }).id).toBe(stage)
  })

  it("falls back to the setup heading when a stage has no payload", () => {
    expect(stockImportHeading({ ...none, stage: "preview" }).id).toBe("setup")
    expect(stockImportHeading({ ...none, stage: "result" }).id).toBe("setup")
    expect(stockImportHeading({ ...none, stage: "failed" }).id).toBe("setup")
  })

  describe("review", () => {
    it.each([
      ["a clean preview", { appliquees: 3 }, "preview.clean"],
      ["rows with errors", { appliquees: 3, echouees: 2 }, "preview.errors"],
      ["stock changed since export, skipped", { appliquees: 3, stock_modifiees: 1 }, "preview.changed"],
      ["errors and changed stock", { appliquees: 3, echouees: 2, stock_modifiees: 1 }, "preview.attention"],
      [
        "changed stock included on purpose",
        { appliquees: 3, stock_modifiees: 1, inclure_stock_modifie: true },
        "preview.included",
      ],
      [
        "changed stock included, and errors",
        { appliquees: 3, echouees: 2, stock_modifiees: 1, inclure_stock_modifie: true },
        "preview.includedErrors",
      ],
      ["nothing that would change stock", { appliquees: 0, echouees: 4 }, "preview.nothing"],
    ] as const)("%s", (_label, over, id) => {
      expect(stockImportHeading({ ...none, stage: "preview", preview: response(over) }).id).toBe(id)
    })

    it("hands the counts to the copy", () => {
      const { params } = stockImportHeading({
        ...none,
        stage: "preview",
        preview: response({ appliquees: 5, echouees: 2, stock_modifiees: 1, ignorees: 4 }),
      })
      expect(params).toEqual({ count: 5, failed: 2, changed: 1, unchanged: 4 })
    })
  })

  describe("result", () => {
    it.each([
      ["everything applied", { appliquees: 3 }, "result.done"],
      ["some rows failed", { appliquees: 3, echouees: 2 }, "result.partial"],
      ["rows skipped for changed stock", { appliquees: 3, stock_modifiees: 1 }, "result.skipped"],
      ["failed and skipped", { appliquees: 3, echouees: 2, stock_modifiees: 1 }, "result.partialSkipped"],
      ["nothing applied", { appliquees: 0, echouees: 2 }, "result.none"],
    ] as const)("%s", (_label, over, id) => {
      expect(stockImportHeading({ ...none, stage: "result", result: response({ ...over, apercu: false }) }).id).toBe(id)
    })
  })

  describe("request failure", () => {
    it.each([
      [
        "a preview that lost its connection",
        failure({ kind: "retryable", status: 0 }),
        "preview",
        "failure.previewInterrupted",
      ],
      ["an apply that is still running", failure({ kind: "inProgress", status: 409 }), "apply", "failure.inProgress"],
      ["a rate limit", failure({ kind: "retryable", status: 429 }), "apply", "failure.rateLimited"],
      [
        "an apply that lost its connection",
        failure({ kind: "retryable", status: 502 }),
        "apply",
        "failure.interrupted",
      ],
      ["a rejected file", failure({ kind: "rejected", status: 400 }), "preview", "failure.rejected"],
    ] as const)("%s", (_label, fail, phase, id) => {
      expect(stockImportHeading({ ...none, stage: "failed", failure: fail, phase }).id).toBe(id)
    })
  })
})

import type { StockImportRunState } from "../../app/types/stock-import"
import { describe, expect, it } from "vitest"
import { stockImportStage } from "../../app/utils/stock-import-stage"

const none = { preview: false, result: false, failure: false }

describe("stock import stage", () => {
  it.each([
    ["idle", "setup"],
    ["previewing", "previewing"],
    ["submitting", "submitting"],
  ] as const)("shows %s as %s without needing any payload", (state, stage) => {
    expect(stockImportStage(state, none)).toBe(stage)
  })

  it.each([
    ["preview", { ...none, preview: true }],
    ["result", { ...none, result: true }],
    ["failed", { ...none, failure: true }],
  ] as const)("shows %s once its payload is present", (state, present) => {
    expect(stockImportStage(state, present)).toBe(state)
  })

  it.each(["preview", "result", "failed"] as StockImportRunState[])(
    "falls back to the setup form when %s has no payload",
    state => {
      expect(stockImportStage(state, none)).toBe("setup")
    },
  )

  it("does not take another state's payload as its own", () => {
    expect(stockImportStage("preview", { ...none, result: true, failure: true })).toBe("setup")
  })
})

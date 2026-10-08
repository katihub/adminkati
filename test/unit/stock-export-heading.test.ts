import { describe, expect, it } from "vitest"
import { stockExportHeading } from "../../app/utils/stock-export-heading"

describe("stock export heading", () => {
  it.each([
    ["ready with a normal count", { pending: false, failed: false, total: 120 }, "ready"],
    ["ready while the count is still unknown", { pending: false, failed: false, total: null }, "ready"],
    ["working", { pending: true, failed: false, total: 120 }, "pending"],
    ["working outranks a stale error", { pending: true, failed: true, total: 120 }, "pending"],
    ["failed", { pending: false, failed: true, total: 120 }, "failed"],
    ["no match", { pending: false, failed: false, total: 0 }, "empty"],
    ["over the ceiling", { pending: false, failed: false, total: 10_001 }, "blocked"],
    ["over the import limit", { pending: false, failed: false, total: 2001 }, "split"],
    ["exactly at the import limit", { pending: false, failed: false, total: 2000 }, "ready"],
  ] as const)("%s", (_label, input, id) => {
    expect(stockExportHeading(input).id).toBe(id)
  })
})

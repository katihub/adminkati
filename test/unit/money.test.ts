import { describe, expect, it } from "vitest"
import { formatMontant } from "../../app/utils/money"

describe("formatMontant", () => {
  it("shows the exact figure below the compaction threshold", () => {
    const { affiche, exact } = formatMontant(999_999, "en")

    expect(affiche).toBe(exact)
  })

  it("compacts the figure at and above one million", () => {
    const { affiche, exact } = formatMontant(1_000_000, "en")

    expect(affiche).not.toBe(exact)
  })

  it("compacts a large negative amount, not just a large positive one", () => {
    const { affiche, exact } = formatMontant(-1_000_000, "en")

    expect(affiche).not.toBe(exact)
  })

  it("keeps every digit of the exact figure in en, uncompacted by notation", () => {
    const { exact } = formatMontant(4_815_250, "en")

    expect(exact.replace(/\D/g, "")).toBe("4815250")
  })

  it("preserves the sign in the exact figure without altering its digits", () => {
    const positive = formatMontant(250_000, "en")
    const negative = formatMontant(-250_000, "en")

    expect(negative.exact).not.toBe(positive.exact)
    expect(negative.exact.replace(/\D/g, "")).toBe(positive.exact.replace(/\D/g, ""))
  })

  it("formats zero as itself rather than an empty string", () => {
    const { affiche, exact } = formatMontant(0, "en")

    expect(affiche).toBe(exact)
    expect(exact.length).toBeGreaterThan(0)
  })
})

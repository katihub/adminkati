import { describe, expect, it } from "vitest"
import { deriveProductStatus } from "../../app/utils/product-status"

describe("deriveProductStatus", () => {
  const retireLe = "2026-01-15T00:00:00.000Z"

  it.each(["en_stock", "rupture", "reapprovisionnement"] as const)(
    "reports a withdrawn product as retire regardless of its stock state (%s)",
    statut => {
      expect(deriveProductStatus(statut, retireLe)).toBe("retire")
    },
  )
})

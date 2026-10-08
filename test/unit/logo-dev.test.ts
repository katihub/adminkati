import { describe, expect, it } from "vitest"
import { logoDevNameUrl } from "../../app/utils/logo-dev"

describe("logoDevNameUrl", () => {
  it("encodes the selected brand name in a Logo.dev name-image URL", () => {
    expect(logoDevNameUrl("A & B (Cameroun)", "pk_test")).toBe(
      "https://img.logo.dev/name/A%20%26%20B%20(Cameroun)?token=pk_test&size=128&format=webp&fallback=404",
    )
  })

  it("does not build an image request without a brand name or publishable key", () => {
    expect(logoDevNameUrl("  ", "pk_test")).toBeNull()
    expect(logoDevNameUrl("Acme", "  ")).toBeNull()
  })
})

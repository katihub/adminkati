import { describe, expect, it } from "vitest"
import { isSafeRedirectPath, localeOfPath, resolveLoginRedirect } from "../../app/utils/redirect"

describe("login redirect validation", () => {
  it.each(["/", "/caisses", "/fr/caisses", "/caisses?statut=ouverte"])("accepts %s", path => {
    expect(isSafeRedirectPath(path)).toBe(true)
  })

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "\\/evil.example",
    "javascript:alert(1)",
    "%2F%2Fevil.example",
    "",
    null,
    42,
    "safe\npath",
  ])("rejects %s", path => {
    expect(isSafeRedirectPath(path)).toBe(false)
  })

  it("rejects both localized login paths", () => {
    expect(isSafeRedirectPath("/login")).toBe(false)
    expect(isSafeRedirectPath("/fr/connexion")).toBe(false)
  })

  it("detects the locale from a prefixed path", () => {
    expect(localeOfPath("/fr/x", ["en", "fr"], "en")).toBe("fr")
    expect(localeOfPath("/x", ["en", "fr"], "en")).toBe("en")
  })

  it("resolves the localized home when there is no safe next path", () => {
    expect(resolveLoginRedirect(undefined, "fr")).toBe("/fr")
  })
})

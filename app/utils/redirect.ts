export function isSafeRedirectPath(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\")
  )
    return false
  let decoded: string
  try {
    decoded = decodeURIComponent(value)
  } catch {
    return false
  }
  const hasControlCharacter = [...decoded].some(character => {
    const code = character.codePointAt(0) ?? 0
    return code < 32 || code === 127
  })
  if (hasControlCharacter || decoded.startsWith("\\/") || decoded.includes("\\")) return false
  const firstSlash = decoded.indexOf("/", 1)
  const authority = firstSlash === -1 ? decoded : decoded.slice(0, firstSlash)
  if (authority.includes(":") || decoded === "/login" || decoded === "/fr/connexion") return false
  return true
}

export function localeOfPath(path: string, locales: string[], fallback: string): string {
  const segment = path.split("/")[1]
  return segment && locales.includes(segment) ? segment : fallback
}

export function resolveLoginRedirect(next: unknown, locale: string): string {
  return isSafeRedirectPath(next) ? next : locale === "en" ? "/" : `/${locale || "en"}`
}

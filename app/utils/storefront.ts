/** Only an http(s) origin and a non-blank slug yield a link, so a bad env value can never become a `javascript:` href. */
export function storefrontProductUrl(origin: string, slug: string | null | undefined): string | null {
  const trimmedSlug = slug?.trim()
  if (!trimmedSlug) return null
  let base: URL
  try {
    base = new URL(origin.trim())
  } catch {
    return null
  }
  if (base.protocol !== "https:" && base.protocol !== "http:") return null
  return `${base.origin}/produit/${encodeURIComponent(trimmedSlug)}`
}

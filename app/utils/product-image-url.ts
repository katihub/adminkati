export function productImageUrl(rawUrl: string | null | undefined, imageOrigin?: string): string | null {
  if (!rawUrl) return null

  const url = rawUrl.trim()
  if (!url) return null

  if (/^[a-z][a-z\d+.-]*:/i.test(url) || url.startsWith("//")) return url

  if (!imageOrigin) return url

  try {
    return new URL(url, imageOrigin).toString()
  } catch {
    return url
  }
}

const IMAGE_EXTENSION = /\.(avif|gif|jpe?g|png|svg|webp)$/i
const IMAGE_FIELD = /image|logo|photo|img/i

/** Only absolute http(s) urls qualify, so a history value can never smuggle in a `javascript:` or `data:` source. */
export function imageValueUrl(field: string, value: unknown): string | null {
  if (typeof value !== "string") return null
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null
  return IMAGE_FIELD.test(field) || IMAGE_EXTENSION.test(url.pathname) ? value : null
}

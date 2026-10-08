export function logoDevNameUrl(name: string, publishableKey: string): string | null {
  const normalizedName = name.trim()
  const token = publishableKey.trim()

  if (!normalizedName || !token) return null

  const params = new URLSearchParams({ token, size: "128", format: "webp", fallback: "404" })
  return `https://img.logo.dev/name/${encodeURIComponent(normalizedName)}?${params}`
}

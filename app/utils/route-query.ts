export function routeQueryString(value: unknown): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value
  return typeof candidate === "string" && candidate.trim().length > 0 ? candidate : undefined
}

export function routeQueryUuid(value: unknown): string | null {
  const candidate = routeQueryString(value)
  return candidate && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate)
    ? candidate
    : null
}

/** A positive integer id from the query (`?point=3`), or `null` for anything else. */
export function routeQueryId(value: unknown): number | null {
  const parsed = Number(routeQueryString(value))
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

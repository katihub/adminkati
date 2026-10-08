import type { ErrorCode, Result } from "../../shared/types/result"
import { createError } from "h3"

const statusByCode: Record<ErrorCode, number> = {
  validation: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  external: 502,
  internal: 500,
}

export function unwrapOrThrow<T>(result: Result<T>): T {
  if (result.ok) return result.value
  const { code, message, cause } = result.error
  // Expected failures are normal outcomes, so only internal and external ones log their stack.
  if (cause && (code === "internal" || code === "external")) console.error(`[${code}] ${message}`, cause)
  throw createError({ statusCode: statusByCode[code], statusMessage: message, data: { code } })
}

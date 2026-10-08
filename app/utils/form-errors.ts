import type { ZodError } from "zod/v4"

/**
 * Reduces a `ZodError` to one message key per field, keyed by the field's dotted
 * path. The first issue wins because that is the one the field renders, and
 * schemas order their checks so the most useful message comes first.
 *
 * Form-level issues carry an empty path and are dropped rather than keyed under
 * `""`, which no field could ever look up.
 */
export function toFieldErrorKeys(error: ZodError): Record<string, string> {
  const keys: Record<string, string> = {}

  for (const issue of error.issues) {
    if (issue.path.length === 0) continue

    const field = issue.path.join(".")

    if (!(field in keys)) keys[field] = issue.message
  }

  return keys
}

import type { AuditActorType, AuditCategory, AuditFilters } from "@/types/api/audit"

/** The audit (12 November 2026). See plans/2026-11-12-audit.md. */
export const AUDIT_CATEGORIES: readonly AuditCategory[] = [
  "argent",
  "commandes",
  "vendeurs",
  "catalogue",
  "clients",
  "administration",
]

export const AUDIT_ACTOR_TYPES: readonly AuditActorType[] = ["equipe", "vendeur", "client", "systeme", "anonyme"]

/** Only the filters that hold a value, trimmed: the query string and the cache key stay clean. */
export function auditQuery(filters: AuditFilters): AuditFilters {
  return Object.fromEntries(
    Object.entries(filters)
      .map(([key, value]) => [key, typeof value === "string" ? value.trim() : value])
      .filter(([, value]) => Boolean(value)),
  ) as AuditFilters
}

/**
 * A readable fallback for an action code the screen has no label for:
 * `marketplace.retrait.payout_soumis` reads « Retrait · payout soumis ».
 */
export function humanizeAction(action: string): string {
  const parts = action
    .replace(/^marketplace\./, "")
    .split(".")
    .map(part => part.replaceAll("_", " "))
  const [first = "", ...rest] = parts
  return [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(" · ")
}

/** The reason of an action, when its detail carries one. */
export function auditReason(detail: unknown): string | null {
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) return null
  const reason = (detail as Record<string, unknown>).motif
  return typeof reason === "string" && reason.trim() ? reason : null
}

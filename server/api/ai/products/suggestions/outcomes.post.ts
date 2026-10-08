import type { ProductCopyField } from "../../../../../app/types/ai/product-copy"
import { createError, defineEventHandler, readBody } from "h3"
import { productCopyOutcomeSchema } from "../../../../../app/schemas/ai-product-copy"
import { writeProductCopyOutcomeAudit } from "../../../../utils/ai/audit"
import { ensureFreshSession } from "../../../../utils/api-session"

const MAX_OUTCOMES_PER_WINDOW = 120
const OUTCOME_WINDOW_MS = 300_000
const outcomeWindows = new Map<string, { startedAt: number; count: number }>()

function canRecordOutcome(actorId: string, now: number): boolean {
  const current = outcomeWindows.get(actorId)
  if (!current || now - current.startedAt >= OUTCOME_WINDOW_MS) {
    outcomeWindows.set(actorId, { startedAt: now, count: 1 })
    return true
  }
  if (current.count >= MAX_OUTCOMES_PER_WINDOW) return false
  current.count += 1
  return true
}

function parseOutcome(body: unknown): { requestId: string; field: ProductCopyField; action: "applied" | "dismissed" } {
  const parsed = productCopyOutcomeSchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: "Invalid outcome" })
  return parsed.data
}

/** CSRF is inherited from the `/api/**` Nuxt security rule; no product record is read or written here. */
export default defineEventHandler(async event => {
  const session = await ensureFreshSession(event)
  if (!session) throw createError({ statusCode: 401, statusMessage: "Authentication required" })
  if (!session.user.roles.includes("direction")) throw createError({ statusCode: 403, statusMessage: "Forbidden" })

  const outcome = parseOutcome(await readBody(event))
  const occurredAt = Date.now()
  if (!canRecordOutcome(session.user.userId, occurredAt)) {
    throw createError({ statusCode: 429, statusMessage: "Too many outcome events" })
  }

  writeProductCopyOutcomeAudit({ actorId: session.user.userId, occurredAt, ...outcome })
  return { ok: true }
})

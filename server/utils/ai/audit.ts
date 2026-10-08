import type {
  ProductCopyErrorReason,
  ProductCopyField,
  ProductCopyImageProfile,
  ProductCopyLanguage,
} from "../../../app/types/ai/product-copy"

interface AuditUsage {
  inputTokens: number
  cachedInputTokens?: number | null
  outputTokens: number
  reasoningTokens?: number | null
  totalTokens: number
}

interface AuditAssets {
  imageCount: number
  datasheetUsed: boolean
}

interface AuditContext {
  promptVersion: string
  draftTextChars: number
  nonEmptyFactCount: number
  fields: ProductCopyField[]
  imageProfile: ProductCopyImageProfile
  candidateImageCount: number
  imageCount: number
  imageFallback: boolean
  incompleteReason: string | null
}

export interface ProductCopyOutcomeAuditInput {
  actorId: string
  requestId: string
  field: ProductCopyField
  action: "applied" | "dismissed"
  occurredAt: number
}

export interface ProductCopyOutcomeAuditRecord {
  event: "ai.product_copy_outcome"
  actorId: string
  requestId: string
  field: ProductCopyField
  action: "applied" | "dismissed"
  occurredAt: string
}

type AuditOutcome = "success" | ProductCopyErrorReason
type AuditQuota = "allowed" | "busy" | "quota_exceeded" | "not_checked"

export interface ProductCopyAuditInput {
  requestId: string
  actorId: string
  productId?: number | null
  language?: ProductCopyLanguage | null
  model: string
  startedAt: number
  finishedAt: number
  outcome: AuditOutcome
  quota: AuditQuota
  usage?: AuditUsage | null
  estimatedCostUsd?: number | null
  assets?: AuditAssets | null
  context?: AuditContext | null
}

export interface ProductCopyAuditRecord {
  event: "ai.product_copy"
  requestId: string
  actorId: string
  productId: number | null
  language: ProductCopyLanguage | null
  model: string
  startedAt: string
  finishedAt: string
  latencyMs: number
  outcome: AuditOutcome
  quota: AuditQuota
  usage: AuditUsage | null
  estimatedCostUsd: number | null
  assets: AuditAssets | null
  context: AuditContext | null
}

export type ProductCopyAuditSink = (record: ProductCopyAuditRecord) => void

function logAsJsonLine(record: ProductCopyAuditRecord): void {
  console.info(JSON.stringify(record))
}

/** Field by field on purpose: spreading the input would let a stray prompt, URL or error object into the log. */
function toAuditRecord(input: ProductCopyAuditInput): ProductCopyAuditRecord {
  return {
    event: "ai.product_copy",
    requestId: input.requestId,
    actorId: input.actorId,
    productId: input.productId ?? null,
    language: input.language ?? null,
    model: input.model,
    startedAt: new Date(input.startedAt).toISOString(),
    finishedAt: new Date(input.finishedAt).toISOString(),
    latencyMs: Math.max(0, input.finishedAt - input.startedAt),
    outcome: input.outcome,
    quota: input.quota,
    usage: input.usage
      ? {
          inputTokens: input.usage.inputTokens,
          cachedInputTokens: input.usage.cachedInputTokens ?? null,
          outputTokens: input.usage.outputTokens,
          reasoningTokens: input.usage.reasoningTokens ?? null,
          totalTokens: input.usage.totalTokens,
        }
      : null,
    estimatedCostUsd: input.estimatedCostUsd ?? null,
    assets: input.assets ? { imageCount: input.assets.imageCount, datasheetUsed: input.assets.datasheetUsed } : null,
    context: input.context
      ? {
          promptVersion: input.context.promptVersion,
          draftTextChars: input.context.draftTextChars,
          nonEmptyFactCount: input.context.nonEmptyFactCount,
          fields: [...input.context.fields],
          imageProfile: input.context.imageProfile,
          candidateImageCount: input.context.candidateImageCount,
          imageCount: input.context.imageCount,
          imageFallback: input.context.imageFallback,
          incompleteReason: input.context.incompleteReason,
        }
      : null,
  }
}

/** A failing audit sink must never fail the request it describes, and its error text is not logged. */
export function writeProductCopyAudit(input: ProductCopyAuditInput, sink: ProductCopyAuditSink = logAsJsonLine): void {
  try {
    sink(toAuditRecord(input))
  } catch {
    console.error("ai.product_copy audit write failed")
  }
}

export type ProductCopyOutcomeAuditSink = (record: ProductCopyOutcomeAuditRecord) => void

function logOutcomeAsJsonLine(record: ProductCopyOutcomeAuditRecord): void {
  console.info(JSON.stringify(record))
}

/** Outcome telemetry intentionally has no product id or text: it measures card decisions, not product history. */
export function writeProductCopyOutcomeAudit(
  input: ProductCopyOutcomeAuditInput,
  sink: ProductCopyOutcomeAuditSink = logOutcomeAsJsonLine,
): void {
  try {
    sink({
      event: "ai.product_copy_outcome",
      actorId: input.actorId,
      requestId: input.requestId,
      field: input.field,
      action: input.action,
      occurredAt: new Date(input.occurredAt).toISOString(),
    })
  } catch {
    console.error("ai.product_copy_outcome audit write failed")
  }
}

import type { ProductCopyErrorReason } from "../../../app/types/ai/product-copy"

const STATUS_BY_REASON: Record<ProductCopyErrorReason, number> = {
  forbidden: 403,
  invalid_request: 400,
  insufficient_context: 422,
  prompt_too_large: 422,
  busy: 409,
  quota_exceeded: 429,
  provider_unavailable: 502,
  provider_timeout: 503,
  provider_refused: 422,
  invalid_model_output: 422,
}

const MAX_PROVIDER_DETAIL_CHARS = 300

/**
 * The provider's own explanation, made safe to show the operator who triggered it: key-shaped strings and URLs
 * are masked, whitespace is collapsed and the length is capped. Anything left is the provider's wording only.
 */
export function maskSecrets(raw: string): string {
  return raw.replace(/\bsk-[\w*.-]{4,}/gi, "[key]").replace(/https?:\/\/\S+/gi, "[link]")
}

export function sanitizeProviderDetail(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined
  const cleaned = maskSecrets(raw).replace(/\s+/g, " ").trim()
  if (cleaned === "") return undefined
  return cleaned.length > MAX_PROVIDER_DETAIL_CHARS ? `${cleaned.slice(0, MAX_PROVIDER_DETAIL_CHARS - 1)}…` : cleaned
}

/**
 * The only error type the AI services throw. Its message is a fixed phrase on purpose: the original provider
 * error is never carried as-is. Only `providerDetail`, already sanitised, may travel to the operator's panel;
 * it is never logged.
 */
export class ProductCopyError extends Error {
  readonly statusCode: number

  constructor(
    readonly reason: ProductCopyErrorReason,
    readonly retryAfterSeconds?: number,
    readonly incompleteReason?: string,
    readonly providerDetail?: string,
  ) {
    super(reason)
    this.name = "ProductCopyError"
    this.statusCode = STATUS_BY_REASON[reason]
  }
}

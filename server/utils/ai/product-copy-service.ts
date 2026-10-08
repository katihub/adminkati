import type {
  ProductCopyChoices,
  ProductCopyDraft,
  ProductCopyField,
  ProductCopyLanguage,
  ProductCopySuggestion,
} from "../../../app/types/ai/product-copy"
import { PRODUCT_COPY_FIELDS } from "../../../app/types/ai/product-copy"
import { countProductCopyFacts, parseProductCopyOutput } from "../../../app/utils/ai-product-copy"
import { ProductCopyError, sanitizeProviderDetail } from "./errors"
import { resolveProductCopyPolicy } from "./product-copy-policy"
import { buildInput, buildInstructions, productCopyJsonSchema } from "./product-copy-prompt"

/** The slice of an OpenAI Responses reply this service reads. */
export interface ModelResponse {
  status?: string
  output_text?: string
  output?: Array<{ type: string; content?: Array<{ type: string; text?: string; refusal?: string }> }>
  usage?: {
    input_tokens: number
    input_tokens_details?: { cached_tokens?: number }
    output_tokens: number
    output_tokens_details?: { reasoning_tokens?: number }
    total_tokens: number
  } | null
  incomplete_details?: { reason?: string } | null
}

/** What this service sends. `store: false` keeps product text out of the provider's stored responses. */
export interface ModelRequest {
  model: string
  instructions: string
  input: Array<{
    role: "user"
    content: Array<
      { type: "input_text"; text: string } | { type: "input_image"; image_url: string; detail: "low" | "high" | "auto" }
    >
  }>
  text: { format: { type: "json_schema"; name: string; strict: true; schema: Record<string, unknown> } }
  max_output_tokens: number
  store: false
  reasoning: { effort: "minimal" | "low" | "medium" | "high" }
}

/** The OpenAI client boundary: tests double this, production adapts the official SDK to it. */
export interface ProductCopyModelClient {
  create: (request: ModelRequest, options: { timeoutMs: number }) => Promise<ModelResponse>
}

export interface ProductCopyServiceConfig {
  model: string
  maxOutputTokens: number
  timeoutMs: number
  reasoningEffort?: string
  outputTokenCaps?: Partial<Record<ProductCopyField, number>>
}

export interface GenerateProductCopyInput {
  language: ProductCopyLanguage
  draft: ProductCopyDraft
  imageUrls?: string[]
  imageInputs?: Array<{ image_url: string; detail: "low" | "auto" }>
  fields?: ProductCopyField[]
  /** The closed lists a suggested brand, department or category must come from. */
  choices?: ProductCopyChoices
}

export interface GenerateProductCopyResult {
  suggestion: Partial<ProductCopySuggestion>
  imageCount: number
  /** True when the provider could not read the images and the package was produced from text alone. */
  imageFallback: boolean
  usage: {
    inputTokens: number
    cachedInputTokens: number | null
    outputTokens: number
    reasoningTokens: number | null
    totalTokens: number
  } | null
}

const TIMEOUT_ERROR_NAMES = new Set(["APIConnectionTimeoutError", "AbortError", "TimeoutError"])

function field(error: unknown, key: string): unknown {
  return error && typeof error === "object" ? (error as Record<string, unknown>)[key] : undefined
}

/** The provider reports an image it could not download as a 400 with this code; only that case is worth a retry. */
function isUnreadableImageError(error: unknown): boolean {
  return field(error, "status") === 400 && field(error, "code") === "invalid_image_url"
}

/** What OpenAI said went wrong, as "code: message"; sanitised before it can leave the server. */
function providerDetailOf(error: unknown): string | undefined {
  const body = field(error, "error")
  const bodyField = (key: string) =>
    body && typeof body === "object" ? (body as Record<string, unknown>)[key] : undefined
  const message = bodyField("message") ?? field(error, "message")
  const code = bodyField("code") ?? field(error, "code")
  const text = typeof message === "string" ? message : undefined
  return sanitizeProviderDetail(typeof code === "string" && text ? `${code}: ${text}` : (text ?? code))
}

/** Only the error's kind and OpenAI's own sanitised explanation survive; the raw error is dropped. */
function toProviderError(error: unknown): ProductCopyError {
  const name = field(error, "name")
  return new ProductCopyError(
    typeof name === "string" && TIMEOUT_ERROR_NAMES.has(name) ? "provider_timeout" : "provider_unavailable",
    undefined,
    undefined,
    providerDetailOf(error),
  )
}

function send(
  client: ProductCopyModelClient,
  config: ProductCopyServiceConfig,
  input: GenerateProductCopyInput,
  images: Array<{ image_url: string; detail: "low" | "auto" }>,
): Promise<ModelResponse> {
  const fields = input.fields ?? [...PRODUCT_COPY_FIELDS]
  const policy = resolveProductCopyPolicy(fields, config)
  const request: ModelRequest = {
    model: config.model,
    instructions: buildInstructions(
      input.language,
      fields,
      images.length > 0 && countProductCopyFacts(input.draft) <= 1,
    ),
    input: buildInput(input.draft, images, { fields, choices: input.choices }),
    text: {
      format: {
        type: "json_schema",
        name: "product_copy",
        strict: true,
        schema: productCopyJsonSchema(fields, input.choices),
      },
    },
    max_output_tokens: policy.maxOutputTokens,
    store: false,
    reasoning: { effort: policy.reasoningEffort },
  }
  return client.create(request, { timeoutMs: config.timeoutMs })
}

function contentParts(response: ModelResponse) {
  return (response.output ?? []).flatMap(item => item.content ?? [])
}

function readOutputText(response: ModelResponse): string {
  if (response.output_text) return response.output_text
  return contentParts(response)
    .filter(part => part.type === "output_text")
    .map(part => part.text ?? "")
    .join("")
}

const SAFE_INCOMPLETE_REASONS = new Set(["content_filter", "max_output_tokens"])

function incompleteReason(response: ModelResponse): string | undefined {
  const reason = response.incomplete_details?.reason
  return typeof reason === "string" && SAFE_INCOMPLETE_REASONS.has(reason) ? reason : undefined
}

function readSuggestion(
  response: ModelResponse,
  fields: ProductCopyField[],
  choices: ProductCopyChoices | undefined,
): Partial<ProductCopySuggestion> {
  const refusal = contentParts(response).find(part => part.type === "refusal")
  if (refusal)
    throw new ProductCopyError("provider_refused", undefined, undefined, sanitizeProviderDetail(refusal.refusal))
  if (response.status === "incomplete") {
    const reason = incompleteReason(response)
    throw new ProductCopyError(
      "invalid_model_output",
      undefined,
      reason,
      sanitizeProviderDetail(reason && `The answer was cut short: ${reason.replaceAll("_", " ")}.`),
    )
  }
  const suggestion = parseProductCopyOutput(readOutputText(response), fields, choices)
  if (!suggestion) {
    throw new ProductCopyError(
      "invalid_model_output",
      undefined,
      undefined,
      "The answer did not match the expected format.",
    )
  }
  return suggestion
}

function readUsage(response: ModelResponse): GenerateProductCopyResult["usage"] {
  if (!response.usage) return null
  return {
    inputTokens: response.usage.input_tokens,
    cachedInputTokens: response.usage.input_tokens_details?.cached_tokens ?? null,
    outputTokens: response.usage.output_tokens,
    reasoningTokens: response.usage.output_tokens_details?.reasoning_tokens ?? null,
    totalTokens: response.usage.total_tokens,
  }
}

export async function generateProductCopy(
  client: ProductCopyModelClient,
  config: ProductCopyServiceConfig,
  input: GenerateProductCopyInput,
): Promise<GenerateProductCopyResult> {
  let imageInputs =
    input.imageInputs ?? (input.imageUrls ?? []).map(image_url => ({ image_url, detail: "auto" as const }))
  let imageFallback = false
  let response: ModelResponse

  try {
    response = await send(client, config, input, imageInputs)
  } catch (error) {
    if (imageInputs.length === 0 || !isUnreadableImageError(error)) throw toProviderError(error)
    imageInputs = []
    imageFallback = true
    try {
      response = await send(client, config, input, imageInputs)
    } catch (retryError) {
      throw toProviderError(retryError)
    }
  }

  return {
    suggestion: readSuggestion(response, input.fields ?? [...PRODUCT_COPY_FIELDS], input.choices),
    imageCount: imageInputs.length,
    imageFallback,
    usage: readUsage(response),
  }
}

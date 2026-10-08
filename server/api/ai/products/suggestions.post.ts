import type {
  ProductCopyImageProfile,
  ProductCopySuggestionRequest,
  ProductCopySuggestionResponse,
} from "../../../../app/types/ai/product-copy"
import type { SessionData } from "../../../../app/types/session"
import type { ProductCopyAuditInput } from "../../../utils/ai/audit"
import type { GenerationLimiter } from "../../../utils/ai/rate-limit"
import type { H3Event } from "h3"
import { createError, defineEventHandler, readBody } from "h3"
import { productCopyRequestSchema } from "../../../../app/schemas/ai-product-copy"
import { PRODUCT_COPY_IMAGE_PROFILES } from "../../../../app/types/ai/product-copy"
import { countProductCopyFacts, hasEnoughProductContext, measureDraftText } from "../../../../app/utils/ai-product-copy"
import { writeProductCopyAudit } from "../../../utils/ai/audit"
import { ProductCopyError } from "../../../utils/ai/errors"
import { logProductCopyFailure } from "../../../utils/ai/failure-log"
import { createOpenAiProductCopyClient } from "../../../utils/ai/openai-client"
import { resolveProductAssets } from "../../../utils/ai/product-assets"
import { readPersistedProduct } from "../../../utils/ai/product-context"
import { PRODUCT_COPY_PROMPT_VERSION } from "../../../utils/ai/product-copy-prompt"
import { generateProductCopy } from "../../../utils/ai/product-copy-service"
import { createGenerationLimiter } from "../../../utils/ai/rate-limit"
import { ensureFreshSession } from "../../../utils/api-session"

type Config = ReturnType<typeof useRuntimeConfig>

type AuditTrail = Partial<
  Pick<ProductCopyAuditInput, "language" | "productId" | "usage" | "estimatedCostUsd" | "assets" | "context">
> &
  Pick<ProductCopyAuditInput, "quota">

/** One limiter per process, created on the first request because its allowance comes from runtime config. */
let limiter: GenerationLimiter | undefined

function getLimiter(limit: number): GenerationLimiter {
  limiter ??= createGenerationLimiter({ limit, now: () => Date.now() })
  return limiter
}

function parseRequest(body: unknown, defaultImageProfile: ProductCopyImageProfile): ProductCopySuggestionRequest {
  const requestBody =
    body && typeof body === "object" && !Array.isArray(body) && !Object.hasOwn(body, "imageProfile")
      ? { ...body, imageProfile: defaultImageProfile }
      : body
  const parsed = productCopyRequestSchema.safeParse(requestBody)
  if (!parsed.success) {
    // Paths and codes only: the log line must name the offending field without carrying any product text.
    const issues = parsed.error.issues.slice(0, 8).map(issue => `${issue.path.join(".") || "(body)"}:${issue.code}`)
    throw new ProductCopyError("invalid_request", undefined, issues.join(", "))
  }
  return parsed.data
}

function configuredImageProfile(value: string): ProductCopyImageProfile {
  if (PRODUCT_COPY_IMAGE_PROFILES.includes(value as ProductCopyImageProfile)) return value as ProductCopyImageProfile
  throw new ProductCopyError("provider_unavailable")
}

/** Optimistic about images: only a saved product can have any, and the lookup that proves it comes later. */
function assertCanGenerate(
  { productId, draft, fields, brands, departments, categories }: ProductCopySuggestionRequest,
  config: Config,
) {
  const saved = productId !== undefined
  if (!hasEnoughProductContext(draft, saved, fields, saved ? 1 : 0)) throw new ProductCopyError("insufficient_context")
  const missingOptions =
    (fields.includes("brand") && !brands?.length) ||
    (fields.includes("department") && !departments?.length) ||
    ((fields.includes("primaryCategory") || fields.includes("secondaryCategories")) && !categories?.length)
  if (missingOptions) throw new ProductCopyError("invalid_request")
  if (measureDraftText(draft) > config.aiProductCopyPromptCharLimit) throw new ProductCopyError("prompt_too_large")
  if (!config.openaiApiKey?.trim()) throw new ProductCopyError("provider_unavailable")
}

function acquireLease(userId: string, config: Config, trail: AuditTrail) {
  const lease = getLimiter(config.aiProductCopyQuotaPerHour).acquire(userId)
  if (lease.ok) {
    trail.quota = "allowed"
    return lease
  }
  trail.quota = lease.reason
  throw new ProductCopyError(lease.reason, lease.reason === "quota_exceeded" ? lease.retryAfterSeconds : undefined)
}

async function loadAssets(
  productId: number | undefined,
  accessToken: string,
  imageProfile: ProductCopySuggestionRequest["imageProfile"],
  config: Config,
) {
  if (productId === undefined) return resolveProductAssets({ kind: "absent" }, imageProfile)
  const persisted = await readPersistedProduct(productId, accessToken, {
    apiBaseUrl: config.apiBaseUrl,
    sharedSecret: config.backendSharedSecret,
    fetchJson: (url, options) => $fetch(url, options),
  })
  if (persisted.kind === "denied") throw new ProductCopyError("forbidden")
  return resolveProductAssets(persisted, imageProfile)
}

function estimateCostUsd(
  usage: { inputTokens: number; outputTokens: number },
  prices: { input: number; output: number },
): number {
  return (usage.inputTokens * prices.input + usage.outputTokens * prices.output) / 1_000_000
}

type Assets = Awaited<ReturnType<typeof loadAssets>>

/** A draft without enough text is only allowed through when the saved product really has a usable image. */
async function loadAssetsProvingContext(
  request: ProductCopySuggestionRequest,
  session: SessionData,
  config: Config,
): Promise<Assets | undefined> {
  const { productId, draft, fields, imageProfile } = request
  if (hasEnoughProductContext(draft, productId !== undefined, fields)) return undefined
  const assets = await loadAssets(productId, session.accessToken, imageProfile, config)
  if (!hasEnoughProductContext(draft, true, fields, assets.candidateImageCount))
    throw new ProductCopyError("insufficient_context")
  return assets
}

async function generate(
  request: ProductCopySuggestionRequest,
  session: SessionData,
  config: Config,
  trail: AuditTrail,
  preloaded?: Assets,
): Promise<Omit<ProductCopySuggestionResponse, "requestId">> {
  const assets = preloaded ?? (await loadAssets(request.productId, session.accessToken, request.imageProfile, config))
  trail.context = {
    promptVersion: PRODUCT_COPY_PROMPT_VERSION,
    draftTextChars: measureDraftText(request.draft),
    nonEmptyFactCount: countProductCopyFacts(request.draft),
    fields: [...request.fields],
    imageProfile: request.imageProfile,
    candidateImageCount: assets.candidateImageCount,
    imageCount: assets.imageInputs.length,
    imageFallback: false,
    incompleteReason: null,
  }
  const result = await generateProductCopy(
    createOpenAiProductCopyClient(config.openaiApiKey),
    {
      model: config.aiProductCopyModel,
      maxOutputTokens: config.aiProductCopyMaxOutputTokens,
      timeoutMs: config.aiProductCopyTimeoutMs,
      reasoningEffort: config.aiProductCopyReasoningEffort,
      outputTokenCaps: {
        name: config.aiProductCopyNameMaxOutputTokens,
        shortDescription: config.aiProductCopyShortDescriptionMaxOutputTokens,
        longDescription: config.aiProductCopyLongDescriptionMaxOutputTokens,
        features: config.aiProductCopyFeaturesMaxOutputTokens,
      },
    },
    {
      language: request.language,
      draft: request.draft,
      imageInputs: assets.imageInputs,
      fields: request.fields,
      choices: {
        brands: request.brands ?? [],
        departments: request.departments ?? [],
        categories: request.categories ?? [],
      },
    },
  )

  trail.usage = result.usage
  trail.estimatedCostUsd = result.usage
    ? estimateCostUsd(result.usage, {
        input: config.aiProductCopyInputUsdPerMillionTokens,
        output: config.aiProductCopyOutputUsdPerMillionTokens,
      })
    : null
  trail.assets = { imageCount: result.imageCount, datasheetUsed: assets.datasheetUsed }
  if (trail.context) {
    trail.context.imageCount = result.imageCount
    trail.context.imageFallback = result.imageFallback
  }

  const warnings = result.imageFallback
    ? [...new Set([...assets.warnings, "image_unavailable" as const])]
    : assets.warnings
  return {
    suggestion: result.suggestion,
    assets: {
      imageProfile: assets.imageProfile,
      candidateImageCount: assets.candidateImageCount,
      imageCount: result.imageCount,
      imageFallback: result.imageFallback,
      datasheetUsed: assets.datasheetUsed,
      warnings,
    },
  }
}

function toRefusal(event: H3Event, error: ProductCopyError) {
  const { retryAfterSeconds, providerDetail } = error
  if (retryAfterSeconds !== undefined) event.node.res.setHeader("retry-after", String(retryAfterSeconds))
  return createError({
    statusCode: error.statusCode,
    statusMessage: error.reason,
    data: {
      reason: error.reason,
      ...(retryAfterSeconds !== undefined && { retryAfterSeconds }),
      ...(providerDetail !== undefined && { providerDetail }),
    },
  })
}

export default defineEventHandler(async (event): Promise<ProductCopySuggestionResponse> => {
  const session = await ensureFreshSession(event)
  if (!session) throw createError({ statusCode: 401, statusMessage: "Authentication required" })

  const config = useRuntimeConfig()
  const requestId = crypto.randomUUID()
  const startedAt = Date.now()
  const trail: AuditTrail = { quota: "not_checked" }

  const audit = (outcome: ProductCopyAuditInput["outcome"]) => {
    try {
      writeProductCopyAudit({
        requestId,
        actorId: session.user.userId,
        model: config.aiProductCopyModel,
        startedAt,
        finishedAt: Date.now(),
        outcome,
        ...trail,
      })
    } catch {
      // The trail must never turn a finished request into a failed one.
    }
  }

  try {
    if (!session.user.roles.includes("direction")) throw new ProductCopyError("forbidden")

    const request = parseRequest(await readBody(event), configuredImageProfile(config.aiProductCopyDefaultImageProfile))
    trail.language = request.language
    trail.productId = request.productId ?? null
    assertCanGenerate(request, config)
    // Before the lease, so a refused draft never spends the operator's hourly allowance.
    const preloaded = await loadAssetsProvingContext(request, session, config)

    const lease = acquireLease(session.user.userId, config, trail)
    try {
      const response = await generate(request, session, config, trail, preloaded)
      audit("success")
      return { ...response, requestId }
    } finally {
      lease.release()
    }
  } catch (error) {
    logProductCopyFailure(requestId, session.user.userId, error)
    if (!(error instanceof ProductCopyError)) throw error
    if (trail.context && error.incompleteReason) trail.context.incompleteReason = error.incompleteReason
    audit(error.reason)
    throw toRefusal(event, error)
  }
})

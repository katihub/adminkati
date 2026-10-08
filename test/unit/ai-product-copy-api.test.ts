import type { ProductCopyDraft, ProductCopySuggestionRequest } from "../../app/types/ai/product-copy"
import type { ModelRequest, ModelResponse, ProductCopyModelClient } from "../../server/utils/ai/product-copy-service"
import type { H3Event } from "h3"
import { IncomingMessage, ServerResponse } from "node:http"
import { Socket } from "node:net"
import { createEvent, getResponseHeader } from "h3"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const boundary = vi.hoisted(() => ({ body: undefined as unknown }))

vi.mock("../../server/utils/api-session", () => ({ ensureFreshSession: vi.fn() }))
vi.mock("../../server/utils/ai/openai-client", () => ({ createOpenAiProductCopyClient: vi.fn() }))
vi.mock("../../server/utils/ai/product-context", () => ({ readPersistedProduct: vi.fn() }))
vi.mock("../../server/utils/ai/audit", () => ({ writeProductCopyAudit: vi.fn() }))
vi.mock("h3", async importOriginal => {
  const actual = await importOriginal<typeof import("h3")>()
  return { ...actual, readBody: vi.fn(async () => boundary.body) }
})

const START_TIME = new Date("2026-10-02T12:00:00.000Z")

const BASE_CONFIG = {
  apiBaseUrl: "https://backend.example",
  backendSharedSecret: "partage",
  openaiApiKey: "sk-test",
  aiProductCopyModel: "gpt-5-mini",
  aiProductCopyQuotaPerHour: 50,
  aiProductCopyTimeoutMs: 30_000,
  aiProductCopyPromptCharLimit: 30_000,
  aiProductCopyMaxOutputTokens: 6000,
  aiProductCopyReasoningEffort: "low",
  aiProductCopyDefaultImageProfile: "all-auto",
  aiProductCopyNameMaxOutputTokens: 6000,
  aiProductCopyShortDescriptionMaxOutputTokens: 6000,
  aiProductCopyLongDescriptionMaxOutputTokens: 6000,
  aiProductCopyFeaturesMaxOutputTokens: 6000,
  aiProductCopyInputUsdPerMillionTokens: 0.25,
  aiProductCopyOutputUsdPerMillionTokens: 2,
}

const DIRECTION_SESSION = { accessToken: "fresh-token", user: { userId: "u-1", roles: ["direction"] } }

const VALID_DRAFT: ProductCopyDraft = {
  name: "Onduleur APC Back-UPS BV1000I",
  brand: "APC",
  department: null,
  primaryCategory: "Onduleurs",
  secondaryCategories: [],
  price: 85_000,
  existingShortDescription: "Onduleur compact pour protéger les équipements sensibles.",
  existingLongDescription: "",
  existingFeatures: [],
}

const VALID_BODY: ProductCopySuggestionRequest = {
  language: "fr",
  fields: ["name", "shortDescription", "longDescription", "features"],
  imageProfile: "all-auto",
  draft: VALID_DRAFT,
}

const SUGGESTION_SHORT_DESCRIPTION = "Protection fiable pour vos equipements sensibles."

const SUCCESS_MODEL_RESPONSE: ModelResponse = {
  status: "completed",
  output_text: JSON.stringify({
    name: "Onduleur APC Back-UPS BV1000I 1000VA",
    shortDescription: SUGGESTION_SHORT_DESCRIPTION,
    longDescription: "Description longue et factuelle du produit, redigee a partir des informations fournies.",
    features: ["Autonomie prolongee", "Ecran LCD", "Logiciel de gestion inclus"],
  }),
  usage: { input_tokens: 1200, output_tokens: 800, total_tokens: 2000 },
}

function buildEvent(): H3Event {
  const req = new IncomingMessage(new Socket())
  req.url = "/api/ai/products/suggestions"
  req.method = "POST"
  req.headers = { "content-type": "application/json" }
  return createEvent(req, new ServerResponse(req))
}

function imagePartsOf(request: ModelRequest): Array<{ image_url: string }> {
  return request.input.flatMap(turn =>
    turn.content.filter(
      (part): part is { type: "input_image"; image_url: string; detail: "low" | "high" | "auto" } =>
        part.type === "input_image",
    ),
  )
}

async function freshHandler(configOverrides: Partial<typeof BASE_CONFIG> = {}) {
  vi.resetModules()
  vi.stubGlobal("useRuntimeConfig", () => ({ ...BASE_CONFIG, ...configOverrides }))

  const sessionModule = await import("../../server/utils/api-session")
  const openaiModule = await import("../../server/utils/ai/openai-client")
  const contextModule = await import("../../server/utils/ai/product-context")
  const auditModule = await import("../../server/utils/ai/audit")

  const ensureFreshSession = vi.mocked(sessionModule.ensureFreshSession)
  const createOpenAiProductCopyClient = vi.mocked(openaiModule.createOpenAiProductCopyClient)
  const readPersistedProduct = vi.mocked(contextModule.readPersistedProduct)
  const writeProductCopyAudit = vi.mocked(auditModule.writeProductCopyAudit)

  const fakeClient: ProductCopyModelClient = { create: vi.fn() }
  const create = vi.mocked(fakeClient.create)

  ensureFreshSession.mockResolvedValue(DIRECTION_SESSION as never)
  createOpenAiProductCopyClient.mockReturnValue(fakeClient)
  readPersistedProduct.mockResolvedValue({ kind: "unreadable" })
  writeProductCopyAudit.mockImplementation(() => {})
  create.mockResolvedValue(SUCCESS_MODEL_RESPONSE)

  const handlerModule = await import("../../server/api/ai/products/suggestions.post")

  return {
    handler: handlerModule.default as (event: H3Event) => Promise<{
      suggestion: unknown
      assets: { imageCount: number; datasheetUsed: boolean; warnings: string[] }
      requestId: string
    }>,
    ensureFreshSession,
    createOpenAiProductCopyClient,
    readPersistedProduct,
    writeProductCopyAudit,
    create,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(START_TIME)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("POST /api/ai/products/suggestions", () => {
  it("rejects a request with no fresh session", async () => {
    const mocks = await freshHandler()
    mocks.ensureFreshSession.mockResolvedValue(null)
    boundary.body = VALID_BODY

    await expect(mocks.handler(buildEvent())).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it("rejects a session without the direction role as forbidden, auditing it without the draft text", async () => {
    const mocks = await freshHandler()
    mocks.ensureFreshSession.mockResolvedValue({
      accessToken: "fresh-token",
      user: { userId: "u-99", roles: ["comptoir"] },
    } as never)
    boundary.body = VALID_BODY

    await expect(mocks.handler(buildEvent())).rejects.toMatchObject({ statusCode: 403, data: { reason: "forbidden" } })
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.readPersistedProduct).not.toHaveBeenCalled()

    expect(mocks.writeProductCopyAudit).toHaveBeenCalledTimes(1)
    const auditArg = mocks.writeProductCopyAudit.mock.calls[0]![0]
    expect(auditArg.outcome).toBe("forbidden")
    expect(auditArg.actorId).toBe("u-99")
    const serialized = JSON.stringify(auditArg)
    expect(serialized).not.toContain(VALID_DRAFT.name)
    expect(serialized).not.toContain(VALID_DRAFT.brand)
  })

  describe("request validation", () => {
    it("rejects an unknown top-level field such as a browser-supplied image list", async () => {
      const mocks = await freshHandler()
      boundary.body = { ...VALID_BODY, images: ["https://evil.example/x.jpg"] }

      await expect(mocks.handler(buildEvent())).rejects.toMatchObject({
        statusCode: 400,
        data: { reason: "invalid_request" },
      })
      expect(mocks.create).not.toHaveBeenCalled()
    })
  })

  describe("context sufficiency", () => {
    it("rejects a new-product draft that has only a name and no other signal", async () => {
      const mocks = await freshHandler()
      boundary.body = {
        language: "fr",
        draft: {
          name: "Produit sans contexte",
          brand: null,
          department: null,
          primaryCategory: null,
          secondaryCategories: [],
          price: null,
          existingShortDescription: "",
          existingLongDescription: "",
          existingFeatures: [],
        },
      }

      await expect(mocks.handler(buildEvent())).rejects.toMatchObject({
        statusCode: 422,
        data: { reason: "insufficient_context" },
      })
      expect(mocks.create).not.toHaveBeenCalled()
    })

    it("rejects a draft whose name is shorter than three characters even with other signals present", async () => {
      const mocks = await freshHandler()
      boundary.body = { ...VALID_BODY, draft: { ...VALID_DRAFT, name: "Ab" } }

      await expect(mocks.handler(buildEvent())).rejects.toMatchObject({
        statusCode: 422,
        data: { reason: "insufficient_context" },
      })
      expect(mocks.create).not.toHaveBeenCalled()
    })
  })

  it("rejects a draft whose text exceeds the configured prompt character limit", async () => {
    const mocks = await freshHandler({ aiProductCopyPromptCharLimit: 100 })
    boundary.body = { ...VALID_BODY, draft: { ...VALID_DRAFT, existingLongDescription: "x".repeat(200) } }

    await expect(mocks.handler(buildEvent())).rejects.toMatchObject({
      statusCode: 422,
      data: { reason: "prompt_too_large" },
    })
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it("generates a package for a new product, sending the draft facts to the model but never to the response identifiers", async () => {
    const mocks = await freshHandler()
    boundary.body = VALID_BODY

    const result = await mocks.handler(buildEvent())

    expect(mocks.readPersistedProduct).not.toHaveBeenCalled()
    expect(mocks.create).toHaveBeenCalledTimes(1)

    const [request, options] = mocks.create.mock.calls[0]!
    expect(request.model).toBe("gpt-5-mini")
    expect(options.timeoutMs).toBe(30_000)
    expect(imagePartsOf(request)).toHaveLength(0)
    const promptText = JSON.stringify(request)
    expect(promptText).toContain(VALID_DRAFT.name)
    expect(promptText).toContain("APC")

    expect(result.assets).toEqual({
      imageProfile: "all-auto",
      candidateImageCount: 0,
      imageCount: 0,
      imageFallback: false,
      datasheetUsed: false,
      warnings: [],
    })
    expect(typeof result.requestId).toBe("string")
    expect(result.requestId.length).toBeGreaterThan(0)
    expect(result.requestId).not.toContain("u-1")
    expect(result.requestId).not.toContain(VALID_DRAFT.name)
    expect(result.requestId).not.toContain("APC")

    expect(mocks.writeProductCopyAudit).toHaveBeenCalledTimes(1)
    const auditArg = mocks.writeProductCopyAudit.mock.calls[0]![0]
    expect(auditArg.outcome).toBe("success")
    expect(auditArg.actorId).toBe("u-1")
    expect(auditArg.model).toBe("gpt-5-mini")
    expect(auditArg.language).toBe("fr")
    expect(auditArg.productId ?? null).toBeNull()
    expect(auditArg.quota).toBe("allowed")
    expect(auditArg.usage).toEqual({
      inputTokens: 1200,
      cachedInputTokens: null,
      outputTokens: 800,
      reasoningTokens: null,
      totalTokens: 2000,
    })
    expect(auditArg.estimatedCostUsd).toBeCloseTo(0.0019, 6)
    expect(auditArg.requestId).toBe(result.requestId)

    const serializedAudit = JSON.stringify(auditArg)
    expect(serializedAudit).not.toContain(VALID_DRAFT.name)
    expect(serializedAudit).not.toContain(VALID_DRAFT.brand)
    expect(serializedAudit).not.toContain(SUGGESTION_SHORT_DESCRIPTION)
    expect(serializedAudit).not.toContain("sk-test")
  })

  it("passes the operator's selected output scope to the provider in one request", async () => {
    const mocks = await freshHandler()
    mocks.create.mockResolvedValue({
      ...SUCCESS_MODEL_RESPONSE,
      output_text: JSON.stringify({ shortDescription: SUGGESTION_SHORT_DESCRIPTION }),
    })
    boundary.body = { ...VALID_BODY, fields: ["shortDescription"] }

    await mocks.handler(buildEvent())

    expect(mocks.create).toHaveBeenCalledTimes(1)
    const [request] = mocks.create.mock.calls[0]! as [ModelRequest, { timeoutMs: number }]
    const schema = request.text.format.schema as { required: string[]; properties: Record<string, unknown> }
    expect(schema.required).toEqual(["shortDescription"])
    expect(Object.keys(schema.properties)).toEqual(["shortDescription"])
  })

  it("uses the configured image profile when an older client omits that optional preference", async () => {
    const mocks = await freshHandler({ aiProductCopyDefaultImageProfile: "primary-auto" })
    const { imageProfile: _imageProfile, ...legacyBody } = VALID_BODY
    boundary.body = legacyBody

    await expect(mocks.handler(buildEvent())).resolves.toMatchObject({ assets: { imageProfile: "primary-auto" } })
  })

  describe("existing product assets", () => {
    it("reads persisted images ordered by rang, drops an unsafe host, and reports the matching warnings", async () => {
      const mocks = await freshHandler()
      mocks.readPersistedProduct.mockResolvedValue({
        kind: "found",
        product: {
          images: [
            { rang: 2, url: "https://cdn.example.com/b.jpg" },
            { rang: 1, url: "https://cdn.example.com/a.jpg" },
            { rang: 3, url: "http://10.0.0.5/x.jpg" },
          ],
          fiche_pdf: "produits/abc.pdf",
        },
      })
      boundary.body = { ...VALID_BODY, productId: 42 }

      const result = await mocks.handler(buildEvent())

      expect(mocks.readPersistedProduct).toHaveBeenCalledWith(
        42,
        "fresh-token",
        expect.objectContaining({ apiBaseUrl: "https://backend.example", sharedSecret: "partage" }),
      )

      const [request] = mocks.create.mock.calls[0]!
      expect(imagePartsOf(request).map(part => part.image_url)).toEqual([
        "https://cdn.example.com/a.jpg",
        "https://cdn.example.com/b.jpg",
      ])
      expect(result.assets.imageCount).toBe(2)
      expect(result.assets.warnings).toContain("image_unavailable")
      expect(result.assets.warnings).toContain("datasheet_unavailable")
      expect(result.assets.datasheetUsed).toBe(false)
    })

    it("rejects a browser-supplied draft.images field before any persisted-asset lookup", async () => {
      const mocks = await freshHandler()
      boundary.body = {
        ...VALID_BODY,
        productId: 42,
        draft: { ...VALID_DRAFT, images: ["https://cdn.example.com/z.jpg"] },
      }

      await expect(mocks.handler(buildEvent())).rejects.toMatchObject({
        statusCode: 400,
        data: { reason: "invalid_request" },
      })
      expect(mocks.readPersistedProduct).not.toHaveBeenCalled()
      expect(mocks.create).not.toHaveBeenCalled()
    })

    it("maps a denied persisted-product read to forbidden without a model call", async () => {
      const mocks = await freshHandler()
      mocks.readPersistedProduct.mockResolvedValue({ kind: "denied" })
      boundary.body = { ...VALID_BODY, productId: 42 }

      await expect(mocks.handler(buildEvent())).rejects.toMatchObject({
        statusCode: 403,
        data: { reason: "forbidden" },
      })
      expect(mocks.create).not.toHaveBeenCalled()
    })

    it("falls back to text-only generation with both warnings when the persisted product is unreadable", async () => {
      const mocks = await freshHandler()
      mocks.readPersistedProduct.mockResolvedValue({ kind: "unreadable" })
      boundary.body = { ...VALID_BODY, productId: 42 }

      const result = await mocks.handler(buildEvent())

      expect(mocks.create).toHaveBeenCalledTimes(1)
      expect(result.assets.warnings).toEqual(["image_unavailable", "datasheet_unavailable"])
      expect(result.assets.imageCount).toBe(0)
    })
  })

  describe("per-user hourly quota", () => {
    it("rejects the third request within the hour with quota_exceeded and a matching retry-after header", async () => {
      const mocks = await freshHandler({ aiProductCopyQuotaPerHour: 2 })
      boundary.body = VALID_BODY

      await mocks.handler(buildEvent())
      await mocks.handler(buildEvent())

      const thirdEvent = buildEvent()
      let caught: { statusCode?: number; data?: { reason?: string; retryAfterSeconds?: number } } | undefined
      try {
        await mocks.handler(thirdEvent)
      } catch (error) {
        caught = error as typeof caught
      }

      expect(caught?.statusCode).toBe(429)
      expect(caught?.data?.reason).toBe("quota_exceeded")
      const retryAfterSeconds = caught?.data?.retryAfterSeconds
      expect(Number.isInteger(retryAfterSeconds)).toBe(true)
      expect(retryAfterSeconds).toBeGreaterThan(0)
      expect(getResponseHeader(thirdEvent, "retry-after")).toBe(String(retryAfterSeconds))
      expect(mocks.create).toHaveBeenCalledTimes(2)
    })

    it("still allows a different user once the first user's quota is exhausted", async () => {
      const mocks = await freshHandler({ aiProductCopyQuotaPerHour: 2 })
      boundary.body = VALID_BODY

      await mocks.handler(buildEvent())
      await mocks.handler(buildEvent())
      await expect(mocks.handler(buildEvent())).rejects.toMatchObject({ statusCode: 429 })

      mocks.ensureFreshSession.mockResolvedValue({
        accessToken: "fresh-token",
        user: { userId: "u-2", roles: ["direction"] },
      } as never)
      await expect(mocks.handler(buildEvent())).resolves.toMatchObject({ assets: { imageCount: 0 } })
    })

    it("allows the first user again once the quota window has elapsed", async () => {
      const mocks = await freshHandler({ aiProductCopyQuotaPerHour: 2 })
      boundary.body = VALID_BODY

      await mocks.handler(buildEvent())
      await mocks.handler(buildEvent())
      await expect(mocks.handler(buildEvent())).rejects.toMatchObject({ statusCode: 429 })

      vi.setSystemTime(new Date(START_TIME.getTime() + 61 * 60 * 1000))
      await expect(mocks.handler(buildEvent())).resolves.toMatchObject({ assets: { imageCount: 0 } })
    })
  })

  describe("concurrent duplicate requests from one user", () => {
    it("rejects a second in-flight request as busy without counting it against quota, then succeeds once the first completes", async () => {
      const mocks = await freshHandler()
      let resolveCreate!: (value: ModelResponse) => void
      mocks.create.mockImplementationOnce(
        () =>
          new Promise<ModelResponse>(resolve => {
            resolveCreate = resolve
          }),
      )

      boundary.body = VALID_BODY
      const firstPromise = mocks.handler(buildEvent())

      boundary.body = VALID_BODY
      await expect(mocks.handler(buildEvent())).rejects.toMatchObject({ statusCode: 409, data: { reason: "busy" } })
      expect(mocks.create).toHaveBeenCalledTimes(1)

      resolveCreate(SUCCESS_MODEL_RESPONSE)
      await expect(firstPromise).resolves.toMatchObject({ assets: { imageCount: 0 } })

      boundary.body = VALID_BODY
      await expect(mocks.handler(buildEvent())).resolves.toMatchObject({ assets: { imageCount: 0 } })
    })

    it("releases the in-flight lock after a provider failure so a later request is not busy", async () => {
      const mocks = await freshHandler()
      mocks.create.mockRejectedValueOnce({ status: 500, message: "secret upstream body" })
      boundary.body = VALID_BODY

      await expect(mocks.handler(buildEvent())).rejects.toMatchObject({ statusCode: 502 })

      boundary.body = VALID_BODY
      await expect(mocks.handler(buildEvent())).resolves.toMatchObject({ assets: { imageCount: 0 } })
    })
  })

  describe("provider failures never leak upstream details", () => {
    it("maps a provider error to provider_unavailable", async () => {
      const mocks = await freshHandler()
      mocks.create.mockRejectedValue({ status: 500, message: "secret upstream body" })
      boundary.body = VALID_BODY

      let caught: unknown
      try {
        await mocks.handler(buildEvent())
      } catch (error) {
        caught = error
      }

      expect(caught).toMatchObject({ statusCode: 502, data: { reason: "provider_unavailable" } })
      expect(JSON.stringify(caught)).not.toContain("secret upstream body")
      expect(mocks.writeProductCopyAudit).toHaveBeenCalledTimes(1)
      const auditArg = mocks.writeProductCopyAudit.mock.calls[0]![0]
      expect(auditArg.outcome).toBe("provider_unavailable")
      expect(JSON.stringify(auditArg)).not.toContain("secret upstream body")
    })

    it("maps a connection-timeout error to provider_timeout", async () => {
      const mocks = await freshHandler()
      const timeoutError = new Error("secret upstream body")
      timeoutError.name = "APIConnectionTimeoutError"
      mocks.create.mockRejectedValue(timeoutError)
      boundary.body = VALID_BODY

      let caught: unknown
      try {
        await mocks.handler(buildEvent())
      } catch (error) {
        caught = error
      }

      expect(caught).toMatchObject({ statusCode: 503, data: { reason: "provider_timeout" } })
      expect(JSON.stringify(caught)).not.toContain("secret upstream body")
      const auditArg = mocks.writeProductCopyAudit.mock.calls[0]![0]
      expect(auditArg.outcome).toBe("provider_timeout")
    })

    it("maps non-JSON model output to invalid_model_output", async () => {
      const mocks = await freshHandler()
      mocks.create.mockResolvedValue({
        status: "completed",
        output_text: "not json {{{",
        usage: { input_tokens: 10, output_tokens: 10, total_tokens: 20 },
      })
      boundary.body = VALID_BODY

      await expect(mocks.handler(buildEvent())).rejects.toMatchObject({
        statusCode: 422,
        data: { reason: "invalid_model_output" },
      })
      const auditArg = mocks.writeProductCopyAudit.mock.calls[0]![0]
      expect(auditArg.outcome).toBe("invalid_model_output")
      expect(JSON.stringify(auditArg)).not.toContain("not json")
    })

    it("records a recognised incomplete reason as safe telemetry without exposing model output", async () => {
      const mocks = await freshHandler()
      mocks.create.mockResolvedValue({
        status: "incomplete",
        incomplete_details: { reason: "max_output_tokens" },
      })
      boundary.body = VALID_BODY

      await expect(mocks.handler(buildEvent())).rejects.toMatchObject({
        statusCode: 422,
        data: { reason: "invalid_model_output" },
      })

      const auditArg = mocks.writeProductCopyAudit.mock.calls[0]![0]
      expect(auditArg.context).toMatchObject({ incompleteReason: "max_output_tokens" })
      expect(JSON.stringify(auditArg)).not.toContain("incomplete_details")
    })

    it("maps a refusal reply to provider_refused", async () => {
      const mocks = await freshHandler()
      mocks.create.mockResolvedValue({
        status: "completed",
        output: [{ type: "message", content: [{ type: "refusal", refusal: "secret upstream body" }] }],
        usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
      })
      boundary.body = VALID_BODY

      let caught: unknown
      try {
        await mocks.handler(buildEvent())
      } catch (error) {
        caught = error
      }

      expect(caught).toMatchObject({ statusCode: 422, data: { reason: "provider_refused" } })
      expect(JSON.stringify(caught)).not.toContain("secret upstream body")
      const auditArg = mocks.writeProductCopyAudit.mock.calls[0]![0]
      expect(auditArg.outcome).toBe("provider_refused")
      expect(JSON.stringify(auditArg)).not.toContain("secret upstream body")
    })
  })

  it("fails with provider_unavailable when no OpenAI key is configured, without calling the model client", async () => {
    const mocks = await freshHandler({ openaiApiKey: "" })
    boundary.body = VALID_BODY

    await expect(mocks.handler(buildEvent())).rejects.toMatchObject({
      statusCode: 502,
      data: { reason: "provider_unavailable" },
    })
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it("still returns a successful response when the audit writer throws", async () => {
    const mocks = await freshHandler()
    mocks.writeProductCopyAudit.mockImplementation(() => {
      throw new Error("audit sink down")
    })
    boundary.body = VALID_BODY

    await expect(mocks.handler(buildEvent())).resolves.toMatchObject({ assets: { imageCount: 0 } })
  })
})

import type {
  ProductCopyAuditInput,
  ProductCopyAuditRecord,
  ProductCopyOutcomeAuditRecord,
} from "../../server/utils/ai/audit"
import { describe, expect, it, vi } from "vitest"
import { writeProductCopyAudit, writeProductCopyOutcomeAudit } from "../../server/utils/ai/audit"

const APPROVED_KEYS = [
  "actorId",
  "assets",
  "context",
  "estimatedCostUsd",
  "event",
  "finishedAt",
  "language",
  "latencyMs",
  "model",
  "outcome",
  "productId",
  "quota",
  "requestId",
  "startedAt",
  "usage",
].sort()

describe("writeProductCopyAudit", () => {
  it("builds a success record with every field at its exact literal value", () => {
    const input: ProductCopyAuditInput = {
      requestId: "req-1",
      actorId: "user-1",
      productId: 42,
      language: "fr",
      model: "gpt-5-mini",
      startedAt: 1_760_000_000_000,
      finishedAt: 1_760_000_001_500,
      outcome: "success",
      quota: "allowed",
      usage: { inputTokens: 100, cachedInputTokens: null, outputTokens: 50, reasoningTokens: null, totalTokens: 150 },
      estimatedCostUsd: 0.0032,
      assets: { imageCount: 2, datasheetUsed: true },
      context: null,
    }

    let record: ProductCopyAuditRecord | undefined
    writeProductCopyAudit(input, r => (record = r))

    expect(record).toEqual({
      event: "ai.product_copy",
      requestId: "req-1",
      actorId: "user-1",
      productId: 42,
      language: "fr",
      model: "gpt-5-mini",
      startedAt: "2025-10-09T08:53:20.000Z",
      finishedAt: "2025-10-09T08:53:21.500Z",
      latencyMs: 1_500,
      outcome: "success",
      quota: "allowed",
      usage: { inputTokens: 100, cachedInputTokens: null, outputTokens: 50, reasoningTokens: null, totalTokens: 150 },
      estimatedCostUsd: 0.0032,
      assets: { imageCount: 2, datasheetUsed: true },
      context: null,
    })
  })

  it("keeps derived token and request-shape telemetry while excluding prompt content", () => {
    const input = {
      requestId: "req-telemetry",
      actorId: "user-telemetry",
      productId: 42,
      language: "en",
      model: "gpt-test",
      startedAt: 1_760_000_000_000,
      finishedAt: 1_760_000_001_000,
      outcome: "success",
      quota: "allowed",
      usage: {
        inputTokens: 400,
        cachedInputTokens: 120,
        outputTokens: 80,
        reasoningTokens: 16,
        totalTokens: 480,
      },
      context: {
        promptVersion: "product-copy-v2",
        draftTextChars: 360,
        nonEmptyFactCount: 4,
        fields: ["shortDescription"],
        imageProfile: "primary-auto",
        candidateImageCount: 3,
        imageCount: 1,
        imageFallback: false,
        incompleteReason: null,
      },
      prompt: "MARKER_PROMPT",
      imageUrl: "MARKER_IMAGE_URL",
      suggestion: "MARKER_SUGGESTION",
    } as ProductCopyAuditInput

    let record: ProductCopyAuditRecord | undefined
    writeProductCopyAudit(input, value => (record = value))

    expect(record).toMatchObject({
      usage: {
        inputTokens: 400,
        cachedInputTokens: 120,
        outputTokens: 80,
        reasoningTokens: 16,
        totalTokens: 480,
      },
      context: {
        promptVersion: "product-copy-v2",
        draftTextChars: 360,
        nonEmptyFactCount: 4,
        fields: ["shortDescription"],
        imageProfile: "primary-auto",
        candidateImageCount: 3,
        imageCount: 1,
        imageFallback: false,
        incompleteReason: null,
      },
    })
    const serialized = JSON.stringify(record)
    expect(serialized).not.toContain("MARKER_PROMPT")
    expect(serialized).not.toContain("MARKER_IMAGE_URL")
    expect(serialized).not.toContain("MARKER_SUGGESTION")
  })

  it("defaults productId, language, usage, estimatedCostUsd and assets to null for a failure record", () => {
    const input: ProductCopyAuditInput = {
      requestId: "req-2",
      actorId: "user-2",
      model: "gpt-5-mini",
      startedAt: 1_760_000_005_000,
      finishedAt: 1_760_000_005_900,
      outcome: "quota_exceeded",
      quota: "quota_exceeded",
    }

    let record: ProductCopyAuditRecord | undefined
    writeProductCopyAudit(input, r => (record = r))

    expect(record?.productId).toBeNull()
    expect(record?.language).toBeNull()
    expect(record?.usage).toBeNull()
    expect(record?.estimatedCostUsd).toBeNull()
    expect(record?.assets).toBeNull()
    expect(record?.outcome).toBe("quota_exceeded")
    expect(record?.quota).toBe("quota_exceeded")
  })

  it("floors latencyMs at zero when the finish timestamp precedes the start timestamp (clock skew)", () => {
    const input: ProductCopyAuditInput = {
      requestId: "req-3",
      actorId: "user-3",
      model: "gpt-5-mini",
      startedAt: 1_760_000_005_000,
      finishedAt: 1_760_000_003_000,
      outcome: "success",
      quota: "allowed",
    }

    let record: ProductCopyAuditRecord | undefined
    writeProductCopyAudit(input, r => (record = r))

    expect(record?.latencyMs).toBe(0)
  })

  it("builds the record only from the approved fields, dropping any extra properties on a polluted input", () => {
    const markers = {
      prompt: "MARKER_PROMPT",
      draft: "MARKER_DRAFT",
      suggestion: "MARKER_SUGGESTION",
      generatedText: "MARKER_GENERATED_TEXT",
      imageUrl: "MARKER_IMAGE_URL",
      url_source: "MARKER_URL_SOURCE",
      providerError: "MARKER_PROVIDER_ERROR",
      accessToken: "MARKER_ACCESS_TOKEN",
      error: new Error("sk-live-SECRET provider body"),
    }

    const pollutedInput = {
      requestId: "req-4",
      actorId: "user-4",
      model: "gpt-5-mini",
      startedAt: 1_760_000_000_000,
      finishedAt: 1_760_000_001_000,
      outcome: "success",
      quota: "allowed",
      ...markers,
    } as never

    let record: ProductCopyAuditRecord | undefined
    writeProductCopyAudit(pollutedInput, r => (record = r))

    expect(record).toBeDefined()
    expect(Object.keys(record ?? {}).sort()).toEqual(APPROVED_KEYS)

    const serialised = JSON.stringify(record)
    expect(serialised).not.toContain("MARKER_PROMPT")
    expect(serialised).not.toContain("MARKER_DRAFT")
    expect(serialised).not.toContain("MARKER_SUGGESTION")
    expect(serialised).not.toContain("MARKER_GENERATED_TEXT")
    expect(serialised).not.toContain("MARKER_IMAGE_URL")
    expect(serialised).not.toContain("MARKER_URL_SOURCE")
    expect(serialised).not.toContain("MARKER_PROVIDER_ERROR")
    expect(serialised).not.toContain("MARKER_ACCESS_TOKEN")
    expect(serialised).not.toContain("sk-live-SECRET")
  })

  it("does not throw when the sink throws, and does not hand the sink's error message to console.error", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const input: ProductCopyAuditInput = {
      requestId: "req-5",
      actorId: "user-5",
      model: "gpt-5-mini",
      startedAt: 1_760_000_000_000,
      finishedAt: 1_760_000_001_000,
      outcome: "success",
      quota: "allowed",
    }

    expect(() =>
      writeProductCopyAudit(input, () => {
        throw new Error("sink is unavailable right now")
      }),
    ).not.toThrow()

    expect(consoleError).toHaveBeenCalled()
    const loggedText = consoleError.mock.calls.map(call => call.join(" ")).join(" ")
    expect(loggedText).not.toContain("sink is unavailable right now")

    consoleError.mockRestore()
  })

  it("writes exactly one console.info call with a JSON string of the record when no sink is given", () => {
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => undefined)
    const input: ProductCopyAuditInput = {
      requestId: "req-6",
      actorId: "user-6",
      model: "gpt-5-mini",
      startedAt: 1_760_000_000_000,
      finishedAt: 1_760_000_001_000,
      outcome: "success",
      quota: "allowed",
    }

    writeProductCopyAudit(input)

    expect(consoleInfo).toHaveBeenCalledTimes(1)
    const [loggedArg] = consoleInfo.mock.calls[0] ?? []
    expect(typeof loggedArg).toBe("string")

    const parsed = JSON.parse(loggedArg as string)
    expect(parsed.requestId).toBe("req-6")
    expect(parsed.event).toBe("ai.product_copy")
    expect(Object.keys(parsed).sort()).toEqual(APPROVED_KEYS)

    consoleInfo.mockRestore()
  })
})

describe("writeProductCopyOutcomeAudit", () => {
  it("writes only its approved decision metadata when passed a polluted object", () => {
    const input = {
      actorId: "user-1",
      requestId: "6ed7502b-5216-4e19-b4f2-d7e37d673f9f",
      field: "shortDescription",
      action: "applied",
      occurredAt: 1_760_000_000_000,
      prompt: "MARKER_PROMPT",
      suggestion: "MARKER_SUGGESTION",
      imageUrl: "MARKER_IMAGE_URL",
      usage: "MARKER_TOKEN",
      providerError: "MARKER_PROVIDER_ERROR",
    } as never
    let record: ProductCopyOutcomeAuditRecord | undefined

    writeProductCopyOutcomeAudit(input, value => (record = value))

    expect(record).toEqual({
      event: "ai.product_copy_outcome",
      actorId: "user-1",
      requestId: "6ed7502b-5216-4e19-b4f2-d7e37d673f9f",
      field: "shortDescription",
      action: "applied",
      occurredAt: "2025-10-09T08:53:20.000Z",
    })
    const serialised = JSON.stringify(record)
    for (const marker of [
      "MARKER_PROMPT",
      "MARKER_SUGGESTION",
      "MARKER_IMAGE_URL",
      "MARKER_TOKEN",
      "MARKER_PROVIDER_ERROR",
    ]) {
      expect(serialised).not.toContain(marker)
    }
  })
})

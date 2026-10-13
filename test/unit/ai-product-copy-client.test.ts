import type { ProductCopyDraftSource, ProductCopyErrorReason } from "../../app/types/ai/product-copy"
import { describe, expect, it } from "vitest"
import { buildProductCopyDraft, toProductCopyFailure } from "../../app/utils/ai-product-copy"

const baseSource = (overrides: Partial<ProductCopyDraftSource> = {}): ProductCopyDraftSource => ({
  name: "Router X200",
  brand: "Netgear",
  department: "Networking",
  primaryCategory: "Routers",
  secondaryCategories: [],
  price: null,
  shortDescription: "Fast.",
  longDescription: "Full.",
  features: [],
  ...overrides,
})

describe("buildProductCopyDraft", () => {
  it("trims, renames, and normalises a full worked example into exactly the request draft shape", () => {
    const source: ProductCopyDraftSource = {
      name: "  Router X200  ",
      brand: "  Netgear  ",
      department: "  Networking  ",
      primaryCategory: "  Routers  ",
      secondaryCategories: ["  Wifi  ", "mesh", "WIFI", " ", "Mesh"],
      price: 199.6,
      shortDescription: "  Fast and reliable.  ",
      longDescription: "  A full description.  ",
      features: ["  Dual band  ", "dual band", "", "4K streaming", "Dual Band"],
    }

    expect(buildProductCopyDraft(source)).toStrictEqual({
      name: "Router X200",
      brand: "Netgear",
      department: "Networking",
      primaryCategory: "Routers",
      secondaryCategories: ["Wifi", "mesh"],
      price: 200,
      existingShortDescription: "Fast and reliable.",
      existingLongDescription: "A full description.",
      existingFeatures: ["Dual band", "4K streaming"],
    })
  })

  it("turns blank or whitespace-only brand, department, and primaryCategory into null", () => {
    const draft = buildProductCopyDraft(baseSource({ brand: "   ", department: "", primaryCategory: "\t" }))

    expect(draft.brand).toBeNull()
    expect(draft.department).toBeNull()
    expect(draft.primaryCategory).toBeNull()
  })

  it("caps secondaryCategories at 20 entries, dropping the extras from the end", () => {
    const categories = Array.from({ length: 25 }, (_, i) => `Cat${i + 1}`)

    const draft = buildProductCopyDraft(baseSource({ secondaryCategories: categories }))

    expect(draft.secondaryCategories).toHaveLength(20)
    expect(draft.secondaryCategories).toEqual(categories.slice(0, 20))
  })

  it("caps existingFeatures at 12 entries, dropping the extras from the end", () => {
    const features = Array.from({ length: 15 }, (_, i) => `Feature${i + 1}`)

    const draft = buildProductCopyDraft(baseSource({ features }))

    expect(draft.existingFeatures).toHaveLength(12)
    expect(draft.existingFeatures).toEqual(features.slice(0, 12))
  })

  it("rounds a fractional price to the nearest integer", () => {
    expect(buildProductCopyDraft(baseSource({ price: 10.4 })).price).toBe(10)
    expect(buildProductCopyDraft(baseSource({ price: 10.6 })).price).toBe(11)
  })

  it("keeps zero and the exact upper bound as valid prices", () => {
    expect(buildProductCopyDraft(baseSource({ price: 0 })).price).toBe(0)
    expect(buildProductCopyDraft(baseSource({ price: 1_000_000_000 })).price).toBe(1_000_000_000)
  })

  it("rejects a negative, non-finite, or out-of-range price as null", () => {
    expect(buildProductCopyDraft(baseSource({ price: -5 })).price).toBeNull()
    expect(buildProductCopyDraft(baseSource({ price: Number.NaN })).price).toBeNull()
    expect(buildProductCopyDraft(baseSource({ price: Number.POSITIVE_INFINITY })).price).toBeNull()
    expect(buildProductCopyDraft(baseSource({ price: 1_000_000_001 })).price).toBeNull()
  })

  it("does not mutate the source's input arrays", () => {
    const secondaryCategories = ["Wifi", "wifi"]
    const features = ["Dual band", "dual band"]
    const source = baseSource({ secondaryCategories, features })

    buildProductCopyDraft(source)

    expect(secondaryCategories).toEqual(["Wifi", "wifi"])
    expect(features).toEqual(["Dual band", "dual band"])
  })
})

const knownReasons: ProductCopyErrorReason[] = [
  "forbidden",
  "invalid_request",
  "insufficient_context",
  "prompt_too_large",
  "busy",
  "provider_unavailable",
  "provider_timeout",
  "provider_refused",
  "invalid_model_output",
]

describe("toProductCopyFailure", () => {
  it.each(knownReasons)("returns a known reason (%s) as-is, with no retryAfterSeconds", reason => {
    const error = { statusCode: 422, data: { statusCode: 422, message: "nope", data: { reason } } }

    expect(toProductCopyFailure(error)).toEqual({ reason, retryAfterSeconds: null })
  })

  it("also accepts the un-nested data.reason form", () => {
    const error = { statusCode: 409, data: { reason: "busy" } }

    expect(toProductCopyFailure(error)).toEqual({ reason: "busy", retryAfterSeconds: null })
  })

  it("maps an unrecognised reason string to unknown without echoing it", () => {
    const error = { statusCode: 400, data: { data: { reason: "something_new" } } }

    expect(toProductCopyFailure(error)).toEqual({ reason: "unknown", retryAfterSeconds: null, detail: "HTTP 400" })
    expect(JSON.stringify(toProductCopyFailure(error))).not.toContain("something_new")
  })

  it("reads quota_exceeded's retryAfterSeconds from the payload, rounded up to a whole second", () => {
    const error = { statusCode: 429, data: { data: { reason: "quota_exceeded", retryAfterSeconds: 1799.2 } } }

    expect(toProductCopyFailure(error)).toEqual({ reason: "quota_exceeded", retryAfterSeconds: 1800 })
  })

  it("ignores a non-positive or non-finite payload retryAfterSeconds for quota_exceeded", () => {
    expect(
      toProductCopyFailure({ statusCode: 429, data: { data: { reason: "quota_exceeded", retryAfterSeconds: 0 } } }),
    ).toEqual({ reason: "quota_exceeded", retryAfterSeconds: null })
    expect(
      toProductCopyFailure({ statusCode: 429, data: { data: { reason: "quota_exceeded", retryAfterSeconds: -5 } } }),
    ).toEqual({ reason: "quota_exceeded", retryAfterSeconds: null })
    expect(
      toProductCopyFailure({
        statusCode: 429,
        data: { data: { reason: "quota_exceeded", retryAfterSeconds: Number.POSITIVE_INFINITY } },
      }),
    ).toEqual({ reason: "quota_exceeded", retryAfterSeconds: null })
  })

  it("never honours retryAfterSeconds for a reason other than quota_exceeded", () => {
    const error = { statusCode: 409, data: { data: { reason: "busy", retryAfterSeconds: 1800 } } }

    expect(toProductCopyFailure(error)).toEqual({ reason: "busy", retryAfterSeconds: null })
  })

  it("falls back to a Headers retry-after response header for quota_exceeded when the payload lacks one", () => {
    const error = {
      statusCode: 429,
      data: { data: { reason: "quota_exceeded" } },
      response: { headers: new Headers({ "retry-after": "90" }) },
    }

    expect(toProductCopyFailure(error)).toEqual({ reason: "quota_exceeded", retryAfterSeconds: 90 })
  })

  it.each([
    ["a TypeError with no response", new TypeError("Failed to fetch")],
    ["an empty object", {}],
    ["null", null],
    ["undefined", undefined],
    ["a plain string", "network down"],
  ])("maps %s to unreachable", (_label, error) => {
    expect(toProductCopyFailure(error)).toEqual({ reason: "unreachable", retryAfterSeconds: null })
  })

  it("maps a readable statusCode with no usable reason to unknown, not unreachable", () => {
    expect(toProductCopyFailure({ statusCode: 500 })).toEqual({
      reason: "unknown",
      retryAfterSeconds: null,
      detail: "HTTP 500",
    })
  })

  it("never throws and never carries the server message through", () => {
    const error = { statusCode: 500, message: "Internal crash at line 42", data: { data: { reason: "busy" } } }

    const result = toProductCopyFailure(error)

    expect(() => toProductCopyFailure(error)).not.toThrow()
    expect(Object.keys(result).sort()).toEqual(["reason", "retryAfterSeconds"])
    expect(result).not.toHaveProperty("message")
  })
})

import type {
  ProductCopyFailure,
  ProductCopySuggestionResponse,
  ProductCopyTarget,
} from "../../app/types/ai/product-copy"
import { createPinia, setActivePinia } from "pinia"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useAiGenerationStore } from "../../app/stores/ai-generation"

const productTarget: ProductCopyTarget = { kind: "product", id: 42 }
const newTarget: ProductCopyTarget = { kind: "new", token: "draft-1" }

const response = (overrides: Partial<ProductCopySuggestionResponse> = {}): ProductCopySuggestionResponse => ({
  suggestion: {
    name: "Router X200",
    shortDescription: "Fast and reliable.",
    longDescription: "A full description.",
    features: ["Dual band", "4K streaming"],
  },
  assets: {
    imageProfile: "all-auto",
    candidateImageCount: 2,
    imageCount: 2,
    imageFallback: false,
    datasheetUsed: false,
    warnings: [],
  },
  requestId: "req-1",
  ...overrides,
})

const failure = (overrides: Partial<ProductCopyFailure> = {}): ProductCopyFailure => ({
  reason: "busy",
  retryAfterSeconds: null,
  ...overrides,
})

describe("useAiGenerationStore", () => {
  beforeEach(() => setActivePinia(createPinia()))

  it("begin starts a loading run and returns a run id, without opening the panel", () => {
    const store = useAiGenerationStore()

    const run = store.begin(productTarget, "fr", vi.fn())

    expect(typeof run).toBe("number")
    expect(store.status).toBe("loading")
    expect(store.target).toEqual(productTarget)
    expect(store.language).toBe("fr")
    expect(store.panelOpen).toBe(false)
    expect(store.pending).toEqual({})
    expect(store.warnings).toEqual([])
    expect(store.failure).toBeNull()
    expect(store.requestId).toBeNull()
  })

  it("refuses a second begin while a request is already loading", () => {
    const store = useAiGenerationStore()
    store.begin(productTarget, "fr", vi.fn())

    const second = store.begin(newTarget, "en", vi.fn())

    expect(second).toBeNull()
    expect(store.target).toEqual(productTarget)
    expect(store.language).toBe("fr")
    expect(store.status).toBe("loading")
  })

  it("allows a new begin from ready and replaces the previous result", () => {
    const store = useAiGenerationStore()
    const first = store.begin(productTarget, "fr", vi.fn()) as number
    store.succeed(first, response())

    const second = store.begin(newTarget, "en", vi.fn())

    expect(second).not.toBeNull()
    expect(store.status).toBe("loading")
    expect(store.target).toEqual(newTarget)
    expect(store.language).toBe("en")
    expect(store.pending).toEqual({})
    expect(store.requestId).toBeNull()
  })

  it("succeed stores the suggestion fields, requestId, and warnings", () => {
    const store = useAiGenerationStore()
    const run = store.begin(productTarget, "fr", vi.fn()) as number

    store.succeed(
      run,
      response({
        assets: {
          imageProfile: "all-auto",
          candidateImageCount: 1,
          imageCount: 1,
          imageFallback: false,
          datasheetUsed: true,
          warnings: ["image_unavailable"],
        },
      }),
    )

    expect(store.status).toBe("ready")
    expect(store.requestId).toBe("req-1")
    expect(store.warnings).toEqual(["image_unavailable"])
    expect(store.pending).toEqual({
      name: "Router X200",
      shortDescription: "Fast and reliable.",
      longDescription: "A full description.",
      features: ["Dual band", "4K streaming"],
    })
  })

  it("keeps an explicitly returned empty feature list pending so the operator may apply or dismiss it", () => {
    const store = useAiGenerationStore()
    const run = store.begin(productTarget, "fr", vi.fn()) as number

    store.succeed(
      run,
      response({
        suggestion: { name: "Router X200", shortDescription: "Fast.", longDescription: "Full.", features: [] },
      }),
    )

    expect(store.pending).toEqual({
      name: "Router X200",
      shortDescription: "Fast.",
      longDescription: "Full.",
      features: [],
    })
  })

  it("ignores succeed for a stale run id", () => {
    const store = useAiGenerationStore()
    const staleRun = store.begin(productTarget, "fr", vi.fn()) as number
    store.succeed(staleRun, response())
    store.begin(newTarget, "en", vi.fn())

    store.succeed(staleRun, response({ requestId: "stale" }))

    expect(store.status).toBe("loading")
    expect(store.target).toEqual(newTarget)
    expect(store.requestId).toBeNull()
  })

  it("fail stores the failure for the current run and clears pending", () => {
    const store = useAiGenerationStore()
    const run = store.begin(productTarget, "fr", vi.fn()) as number

    store.fail(run, failure({ reason: "quota_exceeded", retryAfterSeconds: 1800 }))

    expect(store.status).toBe("error")
    expect(store.failure).toEqual({ reason: "quota_exceeded", retryAfterSeconds: 1800 })
    expect(store.pending).toEqual({})
  })

  it("ignores fail for a stale run id", () => {
    const store = useAiGenerationStore()
    const staleRun = store.begin(productTarget, "fr", vi.fn()) as number
    store.succeed(staleRun, response())
    store.begin(newTarget, "en", vi.fn())

    store.fail(staleRun, failure())

    expect(store.status).toBe("loading")
    expect(store.failure).toBeNull()
  })

  it("settle removes one pending field and leaves the rest and the status untouched", () => {
    const store = useAiGenerationStore()
    const run = store.begin(productTarget, "fr", vi.fn()) as number
    store.succeed(run, response())

    store.settle("name")

    expect(store.pending).toEqual({
      shortDescription: "Fast and reliable.",
      longDescription: "A full description.",
      features: ["Dual band", "4K streaming"],
    })
    expect(store.status).toBe("ready")
  })

  it("release resets to idle when it matches the current target by value", () => {
    const store = useAiGenerationStore()
    store.begin({ kind: "product", id: 42 }, "fr", vi.fn())

    store.release({ kind: "product", id: 42 })

    expect(store.status).toBe("idle")
    expect(store.target).toBeNull()
    expect(store.pending).toEqual({})
  })

  it("release invalidates the old run, so a late succeed for it is ignored", () => {
    const store = useAiGenerationStore()
    const run = store.begin(productTarget, "fr", vi.fn()) as number

    store.release(productTarget)
    store.succeed(run, response())

    expect(store.status).toBe("idle")
    expect(store.pending).toEqual({})
  })

  it("release does nothing when the target does not match the current one", () => {
    const store = useAiGenerationStore()
    store.begin(productTarget, "fr", vi.fn())

    store.release(newTarget)

    expect(store.status).toBe("loading")
    expect(store.target).toEqual(productTarget)
  })

  it("a product target never equals a new target, even sharing the same id/token value", () => {
    const store = useAiGenerationStore()
    store.begin({ kind: "product", id: 1 }, "fr", vi.fn())

    store.release({ kind: "new", token: "1" })

    expect(store.status).toBe("loading")
  })

  it("retryLast calls the retry function registered on the latest begin, only in error status", () => {
    const store = useAiGenerationStore()
    const retry = vi.fn()
    const run = store.begin(productTarget, "fr", retry) as number
    store.fail(run, failure())

    store.retryLast()

    expect(retry).toHaveBeenCalledTimes(1)
  })

  it("retryLast does nothing while ready", () => {
    const store = useAiGenerationStore()
    const retry = vi.fn()
    const run = store.begin(productTarget, "fr", retry) as number
    store.succeed(run, response())

    store.retryLast()

    expect(retry).not.toHaveBeenCalled()
  })
})

describe("useAiGenerationStore history", () => {
  const settledAt = new Date("2026-10-02T14:32:00Z").getTime()

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.setSystemTime(settledAt)
  })
  afterEach(() => vi.useRealTimers())

  it("records the whole package, warnings, label, language and time when a run succeeds", () => {
    const store = useAiGenerationStore()
    const run = store.begin(productTarget, "en", vi.fn(), "Router X200") as number

    store.succeed(
      run,
      response({
        assets: {
          imageProfile: "all-auto",
          candidateImageCount: 0,
          imageCount: 0,
          imageFallback: false,
          datasheetUsed: false,
          warnings: ["image_unavailable"],
        },
      }),
    )

    expect(store.history).toEqual([
      {
        id: run,
        status: "ready",
        target: productTarget,
        label: "Router X200",
        language: "en",
        createdAt: settledAt,
        suggestion: response().suggestion,
        assets: {
          imageProfile: "all-auto",
          candidateImageCount: 0,
          imageCount: 0,
          imageFallback: false,
          datasheetUsed: false,
          warnings: ["image_unavailable"],
        },
        warnings: ["image_unavailable"],
        requestId: "req-1",
      },
    ])
  })

  it("records the failure when a run fails", () => {
    const store = useAiGenerationStore()
    const run = store.begin(newTarget, "fr", vi.fn(), "Casque") as number

    store.fail(run, failure({ reason: "quota_exceeded", retryAfterSeconds: 1800 }))

    expect(store.history).toEqual([
      {
        id: run,
        status: "error",
        target: newTarget,
        label: "Casque",
        language: "fr",
        createdAt: settledAt,
        failure: { reason: "quota_exceeded", retryAfterSeconds: 1800 },
      },
    ])
  })

  it("lists the newest generation first and keeps only the ten most recent", () => {
    const store = useAiGenerationStore()

    for (let index = 1; index <= 11; index += 1) {
      const run = store.begin(productTarget, "fr", vi.fn(), `Product ${index}`) as number
      store.succeed(run, response())
    }

    expect(store.history.map(entry => entry.label)).toEqual([
      "Product 11",
      "Product 10",
      "Product 9",
      "Product 8",
      "Product 7",
      "Product 6",
      "Product 5",
      "Product 4",
      "Product 3",
      "Product 2",
    ])
  })

  it("records nothing while a run is loading, or when a stale or released run answers", () => {
    const store = useAiGenerationStore()
    const stale = store.begin(productTarget, "fr", vi.fn(), "Stale") as number
    store.release(productTarget)
    store.succeed(stale, response())
    store.fail(stale, failure())
    store.begin(productTarget, "fr", vi.fn(), "Running")

    expect(store.history).toEqual([])
  })

  it("keeps the whole package in history while the pending copy loses settled fields", () => {
    const store = useAiGenerationStore()
    const run = store.begin(productTarget, "fr", vi.fn(), "Router") as number
    store.succeed(run, response())

    store.settle("name")
    store.settle("features")

    expect(store.history[0]).toMatchObject({ status: "ready", suggestion: response().suggestion })
  })

  it("keeps the history through release and through a new run", () => {
    const store = useAiGenerationStore()
    const first = store.begin(productTarget, "fr", vi.fn(), "First") as number
    store.succeed(first, response())

    store.release(productTarget)
    store.begin(newTarget, "en", vi.fn(), "Second")

    expect(store.history.map(entry => entry.label)).toEqual(["First"])
  })

  it("restores only a ready entry with the exact fingerprint for the active editor target", () => {
    const store = useAiGenerationStore()
    store.setEditorTarget(productTarget)
    const run = store.begin(productTarget, "fr", vi.fn(), "Router") as number
    store.succeed(run, response(), "digest-a")

    expect(store.findReusable("digest-a", productTarget)?.id).toBe(run)
    expect(store.findReusable("digest-b", productTarget)).toBeNull()
    expect(store.findReusable("digest-a", newTarget)).toBeNull()
    expect(store.restoreReusable("digest-a", productTarget)).toBe(true)
    expect(store.pending.name).toBe("Router X200")
  })

  it("never considers an error entry reusable", () => {
    const store = useAiGenerationStore()
    store.setEditorTarget(productTarget)
    const run = store.begin(productTarget, "fr", vi.fn(), "Router") as number
    store.fail(run, failure())

    expect(store.findReusable("digest-a", productTarget)).toBeNull()
  })

  it("removeEntry drops only that entry and ignores an unknown id", () => {
    const store = useAiGenerationStore()
    const first = store.begin(productTarget, "fr", vi.fn(), "First") as number
    store.succeed(first, response())
    const second = store.begin(productTarget, "fr", vi.fn(), "Second") as number
    store.fail(second, failure())

    store.removeEntry(999)
    expect(store.history).toHaveLength(2)

    store.removeEntry(first)
    expect(store.history.map(entry => entry.label)).toEqual(["Second"])
  })

  it("clearHistory empties the list but leaves the current result alone", () => {
    const store = useAiGenerationStore()
    const run = store.begin(productTarget, "fr", vi.fn(), "Router") as number
    store.succeed(run, response())

    store.clearHistory()

    expect(store.history).toEqual([])
    expect(store.status).toBe("ready")
    expect(store.pending.name).toBe("Router X200")
  })
})

describe("useAiGenerationStore panel", () => {
  beforeEach(() => setActivePinia(createPinia()))

  it("setPanelOpen closes the panel even while a generation is loading, without stopping it", () => {
    const store = useAiGenerationStore()
    store.begin(productTarget, "fr", vi.fn())

    store.setPanelOpen(false)

    expect(store.panelOpen).toBe(false)
    expect(store.status).toBe("loading")
  })

  it("release leaves the panel as the operator left it", () => {
    const store = useAiGenerationStore()
    store.setPanelOpen(true)
    store.begin(productTarget, "fr", vi.fn())

    store.release(productTarget)

    expect(store.panelOpen).toBe(true)
  })

  it.each(["ready", "error"] as const)("marks a run that settles while the panel is closed as unread (%s)", outcome => {
    const store = useAiGenerationStore()
    const run = store.begin(productTarget, "fr", vi.fn()) as number
    store.setPanelOpen(false)

    if (outcome === "ready") store.succeed(run, response())
    else store.fail(run, failure())

    expect(store.unread).toBe(true)
  })

  it("does not mark a run unread when the panel is open as it settles", () => {
    const store = useAiGenerationStore()
    const run = store.begin(productTarget, "fr", vi.fn()) as number
    store.setPanelOpen(true)

    store.succeed(run, response())

    expect(store.unread).toBe(false)
  })

  it("opening the panel clears unread", () => {
    const store = useAiGenerationStore()
    const run = store.begin(productTarget, "fr", vi.fn()) as number
    store.setPanelOpen(false)
    store.succeed(run, response())

    store.setPanelOpen(true)

    expect(store.unread).toBe(false)
  })

  it("a new run and a release both clear unread", () => {
    const store = useAiGenerationStore()
    const run = store.begin(productTarget, "fr", vi.fn()) as number
    store.setPanelOpen(false)
    store.succeed(run, response())

    store.begin(productTarget, "fr", vi.fn())
    expect(store.unread).toBe(false)

    store.setPanelOpen(false)
    store.release(productTarget)
    expect(store.unread).toBe(false)
  })

  it("begin brings the suggestions section forward from any other section", () => {
    const store = useAiGenerationStore()
    store.setPanelSection("settings")

    store.begin(productTarget, "fr", vi.fn())

    expect(store.panelSection).toBe("suggestions")
  })

  it("keeps a run that settles under another section unread until the suggestions are shown", () => {
    const store = useAiGenerationStore()
    const run = store.begin(productTarget, "fr", vi.fn()) as number
    store.setPanelOpen(true)
    store.setPanelSection("conversations")

    store.succeed(run, response())
    expect(store.unread).toBe(true)

    store.setPanelSection("suggestions")
    expect(store.unread).toBe(false)
  })

  it("does not clear unread by reopening the panel on a section other than the suggestions", () => {
    const store = useAiGenerationStore()
    const run = store.begin(productTarget, "fr", vi.fn()) as number
    store.setPanelOpen(false)
    store.setPanelSection("settings")
    store.succeed(run, response())

    store.setPanelOpen(true)

    expect(store.unread).toBe(true)
  })
})

describe("useAiGenerationStore settings", () => {
  beforeEach(() => setActivePinia(createPinia()))

  it("writes in French until the operator chooses otherwise, and keeps that choice through runs and releases", () => {
    const store = useAiGenerationStore()
    expect(store.preferredLanguage).toBe("fr")

    store.setPreferredLanguage("en")
    const run = store.begin(productTarget, "fr", vi.fn()) as number
    store.succeed(run, response())
    store.release(productTarget)
    store.clearHistory()

    expect(store.preferredLanguage).toBe("en")
  })
})

describe("useAiGenerationStore editor review", () => {
  beforeEach(() => setActivePinia(createPinia()))

  function settledRun(store: ReturnType<typeof useAiGenerationStore>, overrides = response()) {
    const run = store.begin(productTarget, "en", vi.fn(), "Router") as number
    store.succeed(run, overrides)
    return run
  }

  it("clearEditorTarget only forgets the editor it was given", () => {
    const store = useAiGenerationStore()
    store.setEditorTarget(productTarget)

    store.clearEditorTarget(newTarget)
    expect(store.editorTarget).toEqual(productTarget)

    store.clearEditorTarget({ kind: "product", id: 42 })
    expect(store.editorTarget).toBeNull()
  })

  it("canRestore is true only for a ready entry of the open editor while nothing is loading", () => {
    const store = useAiGenerationStore()
    const ready = settledRun(store)
    const failed = store.begin(productTarget, "fr", vi.fn(), "Router") as number
    store.fail(failed, failure())
    expect(store.canRestore(ready)).toBe(false)

    store.setEditorTarget(productTarget)
    expect(store.canRestore(ready)).toBe(true)
    expect(store.canRestore(failed)).toBe(false)
    expect(store.canRestore(999)).toBe(false)

    store.setEditorTarget(newTarget)
    expect(store.canRestore(ready)).toBe(false)

    store.setEditorTarget(productTarget)
    store.begin(productTarget, "fr", vi.fn(), "Router")
    expect(store.canRestore(ready)).toBe(false)
  })

  it("restore brings every field of an old package back as pending and closes the panel", () => {
    const store = useAiGenerationStore()
    const run = settledRun(
      store,
      response({
        assets: {
          imageProfile: "all-auto",
          candidateImageCount: 0,
          imageCount: 0,
          imageFallback: false,
          datasheetUsed: false,
          warnings: ["datasheet_unavailable"],
        },
      }),
    )
    store.settle("name")
    store.settle("features")
    store.release(productTarget)
    store.setEditorTarget(productTarget)
    store.setPanelOpen(true)

    expect(store.restore(run)).toBe(true)

    expect(store.status).toBe("ready")
    expect(store.target).toEqual(productTarget)
    expect(store.language).toBe("en")
    expect(store.requestId).toBe("req-1")
    expect(store.warnings).toEqual(["datasheet_unavailable"])
    expect(store.failure).toBeNull()
    expect(store.pending).toEqual(response().suggestion)
    expect(store.panelOpen).toBe(false)
    expect(store.unread).toBe(false)
  })

  it("applyAll restores the package and raises one apply request for the open editor", () => {
    const store = useAiGenerationStore()
    const run = settledRun(store)
    store.release(productTarget)
    store.setEditorTarget(productTarget)
    store.setPanelOpen(true)
    const before = store.applyAllRequest

    expect(store.applyAll(run)).toBe(true)

    expect(store.applyAllRequest).toBe(before + 1)
    expect(store.pending).toEqual(response().suggestion)
    expect(store.panelOpen).toBe(false)
  })

  it("applyAll does nothing and answers false when the entry cannot be reviewed", () => {
    const store = useAiGenerationStore()
    const run = settledRun(store)
    store.release(productTarget)
    store.setEditorTarget(newTarget)
    const before = store.applyAllRequest

    expect(store.applyAll(run)).toBe(false)

    expect(store.applyAllRequest).toBe(before)
    expect(store.pending).toEqual({})
  })

  it("restore leaves the store alone and answers false when the entry cannot be reviewed", () => {
    const store = useAiGenerationStore()
    const run = settledRun(store)
    store.release(productTarget)

    expect(store.restore(run)).toBe(false)
    expect(store.status).toBe("idle")
    expect(store.pending).toEqual({})
  })

  it("a restored result can be settled field by field and never offers a retry", () => {
    const store = useAiGenerationStore()
    const run = settledRun(store)
    store.release(productTarget)
    store.setEditorTarget(productTarget)
    store.restore(run)

    store.settle("name")
    store.retryLast()

    expect(store.pending).not.toHaveProperty("name")
    expect(store.canRetry).toBe(false)
    expect(store.history).toHaveLength(1)
  })
})

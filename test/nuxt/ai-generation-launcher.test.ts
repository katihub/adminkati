import type {
  ProductCopyFailureReason,
  ProductCopySuggestionResponse,
  ProductCopyTarget,
} from "@/types/ai/product-copy"
import type { Role } from "@/types/session"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import AiGenerationLauncher from "@/components/admin/AiGenerationLauncher.vue"
import { useAiGenerationStore } from "@/stores/ai-generation"

const target: ProductCopyTarget = { kind: "product", id: 1 }

const LAUNCHER = "[data-testid='ai-generation-launcher']"
const PANEL = "[data-testid='ai-generation-panel']"
const ITEM = "[data-testid='ai-generation-history-item']"

function suggestionResponse(overrides: Partial<ProductCopySuggestionResponse> = {}): ProductCopySuggestionResponse {
  return {
    suggestion: {
      name: "Router X1 Pro",
      shortDescription: "Fast.",
      longDescription: "Reliable.",
      features: ["Dual band", "Wi-Fi 6"],
    },
    assets: {
      imageProfile: "all-auto",
      candidateImageCount: 1,
      imageCount: 1,
      imageFallback: false,
      datasheetUsed: false,
      warnings: [],
    },
    requestId: "req-1",
    ...overrides,
  }
}

function seedSession(roles: Role[]) {
  useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
    userId: "u1",
    membreId: "m1",
    nom: "Ada",
    courriel: "ada@example.com",
    roles,
  })
}

const mounted: Array<{ unmount: () => void }> = []

async function mountLauncher(roles: Role[] = ["direction"]) {
  seedSession(roles)
  const wrapper = await mountSuspended(AiGenerationLauncher, { attachTo: document.body })
  mounted.push(wrapper)
  return wrapper
}

const panel = () => document.body.querySelector(PANEL)
const items = () => Array.from(document.body.querySelectorAll<HTMLElement>(ITEM))
const byId = <T extends HTMLElement>(testid: string, within: ParentNode = document.body) =>
  within.querySelector<T>(`[data-testid='${testid}']`)

function succeedRun(
  label: string,
  overrides: Partial<ProductCopySuggestionResponse> = {},
  language: "fr" | "en" = "fr",
) {
  const store = useAiGenerationStore()
  const run = store.begin(target, language, vi.fn(), label) as number
  store.succeed(run, suggestionResponse(overrides))
  return run
}

function failRun(reason: ProductCopyFailureReason, retryAfterSeconds: number | null = null, retry = vi.fn()) {
  const store = useAiGenerationStore()
  const run = store.begin(target, "fr", retry, "Router") as number
  store.fail(run, { reason, retryAfterSeconds })
  return run
}

describe("AiGenerationLauncher", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date(2026, 9, 2, 14, 32))
  })

  afterEach(() => {
    // A failed assertion would otherwise leave its launcher in the document for the next test to find.
    for (const wrapper of mounted.splice(0)) wrapper.unmount()
    vi.useRealTimers()
    const store = useAiGenerationStore()
    if (store.target) store.release(store.target)
    store.clearHistory()
    store.clearEditorTarget(target)
    store.setPanelOpen(false)
    store.setPanelSection("suggestions")
    store.setPreferredLanguage("fr")
    store.setPreferredFields(["name", "shortDescription", "longDescription", "features"])
    store.setPreferredImageProfile("all-auto")
    useNuxtApp().$queryClient.clear()
  })

  describe("the floating button", () => {
    it("is offered to the management team as an icon-only button with an accessible name", async () => {
      const wrapper = await mountLauncher(["direction"])
      await flushPromises()

      const button = wrapper.get(LAUNCHER)
      expect(button.text()).toBe("")
      expect(button.attributes("aria-label")).toBe("KatiHub AI")
      expect(button.find("svg").exists()).toBe(true)

      wrapper.unmount()
    })

    it("is not offered to anyone who cannot generate copy", async () => {
      const wrapper = await mountLauncher(["comptoir"])
      await flushPromises()

      expect(wrapper.find(LAUNCHER).exists()).toBe(false)

      wrapper.unmount()
    })

    it("opens and closes the panel on click, and reports it with aria-expanded", async () => {
      const wrapper = await mountLauncher()
      await flushPromises()
      expect(panel()).toBeNull()
      expect(wrapper.get(LAUNCHER).attributes("aria-expanded")).toBe("false")

      await wrapper.get(LAUNCHER).trigger("click")
      await flushPromises()
      expect(panel()).not.toBeNull()
      expect(wrapper.get(LAUNCHER).attributes("aria-expanded")).toBe("true")

      await wrapper.get(LAUNCHER).trigger("click")
      await flushPromises()
      expect(panel()).toBeNull()

      wrapper.unmount()
    })

    it("closes the panel from its own close control", async () => {
      const wrapper = await mountLauncher()
      await wrapper.get(LAUNCHER).trigger("click")
      await flushPromises()

      byId("ai-generation-panel-close")?.click()
      await flushPromises()

      expect(panel()).toBeNull()

      wrapper.unmount()
    })

    it("tells the operator there is nothing to look at yet", async () => {
      const wrapper = await mountLauncher()
      await wrapper.get(LAUNCHER).trigger("click")
      await flushPromises()

      expect(byId("ai-generation-history-empty")?.textContent).toContain("Nothing generated yet")
      expect(byId("ai-generation-history-clear")).toBeNull()

      wrapper.unmount()
    })
  })

  describe("the sidebar", () => {
    const SECTION = "[data-testid^='ai-generation-section-']"
    const sections = () => Array.from(document.body.querySelectorAll<HTMLElement>(SECTION))

    it("lists Suggestions, Conversations and Settings in that order, with Suggestions current", async () => {
      const wrapper = await mountLauncher()
      await wrapper.get(LAUNCHER).trigger("click")
      await flushPromises()

      expect(sections().map(item => item.textContent?.trim())).toEqual(["Suggestions", "Conversations", "Settings"])
      expect(sections().map(item => item.getAttribute("aria-current"))).toEqual(["true", null, null])

      wrapper.unmount()
    })

    it("shows the chosen section and gives the history back on returning to Suggestions", async () => {
      succeedRun("Router")
      useAiGenerationStore().setPanelOpen(true)
      const wrapper = await mountLauncher()
      await flushPromises()
      expect(items()).toHaveLength(1)

      byId("ai-generation-section-conversations")?.click()
      await flushPromises()
      expect(items()).toHaveLength(0)
      expect(byId("ai-generation-empty-conversations")).not.toBeNull()
      expect(byId("ai-generation-section-conversations")?.getAttribute("aria-current")).toBe("true")

      byId("ai-generation-section-suggestions")?.click()
      await flushPromises()
      expect(items()).toHaveLength(1)

      wrapper.unmount()
    })

    it("flags Suggestions when a result lands under another section, and clears it on return", async () => {
      const wrapper = await mountLauncher()
      const store = useAiGenerationStore()
      const run = store.begin(target, "fr", vi.fn(), "Router") as number
      store.setPanelOpen(true)
      await flushPromises()
      byId("ai-generation-section-settings")?.click()
      await flushPromises()

      store.succeed(run, suggestionResponse())
      await flushPromises()
      expect(byId("ai-generation-unread-dot", byId("ai-generation-section-suggestions")!)).not.toBeNull()

      byId("ai-generation-section-suggestions")?.click()
      await flushPromises()
      expect(byId("ai-generation-unread-dot")).toBeNull()

      wrapper.unmount()
    })
  })

  describe("the settings section", () => {
    const language = (code: "fr" | "en") => byId(`ai-generation-language-${code}`)

    async function openSettings() {
      const wrapper = await mountLauncher()
      await wrapper.get(LAUNCHER).trigger("click")
      await flushPromises()
      byId("ai-generation-section-settings")?.click()
      await flushPromises()
      return wrapper
    }

    it("lets the operator pick the language of the suggestions, with French chosen first", async () => {
      const wrapper = await openSettings()

      expect(language("fr")?.textContent?.trim()).toBe("French")
      expect(language("en")?.textContent?.trim()).toBe("English")
      expect(language("fr")?.getAttribute("aria-pressed")).toBe("true")
      expect(language("en")?.getAttribute("aria-pressed")).toBe("false")

      wrapper.unmount()
    })

    it("keeps the chosen language when the operator leaves Settings and comes back", async () => {
      const wrapper = await openSettings()

      language("en")?.click()
      await flushPromises()
      expect(useAiGenerationStore().preferredLanguage).toBe("en")

      byId("ai-generation-section-suggestions")?.click()
      await flushPromises()
      byId("ai-generation-section-settings")?.click()
      await flushPromises()

      expect(language("en")?.getAttribute("aria-pressed")).toBe("true")
      expect(language("fr")?.getAttribute("aria-pressed")).toBe("false")

      wrapper.unmount()
    })

    it("keeps a non-empty field scope and image profile for the next generation", async () => {
      const wrapper = await openSettings()

      byId("ai-generation-field-name")?.click()
      byId("ai-generation-image-profile-primary-auto")?.click()
      await flushPromises()

      const store = useAiGenerationStore()
      expect(store.preferredFields).toEqual(["shortDescription", "longDescription", "features"])
      expect(store.preferredImageProfile).toBe("primary-auto")
      expect(byId("ai-generation-field-name")?.getAttribute("aria-pressed")).toBe("false")
      expect(byId("ai-generation-image-profile-primary-auto")?.getAttribute("aria-pressed")).toBe("true")

      wrapper.unmount()
    })
  })

  describe("a generation in progress", () => {
    it.each([
      ["fr", "Generating French suggestions…"],
      ["en", "Generating English suggestions…"],
    ] as const)("shows the run in the panel and names the language (%s)", async (language, expectedText) => {
      const wrapper = await mountLauncher()
      useAiGenerationStore().begin(target, language, vi.fn(), "Router")
      await wrapper.get(LAUNCHER).trigger("click")
      await flushPromises()

      const loading = byId("ai-generation-loading")
      expect(loading?.getAttribute("role")).toBe("status")
      expect(loading?.textContent).toContain(expectedText)
      expect(loading?.textContent).toContain("Router")
      expect(items()).toHaveLength(0)

      wrapper.unmount()
    })

    it("keeps running when the panel is closed, and does not reopen it when the result arrives", async () => {
      const wrapper = await mountLauncher()
      const store = useAiGenerationStore()
      const run = store.begin(target, "fr", vi.fn(), "Router") as number
      store.setPanelOpen(true)
      await flushPromises()

      byId("ai-generation-panel-close")?.click()
      await flushPromises()
      expect(store.status).toBe("loading")

      store.succeed(run, suggestionResponse())
      await flushPromises()

      expect(panel()).toBeNull()
      expect(store.history).toHaveLength(1)

      wrapper.unmount()
    })
  })

  describe("the activity dot", () => {
    const dot = (wrapper: Awaited<ReturnType<typeof mountLauncher>>) =>
      wrapper.find("[data-testid='ai-generation-launcher-indicator']")

    it("shows nothing when idle", async () => {
      const wrapper = await mountLauncher()
      await flushPromises()

      expect(dot(wrapper).exists()).toBe(false)

      wrapper.unmount()
    })

    it("shows a busy dot while generating, even with the panel closed", async () => {
      const wrapper = await mountLauncher()
      useAiGenerationStore().begin(target, "fr", vi.fn(), "Router")
      useAiGenerationStore().setPanelOpen(false)
      await flushPromises()

      expect(dot(wrapper).attributes("data-kind")).toBe("loading")

      wrapper.unmount()
    })

    it.each(["ready", "error"] as const)("flags an unseen %s result until the panel is opened", async outcome => {
      const wrapper = await mountLauncher()
      const store = useAiGenerationStore()
      const run = store.begin(target, "fr", vi.fn(), "Router") as number
      store.setPanelOpen(false)
      if (outcome === "ready") store.succeed(run, suggestionResponse())
      else store.fail(run, { reason: "busy", retryAfterSeconds: null })
      await flushPromises()

      expect(dot(wrapper).attributes("data-kind")).toBe(outcome)

      await wrapper.get(LAUNCHER).trigger("click")
      await flushPromises()

      expect(dot(wrapper).exists()).toBe(false)

      wrapper.unmount()
    })
  })

  describe("the history", () => {
    it("lists a finished generation with its product, language and time, and opens the newest one", async () => {
      const wrapper = await mountLauncher()
      await wrapper.get(LAUNCHER).trigger("click")
      succeedRun("Router X1", {}, "en")
      await flushPromises()

      const [entry] = items()
      expect(entry?.getAttribute("data-status")).toBe("ready")
      expect(entry?.textContent).toContain("Router X1")
      expect(entry?.textContent).toContain("English")
      expect(entry?.querySelector("time")?.textContent).toBe("14:32")
      expect(byId("ai-generation-history-toggle", entry)?.getAttribute("aria-expanded")).toBe("true")
      expect(byId("ai-generation-loading")).toBeNull()

      wrapper.unmount()
    })

    it("shows every suggested field of the package, features as a list", async () => {
      const wrapper = await mountLauncher()
      await wrapper.get(LAUNCHER).trigger("click")
      succeedRun("Router X1")
      await flushPromises()

      const entry = items()[0] as HTMLElement
      expect(byId("ai-generation-history-field-name", entry)?.textContent).toContain("Router X1 Pro")
      expect(byId("ai-generation-history-field-shortDescription", entry)?.textContent).toContain("Fast.")
      expect(byId("ai-generation-history-field-longDescription", entry)?.textContent).toContain("Reliable.")
      const features = byId("ai-generation-history-field-features", entry)
      expect(Array.from(features?.querySelectorAll("li") ?? []).map(li => li.textContent?.trim())).toEqual([
        "Dual band",
        "Wi-Fi 6",
      ])

      wrapper.unmount()
    })

    it("labels a scoped run with exactly its returned fields instead of implying a full package", async () => {
      const wrapper = await mountLauncher()
      await wrapper.get(LAUNCHER).trigger("click")
      succeedRun("Router X1", { suggestion: { shortDescription: "Fast." } })
      await flushPromises()

      const entry = items()[0] as HTMLElement
      expect(byId("ai-generation-history-scope", entry)?.textContent).toBe("Fields: Short description")
      expect(byId("ai-generation-history-field-shortDescription", entry)?.textContent).toContain("Fast.")
      expect(byId("ai-generation-history-field-name", entry)).toBeNull()

      wrapper.unmount()
    })

    it("leaves out the features block when the model suggested none", async () => {
      const wrapper = await mountLauncher()
      await wrapper.get(LAUNCHER).trigger("click")
      succeedRun("Router X1", {
        suggestion: { name: "A", shortDescription: "B", longDescription: "C", features: [] },
      })
      await flushPromises()

      expect(byId("ai-generation-history-field-features")).toBeNull()

      wrapper.unmount()
    })

    it("falls back to a neutral title when the product had no name", async () => {
      const wrapper = await mountLauncher()
      await wrapper.get(LAUNCHER).trigger("click")
      succeedRun("")
      await flushPromises()

      expect(items()[0]?.textContent).toContain("Untitled product")

      wrapper.unmount()
    })

    it("lists the newest first, folding the older ones until they are opened", async () => {
      const wrapper = await mountLauncher()
      await wrapper.get(LAUNCHER).trigger("click")
      succeedRun("First")
      succeedRun("Second")
      await flushPromises()

      const [newest, older] = items() as [HTMLElement, HTMLElement]
      expect(newest.textContent).toContain("Second")
      expect(older.textContent).toContain("First")
      expect(byId("ai-generation-history-toggle", older)?.getAttribute("aria-expanded")).toBe("false")
      expect(byId("ai-generation-history-field-name", older)).toBeNull()

      byId("ai-generation-history-toggle", older)?.click()
      await flushPromises()

      expect(byId("ai-generation-history-field-name", older)).not.toBeNull()

      wrapper.unmount()
    })

    it("states each request as a line of its own, naming the language and the product", async () => {
      const wrapper = await mountLauncher()
      await wrapper.get(LAUNCHER).trigger("click")
      succeedRun("Router X1", {}, "en")
      await flushPromises()

      expect(byId("ai-generation-history-ask", items()[0])?.textContent).toBe("Write English copy for Router X1")

      wrapper.unmount()
    })

    it("previews the suggested name on a folded entry and drops the preview once it opens", async () => {
      const wrapper = await mountLauncher()
      await wrapper.get(LAUNCHER).trigger("click")
      succeedRun("First")
      succeedRun("Second")
      await flushPromises()

      const [newest, older] = items() as [HTMLElement, HTMLElement]
      expect(byId("ai-generation-history-peek", newest)).toBeNull()
      expect(byId("ai-generation-history-peek", older)?.textContent).toBe("Router X1 Pro")

      byId("ai-generation-history-toggle", older)?.click()
      await flushPromises()

      expect(byId("ai-generation-history-peek", older)).toBeNull()

      wrapper.unmount()
    })

    it("has no preview for a failed entry, since there is nothing suggested to preview", async () => {
      const wrapper = await mountLauncher()
      await wrapper.get(LAUNCHER).trigger("click")
      failRun("busy")
      failRun("unknown")
      await flushPromises()

      expect(document.body.querySelector("[data-testid='ai-generation-history-peek']")).toBeNull()

      wrapper.unmount()
    })

    it("shows one line per asset warning of the generation", async () => {
      const wrapper = await mountLauncher()
      await wrapper.get(LAUNCHER).trigger("click")
      succeedRun("Router", {
        assets: {
          imageProfile: "all-auto",
          candidateImageCount: 0,
          imageCount: 0,
          imageFallback: false,
          datasheetUsed: false,
          warnings: ["image_unavailable", "datasheet_unavailable"],
        },
      })
      await flushPromises()

      expect(byId("ai-generation-warning-image_unavailable")?.textContent).toBe(
        "Some product images could not be used, so these suggestions rely on less information.",
      )
      expect(byId("ai-generation-warning-datasheet_unavailable")?.textContent).toBe(
        "The datasheet could not be used, so these suggestions rely on less information.",
      )

      wrapper.unmount()
    })

    it("shows no warning line when the response reports none", async () => {
      const wrapper = await mountLauncher()
      await wrapper.get(LAUNCHER).trigger("click")
      succeedRun("Router")
      await flushPromises()

      expect(document.body.querySelector("[data-testid^='ai-generation-warning-']")).toBeNull()

      wrapper.unmount()
    })

    it("removes a single entry from the history", async () => {
      const wrapper = await mountLauncher()
      await wrapper.get(LAUNCHER).trigger("click")
      succeedRun("First")
      succeedRun("Second")
      await flushPromises()

      byId("ai-generation-history-remove", items()[0])?.click()
      await flushPromises()

      expect(items().map(entry => entry.textContent)).toEqual([expect.stringContaining("First")])

      wrapper.unmount()
    })

    it("clears the whole history and goes back to the empty state", async () => {
      const wrapper = await mountLauncher()
      await wrapper.get(LAUNCHER).trigger("click")
      succeedRun("First")
      failRun("busy")
      await flushPromises()

      byId("ai-generation-history-clear")?.click()
      await flushPromises()

      expect(items()).toHaveLength(0)
      expect(byId("ai-generation-history-empty")).not.toBeNull()

      wrapper.unmount()
    })

    it("offers no clear control while a generation is still running", async () => {
      const wrapper = await mountLauncher()
      await wrapper.get(LAUNCHER).trigger("click")
      succeedRun("First")
      useAiGenerationStore().begin(target, "fr", vi.fn(), "Second")
      await flushPromises()

      expect(byId("ai-generation-history-clear")).toBeNull()

      wrapper.unmount()
    })
  })

  describe("a failed generation", () => {
    it.each<[ProductCopyFailureReason, string]>([
      ["busy", "Another generation is already running. Wait for it to finish."],
      ["quota_exceeded", "You have reached the hourly limit for AI suggestions."],
      ["provider_unavailable", "The AI service is unavailable right now. Try again in a moment."],
      ["unreachable", "The server could not be reached. Check your connection and try again."],
      ["unknown", "Suggestions could not be generated. Try again."],
      ["forbidden", "Only the management team can generate product copy."],
    ])("says why in plain words for %s", async (reason, sentence) => {
      const wrapper = await mountLauncher()
      await wrapper.get(LAUNCHER).trigger("click")
      failRun(reason)
      await flushPromises()

      const [entry] = items()
      expect(entry?.getAttribute("data-status")).toBe("error")
      expect(entry?.getAttribute("data-reason")).toBe(reason)
      expect(entry?.textContent).toContain(sentence)

      wrapper.unmount()
    })

    it("never shows the technical reason code or a server message", async () => {
      const wrapper = await mountLauncher()
      await wrapper.get(LAUNCHER).trigger("click")
      failRun("provider_unavailable")
      await flushPromises()

      expect(items()[0]?.textContent).not.toContain("provider_unavailable")

      wrapper.unmount()
    })

    it.each([
      [1800, "30"],
      [61, "2"],
    ] as const)("rounds a %i second quota wait up to whole minutes", async (seconds, minutes) => {
      const wrapper = await mountLauncher()
      await wrapper.get(LAUNCHER).trigger("click")
      failRun("quota_exceeded", seconds)
      await flushPromises()

      expect(byId("ai-generation-quota-wait")?.textContent).toContain(minutes)

      wrapper.unmount()
    })

    it.each<[ProductCopyFailureReason, number | null]>([
      ["quota_exceeded", null],
      ["busy", null],
    ])("shows no wait time for %s without a retry time", async (reason, seconds) => {
      const wrapper = await mountLauncher()
      await wrapper.get(LAUNCHER).trigger("click")
      failRun(reason, seconds)
      await flushPromises()

      expect(byId("ai-generation-quota-wait")).toBeNull()

      wrapper.unmount()
    })

    it("retries the newest failure exactly once", async () => {
      const wrapper = await mountLauncher()
      await wrapper.get(LAUNCHER).trigger("click")
      const retry = vi.fn()
      failRun("busy", null, retry)
      await flushPromises()

      byId("ai-generation-history-retry")?.click()

      expect(retry).toHaveBeenCalledTimes(1)

      wrapper.unmount()
    })

    it("offers no retry for a refusal that a second attempt cannot change", async () => {
      const wrapper = await mountLauncher()
      await wrapper.get(LAUNCHER).trigger("click")
      failRun("forbidden")
      await flushPromises()

      expect(byId("ai-generation-history-retry")).toBeNull()

      wrapper.unmount()
    })

    it("offers a retry on the newest failure only, not on older ones", async () => {
      const wrapper = await mountLauncher()
      await wrapper.get(LAUNCHER).trigger("click")
      failRun("busy")
      failRun("unknown")
      await flushPromises()

      const [newest, older] = items() as [HTMLElement, HTMLElement]
      byId("ai-generation-history-toggle", older)?.click()
      await flushPromises()

      expect(older.textContent).toContain("Another generation is already running")
      expect(byId("ai-generation-history-retry", newest)).not.toBeNull()
      expect(byId("ai-generation-history-retry", older)).toBeNull()

      wrapper.unmount()
    })
  })

  describe("reviewing an old generation in the editor", () => {
    it("offers the review control only for the product whose editor is open", async () => {
      const wrapper = await mountLauncher()
      const store = useAiGenerationStore()
      await wrapper.get(LAUNCHER).trigger("click")
      succeedRun("Router")
      await flushPromises()
      expect(byId("ai-generation-history-review")).toBeNull()

      store.setEditorTarget(target)
      await flushPromises()
      expect(byId("ai-generation-history-review")).not.toBeNull()

      store.setEditorTarget({ kind: "product", id: 2 })
      await flushPromises()
      expect(byId("ai-generation-history-review")).toBeNull()

      wrapper.unmount()
    })

    it("puts the cards back for review and closes the panel so the form is in view", async () => {
      const wrapper = await mountLauncher()
      const store = useAiGenerationStore()
      await wrapper.get(LAUNCHER).trigger("click")
      succeedRun("Router")
      store.release(target)
      store.setEditorTarget(target)
      await flushPromises()

      byId("ai-generation-history-review")?.click()
      await flushPromises()

      expect(store.pending).toEqual(suggestionResponse().suggestion)
      expect(panel()).toBeNull()

      wrapper.unmount()
    })

    it("offers apply all beside the review control, and only where review is possible", async () => {
      const wrapper = await mountLauncher()
      const store = useAiGenerationStore()
      await wrapper.get(LAUNCHER).trigger("click")
      succeedRun("Router")
      await flushPromises()
      expect(byId("ai-generation-history-apply-all")).toBeNull()

      store.setEditorTarget(target)
      await flushPromises()
      expect(byId("ai-generation-history-apply-all")).not.toBeNull()
      expect(byId("ai-generation-history-apply-all")?.textContent).toContain("Apply all")

      store.setEditorTarget({ kind: "product", id: 2 })
      await flushPromises()
      expect(byId("ai-generation-history-apply-all")).toBeNull()

      wrapper.unmount()
    })

    it("apply all asks the editor to apply the whole package and closes the panel", async () => {
      const wrapper = await mountLauncher()
      const store = useAiGenerationStore()
      await wrapper.get(LAUNCHER).trigger("click")
      succeedRun("Router")
      store.release(target)
      store.setEditorTarget(target)
      await flushPromises()
      const before = store.applyAllRequest

      byId("ai-generation-history-apply-all")?.click()
      await flushPromises()

      expect(store.applyAllRequest).toBe(before + 1)
      expect(panel()).toBeNull()

      wrapper.unmount()
    })

    it("never offers the review control on a failed generation", async () => {
      const wrapper = await mountLauncher()
      await wrapper.get(LAUNCHER).trigger("click")
      failRun("busy")
      useAiGenerationStore().setEditorTarget(target)
      await flushPromises()

      expect(byId("ai-generation-history-review")).toBeNull()

      wrapper.unmount()
    })
  })
})

describe("AiGenerationLauncher in the admin shell", () => {
  afterEach(() => {
    const store = useAiGenerationStore()
    if (store.target) store.release(store.target)
    store.clearHistory()
    store.setPanelOpen(false)
    useNuxtApp().$queryClient.clear()
  })

  it.each([
    [["direction"], 1],
    [["comptoir"], 0],
  ] as const)("mounts %j exactly %i launcher(s)", async (roles, expected) => {
    seedSession([...roles] as Role[])
    const { default: App } = await import("@/app.vue")
    const wrapper = await mountSuspended(App, { attachTo: document.body, route: "/" })
    await flushPromises()

    expect(document.body.querySelectorAll(LAUNCHER)).toHaveLength(expected)

    wrapper.unmount()
  })
})

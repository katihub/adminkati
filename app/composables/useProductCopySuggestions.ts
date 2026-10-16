import type {
  ProductCopyField,
  ProductCopyLanguage,
  ProductCopySuggestion,
  ProductCopySuggestionRequest,
  ProductCopySuggestionResponse,
  ProductCopyTarget,
} from "@/types/ai/product-copy"
import type { ComputedRef, MaybeRefOrGetter } from "vue"
import { computed, onMounted, onScopeDispose, toValue, watch } from "vue"
import { useAiGenerationStore } from "@/stores/ai-generation"
import { createProductCopyFingerprint, isSameProductCopyTarget, toProductCopyFailure } from "@/utils/ai-product-copy"

const SUGGESTIONS_PATH = "/api/ai/products/suggestions"
const OUTCOMES_PATH = "/api/ai/products/suggestions/outcomes"

export interface UseProductCopySuggestionsOptions {
  target: MaybeRefOrGetter<ProductCopyTarget>
  imageSignature: MaybeRefOrGetter<string>
  /** Read again on every attempt, so a retry sends what the operator has typed since. */
  buildRequest: (language: ProductCopyLanguage) => ProductCopySuggestionRequest
  /** Writes the whole package into the form when the operator chooses "apply all" in the panel. */
  applyAll?: (pending: Partial<ProductCopySuggestion>) => void
}

export interface ProductCopySuggestions {
  /** True while any generation runs: the server allows one per user, so every trigger waits for it. */
  isGenerating: ComputedRef<boolean>
  /** True while the in-flight run belongs to this target; drives the field animation. */
  isGeneratingForTarget: ComputedRef<boolean>
  /** The suggestions still waiting for a decision on this target; empty when the result belongs to another. */
  suggestions: ComputedRef<Partial<ProductCopySuggestion>>
  /** Writes in the language chosen in the KatiHub AI settings, restoring an exact session result when possible. */
  generate: () => Promise<void>
  /** Bypasses exact-result reuse and always contacts the provider. */
  generateFresh: () => Promise<void>
  /** Removes a locally handled card, then reports only its metadata without blocking the editor. */
  settle: (field: ProductCopyField, action?: "applied" | "dismissed") => void
  /** Drops this target's result, for when the operator abandons the edit. */
  release: () => void
}

export function useProductCopySuggestions(options: UseProductCopySuggestionsOptions): ProductCopySuggestions {
  const { $csrfFetch } = useNuxtApp()
  const store = useAiGenerationStore()
  const target = computed(() => toValue(options.target))
  const ownsResult = computed(() => isSameProductCopyTarget(store.target, target.value))

  /** A retry keeps the language of the run it repeats, even if the setting changed meanwhile. */
  function reportOutcome(field: ProductCopyField, action: "applied" | "dismissed") {
    const activeRequestId = store.requestId
    if (!activeRequestId || !ownsResult.value) return
    void $csrfFetch(OUTCOMES_PATH, {
      method: "POST",
      body: { requestId: activeRequestId, field, action },
    }).catch(() => undefined)
  }

  async function generateIn(language: ProductCopyLanguage, fresh: boolean) {
    const request = options.buildRequest(language)
    const fingerprint = await createProductCopyFingerprint({
      draft: request.draft,
      language: request.language,
      fields: request.fields,
      imageProfile: request.imageProfile,
      target: target.value,
      imageSignature: toValue(options.imageSignature),
    })
    if (!fresh && store.restoreReusable(fingerprint, target.value)) return

    const run = store.begin(target.value, language, () => void generateIn(language, true), request.draft.name)
    if (run === null) return

    try {
      const response = await $csrfFetch<ProductCopySuggestionResponse>(SUGGESTIONS_PATH, {
        method: "POST",
        body: request,
      })
      store.succeed(run, response, fingerprint)
    } catch (error) {
      store.fail(run, toProductCopyFailure(error))
    }
  }

  function release() {
    store.release(target.value)
  }

  watch(
    () => store.applyAllRequest,
    () => {
      if (!ownsResult.value) return
      const pending = { ...store.pending }
      options.applyAll?.(pending)
      for (const field of Object.keys(pending) as ProductCopyField[]) {
        store.settle(field)
        reportOutcome(field, "applied")
      }
    },
  )

  watch(target, (next, previous) => {
    if (!isSameProductCopyTarget(next, previous)) store.release(previous)
  })
  // Client only: the open editor is a fact about this browser tab, not something the server should render.
  onMounted(() => watch(target, next => store.setEditorTarget(next), { immediate: true }))
  onScopeDispose(() => {
    release()
    store.clearEditorTarget(target.value)
  })

  return {
    isGenerating: computed(() => store.status === "loading"),
    isGeneratingForTarget: computed(() => store.status === "loading" && ownsResult.value),
    suggestions: computed(() => (ownsResult.value ? store.pending : {})),
    generate: () => generateIn(store.preferredLanguage, false),
    generateFresh: () => generateIn(store.preferredLanguage, true),
    settle: (field, action) => {
      if (!ownsResult.value) return
      store.settle(field)
      if (action) reportOutcome(field, action)
    },
    release,
  }
}

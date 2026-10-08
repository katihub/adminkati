import type { AiPanelSection } from "../types/ai/panel"
import type {
  AiGenerationHistoryEntry,
  AiGenerationStatus,
  ProductCopyAssetWarning,
  ProductCopyFailure,
  ProductCopyField,
  ProductCopyImageProfile,
  ProductCopyLanguage,
  ProductCopySuggestion,
  ProductCopySuggestionResponse,
  ProductCopyTarget,
} from "../types/ai/product-copy"
import { defineStore } from "pinia"
import { computed, ref, shallowRef } from "vue"
import { PRODUCT_COPY_FIELDS } from "../types/ai/product-copy"
import { isSameProductCopyTarget, normalizeProductCopyFields } from "../utils/ai-product-copy"

const HISTORY_LIMIT = 10

function toPending(suggestion: Partial<ProductCopySuggestion>): Partial<ProductCopySuggestion> {
  return { ...suggestion }
}

/**
 * One generation at a time, for the whole admin. It holds the outcome only, never the request: the product
 * form owns its values, and a retry rebuilds the request from them. Settled runs are also kept in `history`,
 * in memory only: a reload forgets them, so generated text is never written to storage.
 */
export const useAiGenerationStore = defineStore("ai-generation", () => {
  const status = ref<AiGenerationStatus>("idle")
  const target = ref<ProductCopyTarget | null>(null)
  const language = ref<ProductCopyLanguage | null>(null)
  /** What the operator chose in Settings for the next run. `language` is what the current or last run used. */
  const preferredLanguage = ref<ProductCopyLanguage>("fr")
  const preferredFields = ref<ProductCopyField[]>([...PRODUCT_COPY_FIELDS])
  const preferredImageProfile = ref<ProductCopyImageProfile>("all-auto")
  const requestId = ref<string | null>(null)
  const pending = ref<Partial<ProductCopySuggestion>>({})
  const warnings = ref<ProductCopyAssetWarning[]>([])
  const failure = ref<ProductCopyFailure | null>(null)
  const label = ref("")
  const panelOpen = ref(false)
  const panelSection = ref<AiPanelSection>("suggestions")
  const unread = ref(false)
  const history = ref<AiGenerationHistoryEntry[]>([])
  const editorTarget = ref<ProductCopyTarget | null>(null)
  /** Counts the "apply all" requests; the open editor watches it and writes the pending package in one step. */
  const applyAllRequest = ref(0)

  const retry = shallowRef<(() => void) | null>(null)
  let lastRun = 0
  let activeRun = 0

  const canRetry = computed(() => status.value === "error" && retry.value !== null)

  function reset() {
    status.value = "idle"
    target.value = null
    language.value = null
    requestId.value = null
    pending.value = {}
    warnings.value = []
    failure.value = null
    label.value = ""
    unread.value = false
    retry.value = null
    activeRun = 0
  }

  function begin(
    nextTarget: ProductCopyTarget,
    nextLanguage: ProductCopyLanguage,
    onRetry: () => void,
    nextLabel = "",
  ) {
    if (status.value === "loading") return null
    lastRun += 1
    activeRun = lastRun
    status.value = "loading"
    target.value = nextTarget
    language.value = nextLanguage
    requestId.value = null
    pending.value = {}
    warnings.value = []
    failure.value = null
    label.value = nextLabel
    unread.value = false
    panelSection.value = "suggestions"
    retry.value = onRetry
    return activeRun
  }

  function isCurrent(run: number) {
    return run === activeRun && status.value === "loading"
  }

  /** A result counts as seen only while the suggestions themselves are on screen. */
  function suggestionsInView() {
    return panelOpen.value && panelSection.value === "suggestions"
  }

  function record(entry: AiGenerationHistoryEntry) {
    history.value = [entry, ...history.value].slice(0, HISTORY_LIMIT)
    unread.value = !suggestionsInView()
  }

  function succeed(run: number, response: ProductCopySuggestionResponse, fingerprint?: string) {
    if (!isCurrent(run) || !target.value || !language.value) return
    status.value = "ready"
    requestId.value = response.requestId
    warnings.value = [...response.assets.warnings]
    pending.value = toPending(response.suggestion)
    record({
      id: run,
      status: "ready",
      target: target.value,
      label: label.value,
      language: language.value,
      createdAt: Date.now(),
      suggestion: response.suggestion,
      assets: response.assets,
      warnings: warnings.value,
      requestId: response.requestId,
      ...(fingerprint ? { fingerprint } : {}),
    })
  }

  function fail(run: number, nextFailure: ProductCopyFailure) {
    if (!isCurrent(run) || !target.value || !language.value) return
    status.value = "error"
    failure.value = nextFailure
    pending.value = {}
    record({
      id: run,
      status: "error",
      target: target.value,
      label: label.value,
      language: language.value,
      createdAt: Date.now(),
      failure: nextFailure,
    })
  }

  function settle(field: ProductCopyField) {
    const { [field]: _settled, ...rest } = pending.value
    pending.value = rest
  }

  function release(released: ProductCopyTarget) {
    if (isSameProductCopyTarget(target.value, released)) reset()
  }

  function setEditorTarget(next: ProductCopyTarget) {
    editorTarget.value = next
  }

  function clearEditorTarget(cleared: ProductCopyTarget) {
    if (isSameProductCopyTarget(editorTarget.value, cleared)) editorTarget.value = null
  }

  /** Only the open editor can show cards, and a running generation owns the single result slot. */
  function findRestorable(id: number) {
    if (status.value === "loading") return null
    const entry = history.value.find(item => item.id === id)
    if (entry?.status !== "ready" || !isSameProductCopyTarget(entry.target, editorTarget.value)) return null
    return entry
  }

  /** The cache is session-only and must also belong to the editor currently on screen. */
  function findReusable(fingerprint: string, nextTarget: ProductCopyTarget) {
    if (status.value === "loading" || !isSameProductCopyTarget(nextTarget, editorTarget.value)) return null
    const entry = history.value.find(
      item =>
        item.status === "ready" && item.fingerprint === fingerprint && isSameProductCopyTarget(item.target, nextTarget),
    )
    return entry?.status === "ready" ? entry : null
  }

  function restoreReusable(fingerprint: string, nextTarget: ProductCopyTarget) {
    const entry = findReusable(fingerprint, nextTarget)
    return entry ? restore(entry.id) : false
  }

  function canRestore(id: number) {
    return findRestorable(id) !== null
  }

  function restore(id: number) {
    const entry = findRestorable(id)
    if (!entry) return false
    status.value = "ready"
    target.value = entry.target
    language.value = entry.language
    label.value = entry.label
    requestId.value = entry.requestId
    warnings.value = [...entry.warnings]
    failure.value = null
    pending.value = toPending(entry.suggestion)
    retry.value = null
    activeRun = 0
    unread.value = false
    panelOpen.value = false
    return true
  }

  function applyAll(id: number) {
    if (!restore(id)) return false
    applyAllRequest.value += 1
    return true
  }

  function setPanelOpen(open: boolean) {
    panelOpen.value = open
    if (suggestionsInView()) unread.value = false
  }

  function setPanelSection(section: AiPanelSection) {
    panelSection.value = section
    if (suggestionsInView()) unread.value = false
  }

  function setPreferredLanguage(next: ProductCopyLanguage) {
    preferredLanguage.value = next
  }

  function setPreferredFields(next: ProductCopyField[]) {
    const normalised = normalizeProductCopyFields(next)
    if (normalised.length) preferredFields.value = normalised
  }

  function setPreferredImageProfile(next: ProductCopyImageProfile) {
    preferredImageProfile.value = next
  }

  function removeEntry(id: number) {
    history.value = history.value.filter(entry => entry.id !== id)
  }

  function clearHistory() {
    history.value = []
  }

  function retryLast() {
    if (canRetry.value) retry.value?.()
  }

  return {
    status,
    target,
    language,
    preferredLanguage,
    preferredFields,
    preferredImageProfile,
    requestId,
    pending,
    warnings,
    failure,
    label,
    panelOpen,
    panelSection,
    unread,
    history,
    editorTarget,
    applyAllRequest,
    canRetry,
    begin,
    succeed,
    fail,
    settle,
    release,
    setEditorTarget,
    clearEditorTarget,
    canRestore,
    findReusable,
    restore,
    restoreReusable,
    applyAll,
    setPanelOpen,
    setPanelSection,
    setPreferredLanguage,
    setPreferredFields,
    setPreferredImageProfile,
    removeEntry,
    clearHistory,
    retryLast,
  }
})

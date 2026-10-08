import type { ReponseImportStock } from "@/types/api/stock-import"
import type {
  StockImportFailure,
  StockImportPhase,
  StockImportRunState,
  StockImportSubmission,
} from "@/types/stock-import"
import { useQueryClient } from "@tanstack/vue-query"
import { useEventListener } from "@vueuse/core"
import { computed, onScopeDispose, ref } from "vue"
import { apiQueryKeys } from "@/utils/api-query-keys"
import { classifyStockImportError } from "@/utils/stock-import-errors"
import { stockImportStage } from "@/utils/stock-import-stage"

const IMPORT_PATH = "/catalogue/administration/produits/inventaire/import"

function buildBody({ file, mode, motif, includeChanged }: StockImportSubmission, dryRun: boolean) {
  const body = new FormData()
  body.append("fichier", file)
  body.append("mode", mode)
  body.append("motif", motif)
  // `apercu` is "true" or "false" only (stock-import.dto.ts:30-33 in NowTech-backend-); a real run omits it.
  if (dryRun) body.append("apercu", "true")
  // Same strict boolean (stock-import.dto.ts:40); omitted means false, so a default run sends nothing.
  if (includeChanged) body.append("inclure_stock_modifie", "true")
  return body
}

export function useStockImportRun() {
  const write = useApiWrite()
  const client = useQueryClient()
  const session = useCachedSession()
  const state = ref<StockImportRunState>("idle")
  const preview = ref<ReponseImportStock | null>(null)
  const result = ref<ReponseImportStock | null>(null)
  const failure = ref<StockImportFailure | null>(null)
  const failurePhase = ref<StockImportPhase | null>(null)
  const stage = computed(() =>
    stockImportStage(state.value, {
      preview: Boolean(preview.value),
      result: Boolean(result.value),
      failure: Boolean(failure.value),
    }),
  )
  const retryable = computed(() => state.value === "failed" && failure.value?.kind !== "rejected")
  // Only an apply holds a key worth keeping; a failed preview is simply re-run.
  const canRetry = computed(() => retryable.value && failurePhase.value === "apply")
  let reviewed: StockImportSubmission | undefined
  let applyKey: string | undefined
  let controller: AbortController | undefined
  let removeGuard: (() => void) | undefined
  onScopeDispose(() => {
    controller?.abort()
    removeGuard?.()
  })

  function reset() {
    if (state.value === "submitting") return
    controller?.abort()
    controller = undefined
    state.value = "idle"
    preview.value = null
    result.value = null
    failure.value = null
    failurePhase.value = null
    reviewed = undefined
    applyKey = undefined
  }
  function cancelPreview() {
    if (state.value === "previewing") reset()
  }
  async function refresh() {
    await Promise.all([
      client.invalidateQueries({ queryKey: apiQueryKeys.products.all }),
      client.invalidateQueries({ queryKey: apiQueryKeys.statistics.overview() }),
    ])
  }
  function fail(error: unknown, phase: StockImportPhase) {
    const classified = classifyStockImportError(error)
    failure.value = classified
    failurePhase.value = phase
    state.value = "failed"
    return classified
  }
  async function runPreview(submission: StockImportSubmission) {
    const current = new AbortController()
    controller = current
    reviewed = submission
    state.value = "previewing"
    preview.value = null
    failure.value = null
    failurePhase.value = null
    try {
      const response = await write<ReponseImportStock>(IMPORT_PATH, {
        method: "POST",
        body: buildBody(submission, true),
        retry: 0,
        signal: current.signal,
      })
      if (current.signal.aborted) return
      preview.value = response
      state.value = "preview"
    } catch (error) {
      if (current.signal.aborted) return
      fail(error, "preview")
    }
  }
  async function runApply(submission: StockImportSubmission, key: string) {
    state.value = "submitting"
    preview.value = null
    result.value = null
    failure.value = null
    failurePhase.value = null
    // A tab closing mid-request cannot be told apart from a lost response, so warn instead.
    removeGuard = useEventListener(window, "beforeunload", event => {
      event.preventDefault()
      event.returnValue = ""
    })
    let failed: StockImportFailure | undefined
    try {
      result.value = await write<ReponseImportStock>(IMPORT_PATH, {
        method: "POST",
        body: buildBody(submission, false),
        headers: { "Cle-Idempotence": key },
        retry: 0,
      })
      state.value = "result"
    } catch (error) {
      failed = fail(error, "apply")
    } finally {
      removeGuard?.()
      removeGuard = undefined
    }
    // A rejection or a 429 (throttler, before any row runs) means nothing was written.
    if (!failed || (failed.kind !== "rejected" && failed.status !== 429)) await refresh()
  }
  async function review(input: Omit<StockImportSubmission, "includeChanged">) {
    if (state.value === "previewing" || state.value === "submitting") return
    if (!session.value?.roles.includes("direction")) return
    applyKey = undefined
    await runPreview({ ...input, includeChanged: false })
  }
  /** Re-runs the preview so what Apply sends is exactly the diff on screen. */
  async function setIncludeChanged(value: boolean) {
    if (state.value !== "preview" || !reviewed || reviewed.includeChanged === value) return
    await runPreview({ ...reviewed, includeChanged: value })
  }
  async function apply() {
    if (state.value !== "preview" || !preview.value?.appliquees || !reviewed) return
    applyKey = crypto.randomUUID()
    await runApply(reviewed, applyKey)
  }
  async function retry() {
    if (!retryable.value || !reviewed) return
    if (failurePhase.value === "preview") await runPreview(reviewed)
    else if (applyKey) await runApply(reviewed, applyKey)
  }
  return {
    state,
    stage,
    preview,
    result,
    failure,
    failurePhase,
    canRetry,
    review,
    setIncludeChanged,
    apply,
    retry,
    reset,
    cancelPreview,
  }
}

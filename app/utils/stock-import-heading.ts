import type { ReponseImportStock } from "@/types/api/stock-import"
import type { StockImportFailure, StockImportPhase } from "@/types/stock-import"
import type { StockImportStage } from "@/utils/stock-import-stage"

/** `id` selects `products.stockImport.headings.<id>.{title,description}`; `params` fill their placeholders. */
export interface Heading {
  id: string
  params: Record<string, number | string>
}

export interface StockImportHeadingInput {
  stage: StockImportStage
  preview: ReponseImportStock | null
  result: ReponseImportStock | null
  failure: StockImportFailure | null
  phase: StockImportPhase
}

const FIXED: Partial<Record<StockImportStage, string>> = {
  setup: "setup",
  previewing: "previewing",
  submitting: "submitting",
}

// Index = errors (1) + stock changed and skipped (2) + stock changed and included (4).
const PREVIEW_IDS = ["preview.clean", "preview.errors", "preview.changed", "preview.attention", "preview.included"]
const PREVIEW_INCLUDED_WITH_ERRORS = "preview.includedErrors"
const RESULT_IDS = ["result.done", "result.partial", "result.skipped", "result.partialSkipped"]

const flag = (value: number, bit: number) => (value > 0 ? bit : 0)

function counts(response: ReponseImportStock): Heading["params"] {
  return {
    count: response.appliquees,
    failed: response.echouees,
    changed: response.stock_modifiees,
    unchanged: response.ignorees,
  }
}

function previewHeading(preview: ReponseImportStock): Heading {
  const params = counts(preview)
  if (preview.appliquees === 0) return { id: "preview.nothing", params }
  const included = preview.inclure_stock_modifie
  const bits = flag(preview.echouees, 1) + flag(preview.stock_modifiees, included ? 4 : 2)
  return { id: bits === 5 ? PREVIEW_INCLUDED_WITH_ERRORS : (PREVIEW_IDS[bits] ?? "preview.clean"), params }
}

function resultHeading(result: ReponseImportStock): Heading {
  const params = counts(result)
  if (result.appliquees === 0) return { id: "result.none", params }
  return { id: RESULT_IDS[flag(result.echouees, 1) + flag(result.stock_modifiees, 2)] ?? "result.done", params }
}

const FAILURE_RULES: Array<[(failure: StockImportFailure, phase: StockImportPhase) => boolean, string]> = [
  [(failure, phase) => phase === "preview" && failure.kind === "retryable", "failure.previewInterrupted"],
  [failure => failure.kind === "inProgress", "failure.inProgress"],
  [failure => failure.status === 429, "failure.rateLimited"],
  [failure => failure.kind === "retryable", "failure.interrupted"],
]

function failureHeading(failure: StockImportFailure, phase: StockImportPhase): Heading {
  const rule = FAILURE_RULES.find(([matches]) => matches(failure, phase))
  return { id: rule?.[1] ?? "failure.rejected", params: {} }
}

/** The modal's title and subtitle follow what has just happened: review, errors, warnings, success. */
export function stockImportHeading({ stage, preview, result, failure, phase }: StockImportHeadingInput): Heading {
  const fixed = FIXED[stage]
  if (fixed) return { id: fixed, params: {} }
  if (stage === "preview" && preview) return previewHeading(preview)
  if (stage === "result" && result) return resultHeading(result)
  if (stage === "failed" && failure) return failureHeading(failure, phase)
  return { id: "setup", params: {} }
}

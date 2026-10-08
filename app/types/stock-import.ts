import type { CodeErreurFichier, CodeErreurIdempotence } from "@/types/api/stock-import"

export type StockImportMode = "reception" | "count"

export type StockImportRunState = "idle" | "previewing" | "preview" | "submitting" | "result" | "failed"

/** Which request failed: a preview wrote nothing and carries no key; an apply may have committed rows. */
export type StockImportPhase = "preview" | "apply"

/** `retryable` and `inProgress` may have committed rows, so they keep the same key on retry; `rejected` wrote nothing. */
export type StockImportFailureKind = "rejected" | "retryable" | "inProgress"

export interface StockImportFailure {
  kind: StockImportFailureKind
  status: number
  code: CodeErreurFichier | CodeErreurIdempotence | null
  message: string | null
}

export interface StockImportSubmission {
  file: File
  mode: StockImportMode
  motif: string
  /** Count mode only: apply the rows whose stock moved since the export instead of skipping them. */
  includeChanged: boolean
}

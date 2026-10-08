import type { StockImportFailure } from "@/types/stock-import"
import { asRecord, getErrorData, getStatus } from "./api-error"

export function classifyStockImportError(error: unknown): StockImportFailure {
  const record = asRecord(error) ?? {}
  const data = getErrorData(record)
  const status = getStatus(record)
  const code = typeof data.code_erreur === "string" ? (data.code_erreur as StockImportFailure["code"]) : null
  const message = typeof data.message === "string" && data.message.trim() ? data.message.trim() : null
  if (status === 409 && code === "importation_en_cours") return { kind: "inProgress", status, code, message }
  const kind = status === 0 || status === 429 || status >= 500 ? "retryable" : "rejected"
  return { kind, status, code, message }
}

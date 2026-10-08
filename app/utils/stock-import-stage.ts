import type { StockImportRunState } from "@/types/stock-import"

export type StockImportStage = "setup" | "previewing" | "preview" | "submitting" | "result" | "failed"
export type StockImportData = "preview" | "result" | "failure"

/** A stage that renders a payload needs it; without it the dialog falls back to the setup form. */
const STAGES: Record<StockImportRunState, { stage: StockImportStage; needs: StockImportData | null }> = {
  idle: { stage: "setup", needs: null },
  previewing: { stage: "previewing", needs: null },
  submitting: { stage: "submitting", needs: null },
  preview: { stage: "preview", needs: "preview" },
  result: { stage: "result", needs: "result" },
  failed: { stage: "failed", needs: "failure" },
}

export function stockImportStage(
  state: StockImportRunState,
  present: Record<StockImportData, boolean>,
): StockImportStage {
  const { stage, needs } = STAGES[state]
  return needs === null || present[needs] ? stage : "setup"
}

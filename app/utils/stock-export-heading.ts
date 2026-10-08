import type { Heading } from "@/utils/stock-import-heading"
import { exportVolume } from "./stock-export"

export interface StockExportHeadingInput {
  pending: boolean
  failed: boolean
  total: number | null
}

const BY_VOLUME: Partial<Record<ReturnType<typeof exportVolume>, string>> = {
  empty: "empty",
  blocked: "blocked",
  split: "split",
}

/** The export modal's title and subtitle follow its state: ready, working, failed, or a problem with the count. */
export function stockExportHeading({ pending, failed, total }: StockExportHeadingInput): Heading {
  if (pending) return { id: "pending", params: {} }
  if (failed) return { id: "failed", params: {} }
  return { id: BY_VOLUME[exportVolume(total)] ?? "ready", params: {} }
}

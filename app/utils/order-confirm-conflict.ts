import type { CommandeLigneEquipe } from "@/types/api/commandes"
import { asRecord, getErrorData, getStatus } from "./api-error"

export interface ConfirmConflictLine {
  slug: string
  motif: string
}

export type ConfirmConflict =
  | { kind: "stock"; lignes: ConfirmConflictLine[] }
  | { kind: "drift"; totalPrecedent: number; totalPropose: number }

/** slug -> product name, from the lines the operator is already looking at. */
export function productNamesBySlug(lignes: readonly Pick<CommandeLigneEquipe, "slug" | "nomCapture">[]) {
  return Object.fromEntries(lignes.map(line => [line.slug, line.nomCapture]))
}

function parseLine(line: unknown): ConfirmConflictLine[] {
  const item = asRecord(line)
  if (typeof item?.slug !== "string") return []
  return [{ slug: item.slug, motif: typeof item.motif === "string" ? item.motif : "" }]
}

function parseStock(lignes: unknown[]): ConfirmConflict | undefined {
  const parsed = lignes.flatMap(parseLine)
  return parsed.length ? { kind: "stock", lignes: parsed } : undefined
}

function parseDrift(data: Record<string, unknown>): ConfirmConflict | undefined {
  const { totalPrecedent, totalPropose } = data
  if (typeof totalPrecedent !== "number" || typeof totalPropose !== "number") return undefined
  return { kind: "drift", totalPrecedent, totalPropose }
}

/**
 * `/confirmer` answers 409 for three different reasons and only two of them
 * carry data the operator can act on: unavailable lines, or a price drift that
 * sent the order back to `soumise`. Anything else stays a plain error.
 */
export function parseConfirmConflict(error: unknown): ConfirmConflict | undefined {
  const record = asRecord(error)
  if (!record || getStatus(record) !== 409) return undefined

  const data = getErrorData(record)
  return Array.isArray(data.lignes) ? parseStock(data.lignes) : parseDrift(data)
}

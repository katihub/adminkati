/** A rate in basis points shown as a French percentage: 1000 → "10", 750 → "7,5". */
export const percentFromBps = (bps: number) => (bps / 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })

/** Basis points from a typed percentage ("7,5" or "7.5"), or null when it is not a rate from 0 to 100. */
export function bpsFromPercent(text: string): number | null {
  const trimmed = text.trim()
  const value = Number(trimmed.replace(",", "."))
  if (!trimmed || !Number.isFinite(value) || value < 0 || value > 100) return null
  return Math.round(value * 100)
}

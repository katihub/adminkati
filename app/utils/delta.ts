export type SensDelta = "hausse" | "baisse" | "stable"

function sensDe(courant: number, precedent: number | null): SensDelta {
  if (precedent === null) return "stable"
  if (courant > precedent) return "hausse"
  if (courant < precedent) return "baisse"
  return "stable"
}

/**
 * `pct` is null whenever there is no baseline to divide by — including when both
 * figures are 0. `+∞ %` and a fabricated `+100 %` are both lies, so the pill
 * renders `—` instead. The direction still holds without a baseline, so only the
 * percentage is withheld.
 *
 * Dividing by `Math.abs(precedent)` rather than `precedent` is what keeps a fall
 * from a negative baseline reading as a fall.
 */
export function computeDelta(courant: number, precedent: number | null): { pct: number | null; sens: SensDelta } {
  return {
    pct: precedent === null || precedent === 0 ? null : ((courant - precedent) / Math.abs(precedent)) * 100,
    sens: sensDe(courant, precedent),
  }
}

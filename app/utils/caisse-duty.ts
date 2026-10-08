/**
 * Mirrors `caisse.service.ts`'s separation-of-duties rules so the Count/Validate buttons can be
 * disabled before the request round-trips, not just after a 403. This duplicates backend business
 * logic — a future change to `compter`/`valider`'s guard needs a matching edit here.
 */

interface CountGuardCaisse {
  porteurId: string
}
interface ValidateGuardCaisse {
  porteurId: string
}
interface ValidateReasonCaisse extends ValidateGuardCaisse {
  statut: string
  ecarts: unknown[]
}

/** `compter`: the porteur may not count their own caisse. */
export function canCountCaisse(caisse: CountGuardCaisse, membreId: string): boolean {
  return caisse.porteurId !== membreId
}

export function countDisabledReason(caisse: CountGuardCaisse, membreId: string): string | null {
  return canCountCaisse(caisse, membreId) ? null : "caisse.duty.cannotCountOwn"
}

/**
 * `valider`: A SECOND PAIR OF EYES, NOT A THIRD.
 *
 * The rule used to want three distinct people — whoever carried the money,
 * whoever counted it, whoever validated. A counter held by one seller, plus
 * direction, makes two: with a perimeter in place the day could not be closed
 * at all, and a till nobody can close stays open, which is worse than what the
 * third pair of eyes protected. What remains is the heart of it — whoever
 * carried the money does not examine it. Whoever counted may now validate
 * (`caisse_porteur_ne_valide_pas` in the backend).
 */
export function canValidateCaisse(caisse: ValidateGuardCaisse, membreId: string): boolean {
  return caisse.porteurId !== membreId
}

/**
 * `valider`: a `litige` caisse with no named `ecartCaisse` row is refused regardless of who
 *  asks (`SEUIL_ECART_A_NOMMER` in `caisse.service.ts`) — a data gap, not a duty one.
 */
export function needsNamedDiscrepancy(caisse: { statut: string; ecarts: unknown[] }): boolean {
  return caisse.statut === "litige" && caisse.ecarts.length === 0
}

export function validateDisabledReason(caisse: ValidateReasonCaisse, membreId: string): string | null {
  if (needsNamedDiscrepancy(caisse)) return "caisse.duty.needsDiscrepancyFirst"
  if (caisse.porteurId === membreId) return "caisse.duty.cannotValidateOwn"
  return null
}

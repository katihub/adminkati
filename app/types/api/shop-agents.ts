/** A shop's courier or counter employee, verified by KatiHub before its first delivery. */
export interface ShopAgent {
  id: string
  nom: string
  telephone: string
  /** Asked when the shop creates the agent (since 22 October 2026); null for older agents. */
  courriel?: string | null
  /** The ID card or passport number, when the shop gave it. */
  numeroPieceIdentite?: string | null
  actif: boolean
  verifieLe: string | null
  /** The cash the agent may hold; `null` falls back to the city's ceiling. */
  plafondEspecesFcfa: number | null
  desactiveLe: string | null
  creeLe: string
  boutique: { id: string; nom: string; ville: string | null } | null
}

export type ShopAgentFilter = "a_verifier" | "tous"

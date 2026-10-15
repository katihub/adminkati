/** A shop's courier or counter employee, verified by KatiHub before its first delivery. */
export interface ShopAgent {
  id: string
  nom: string
  telephone: string
  actif: boolean
  verifieLe: string | null
  /** The cash the agent may hold; `null` falls back to the city's ceiling. */
  plafondEspecesFcfa: number | null
  desactiveLe: string | null
  creeLe: string
  boutique: { id: string; nom: string; ville: string | null } | null
}

export type ShopAgentFilter = "a_verifier" | "tous"

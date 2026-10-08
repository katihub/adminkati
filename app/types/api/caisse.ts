export type StatutRemiseCaisse = "ouverte" | "comptee" | "litige" | "validee"

export interface CaisseEcart {
  id: string
  remiseCaisseId: string
  montant: number
  motif: string
  commentaire: string | null
  arbitrePar: string
  creeLe: string
}

export interface CaisseEncaissement {
  id: string
  commandeId: string
  montant: number
  moyen: string
  lieu: string
  encaissePar: string
  remiseCaisseId: string | null
  note: string | null
  creeLe: string
  commande?: { reference: string }
}

interface CaisseRecordBase {
  id: string
  porteurId: string
  journee: string
  statut: StatutRemiseCaisse
  montantAttendu: number
  montantCompte: number | null
  ecart: number | null
  compteePar: string | null
  compteeLe: string | null
  valideePar: string | null
  valideeLe: string | null
  note: string | null
  creeLe: string
}

/** Mirrors `src/caisse/caisse.service.ts:299-305` in NowTech-backend-. */
export interface CaisseListItem extends CaisseRecordBase {
  ecarts: CaisseEcart[]
  _count: { encaissements: number }
}

/** Mirrors `src/caisse/caisse.service.ts:309-326` in NowTech-backend-. */
export interface CaisseDetail extends CaisseRecordBase {
  ecarts: CaisseEcart[]
  encaissements: CaisseEncaissement[]
}

/** Mirrors the bare `remiseCaisse.update` returned by `compter` and `valider`. */
export interface CaisseMutationResult extends CaisseRecordBase {}

export interface CaisseEncours {
  porteurId: string
  _sum: { montantAttendu: number | null }
  _count: { _all: number }
}

export interface CaisseCountInput {
  montantCompte: number
  note?: string
}
export interface CaisseDiscrepancyInput {
  montant: number
  motif: string
  commentaire?: string
}
export interface CaisseCountResult extends CaisseMutationResult {}
export interface CaisseDiscrepancyResult extends CaisseEcart {}
export interface CaisseValidationResult extends CaisseMutationResult {
  /** Present only when the already-validated branch returns its loaded ecarts. */
  ecarts?: CaisseEcart[]
}

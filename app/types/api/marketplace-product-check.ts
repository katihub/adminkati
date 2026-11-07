/** A product a shop published or changed without validation, waiting for the team's check (7 November 2026). */
export type ProductCheckStatus = "actif" | "suspendu"

export interface ProductCheckOffer {
  id: string
  titre: string | null
  libelleVariante: string | null
  prixFcfa: number | null
}

export interface ProductCheckItem {
  id: string
  nom: string
  slug: string
  marque: string | null
  categorie: string | null
  statut: ProductCheckStatus
  descriptionCourte: string | null
  motifDecision: string | null
  aControlerDepuis: string
  creeLe: string
  /** Published when created (true), or changed afterwards (false). */
  nouveau: boolean
  proposeParBoutique: { id: string; nom: string; slug: string }
  images: Array<{ id: string; url: string; texteAlternatif: string | null }>
  offres: ProductCheckOffer[]
}

export type ProductCheckAction = "seen" | "hide" | "restore" | "correction" | "delete"

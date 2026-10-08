/** Mirrors `src/catalogue/catalogue.service.ts:202-221` in NowTech-backend-. */
export interface CatalogueIngestionState {
  genereLe: string
  ingereLe: string
  nombreProduits: number
  nombreCategories: number
  devise: string
  prixNuls: number
  ruptures: number
}

/** Mirrors `src/catalogue/administration.dto.ts:152-160` in NowTech-backend-. */
export interface CatalogueProposalQuery {
  statut?: "en_attente" | "acceptee" | "refusee" | "toutes"
  page?: number
  taille?: number
}

export type CatalogueProposalType = "creation" | "modification" | "disparition"
export type CatalogueProposalStatus = "en_attente" | "acceptee" | "refusee"

export interface CatalogueProposalChange {
  avant: unknown
  apres: unknown
}

/** Mirrors `src/catalogue/administration.service.ts:685-706` in NowTech-backend-. */
export interface CatalogueProposal {
  id: number
  lot_id: number | null
  type: CatalogueProposalType
  produit_id: number
  slug: string
  nom: string
  champs: Record<string, CatalogueProposalChange | null>
  statut: CatalogueProposalStatus
  detectee_le: string
  decidee_le: string | null
  decidee_par: string | null
  motif: string | null
}

export interface CatalogueProposalList {
  total: number
  page: number
  taille: number
  propositions: CatalogueProposal[]
}

export interface ProposalDecisionResult {
  id: number
  statut: CatalogueProposalStatus
  produitId?: number
}

export interface ProposalRefusalInput {
  motif: string
}

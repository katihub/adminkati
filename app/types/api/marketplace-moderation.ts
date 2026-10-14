export type SellerVerificationStatus =
  | "brouillon"
  | "soumis"
  | "en_verification"
  | "approuve"
  | "modification_demandee"
  | "refuse"

export type SellerStatus = "inactif" | "actif" | "sous_surveillance" | "suspendu" | "exclu"
export type SellerDocumentStatus = "soumis" | "en_verification" | "valide" | "refuse" | "expire"

export interface SellerShopSummary {
  id: string
  nom: string
  slug: string
  statut: string
}

export interface SellerReviewListItem {
  id: string
  type: string
  nomLegal: string
  niu: string | null
  rccm: string | null
  statutVerification: SellerVerificationStatus
  statut: SellerStatus
  commissionBps: number
  motifStatut: string | null
  creeLe: string
  boutiques: SellerShopSummary[]
}

export interface SellerDocument {
  id: string
  type: string
  statut: SellerDocumentStatus
  expireLe: string | null
  motifDecision: string | null
  decideLe: string | null
  creeLe: string
}

export interface SellerReviewDetail extends SellerReviewListItem {
  documents: SellerDocument[]
  boutiques: Array<
    SellerShopSummary & {
      membres: Array<{ id: string; courriel: string; nom: string; roles: string[]; actif: boolean }>
    }
  >
}

export interface SellerReviewPage {
  total: number
  page: number
  taille: number
  pages: number
  elements: SellerReviewListItem[]
}

export interface SellerReviewFilters {
  q?: string
  statut?: SellerStatus
  verification?: SellerVerificationStatus
  page?: number
  taille?: number
}

export interface MarketplaceProductReview {
  id: string
  slug: string
  nom: string
  description: string | null
  marque: string | null
  categorie: string | null
  statut: string
  motifDecision: string | null
  creeLe: string
  proposeParBoutique: { id: string; nom: string; slug: string; vendeurId: string } | null
}

export interface MarketplaceOfferReview {
  id: string
  numero: number
  statut: string
  titre: string
  description: string | null
  prixFcfa: number
  prixReferenceFcfa: number | null
  etat: string
  garantieMois: number
  modesLivraison: string[]
  villesLivraison: string[]
  delaiMaxJours: number
  motifDecision: string | null
  soumisLe: string
  /** The variant name the customer will see ("128 Go / Noir"); null for a plain offer. */
  libelleVariante?: string | null
  attributsVariante?: Record<string, string> | null
  offre: {
    id: string
    referenceVendeur: string
    produit: { id: string; nom: string; slug: string }
    boutique: { id: string; nom: string; slug: string; vendeurId: string }
  }
}

export interface MarketplaceContentImage {
  id: string
  url: string
  texteAlternatif: string | null
  ordre: number
  statut: "proposee" | "publiee" | "retiree"
  typeMime: string
  tailleOctets: number
  creeLe: string
}

/** A product sheet change (photos and SEO) proposed by the shop that owns the product. */
export interface MarketplaceContentReview {
  id: string
  numero: number
  statut: string
  metaTitre: string | null
  metaDescription: string | null
  soumisLe: string
  motifDecision: string | null
  produit: { id: string; nom: string; slug: string; metaTitre: string | null; metaDescription: string | null }
  boutique: { id: string; nom: string } | null
  /** The gallery in its proposed order; `image` is null if the file disappeared since. */
  images: Array<{ imageId: string; texteAlternatif: string | null; image: MarketplaceContentImage | null }>
}

export type SellerVerificationStatus =
  | "brouillon"
  | "soumis"
  | "en_verification"
  | "approuve"
  | "modification_demandee"
  | "refuse"
  /** Withdrawn by the team (10 November 2026): out of the list, name and e-mail freed. */
  | "retiree"

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
  /** Set by the backend since 12 November 2026; absent from an older backend. */
  approuveLe?: string | null
  derniereSoumissionLe?: string | null
  /** A document was uploaded while the file awaited changes: the team sees it was completed. */
  resoumis?: boolean
  nombrePieces?: number
  piecesAVerifier?: number
}

export interface SellerDocument {
  id: string
  type: string
  statut: SellerDocumentStatus
  expireLe: string | null
  motifDecision: string | null
  decideLe: string | null
  creeLe: string
  /** Set when the merchant uploaded the file from their space; null for key-based legacy documents. */
  nomFichier?: string | null
  typeMime?: string | null
  tailleOctets?: number | null
  statutAnalyse?: "non_analysee" | "en_quarantaine" | "saine" | "infectee"
}

export interface SellerReviewDetail extends SellerReviewListItem {
  /** Given by an individual seller at signup (5 November 2026); null for a company and for older sellers. */
  dateNaissance?: string | null
  lieuNaissance?: string | null
  villeResidence?: string | null
  quartierResidence?: string | null
  /** A supplier or sponsor who can vouch for the seller: optional, for any seller. */
  parrainNom?: string | null
  parrainTelephone?: string | null
  reputations?: Array<{ scoreRisque: number; tauxLitigeBps: number; creeLe: string }>
  /** The required documents, by the same rule as the seller space (12 November 2026). */
  exigences?: SellerFileRequirement[]
  piecesManquantes?: number
  /** The file's history, read from the audit journal, most recent first. */
  historique?: SellerFileEvent[]
  sanctions?: Array<{ id: string; type: string; statut: string; motif: string; commenceLe: string }>
  documents: SellerDocument[]
  boutiques: Array<
    SellerShopSummary & {
      description?: string | null
      ville?: string | null
      villesLivraison?: string[]
      modesLivraison?: string[]
      adresseRetrait?: string | null
      /** Published without moderation; the direction can remove them. */
      logoUrl?: string | null
      banniereUrl?: string | null
      telephone?: string | null
      gestionSav?: "boutique" | "kati_service"
      suiviStock?: boolean
      pointFocal?: { id: string; nom: string } | null
      _count?: { offres: number }
      /** The phone each member gave, the owner's at signup; returned to the team only. */
      membres: Array<{
        id: string
        courriel: string
        nom: string
        telephone?: string | null
        roles: string[]
        actif: boolean
      }>
    }
  >
}

export interface SellerReviewPage {
  total: number
  page: number
  taille: number
  pages: number
  elements: SellerReviewListItem[]
  /** How many files each tab holds, for the current search (12 November 2026). */
  compteurs?: Partial<Record<SellerApplicationTab, number>>
}

export type SellerApplicationTab = "a_traiter" | "attente_vendeur" | "sans_piece" | "valides" | "refuses" | "retires"

export type SellerRequirementState = "valide" | "en_attente" | "refuse" | "expire" | "manquant"

export interface SellerFileRequirement {
  type: string
  libelle: string
  aide: string
  obligatoire: boolean
  multiple: boolean
  etat: SellerRequirementState
  motif: string | null
  nombre: number
}

export interface SellerFileEvent {
  action: string
  le: string
  acteur: string
  par: string | null
  typePiece: string | null
  motif: string | null
}

export interface SellerReviewFilters {
  q?: string
  statut?: SellerStatus
  verification?: SellerVerificationStatus
  onglet?: SellerApplicationTab
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
  descriptionCourte?: string | null
  ficheTechnique?: string | null
  ficheTechniquePdfUrl?: string | null
  proposeParBoutique: { id: string; nom: string; slug: string; vendeurId: string } | null
  /** The photos the shop sent (proposed) or already public; approving the product publishes them. */
  images?: ModerationImage[]
  revisionsContenu?: Array<{ id: string; statut: string }>
}

export interface ModerationImage {
  id: string
  url: string
  texteAlternatif: string | null
  statut: "proposee" | "publiee"
}

/** What a one-click approval returns: the approved ids, and each refusal with its reason. */
export interface ModerationBatchResult {
  approuves: string[]
  echecs: Array<{ id: string; message: string }>
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
  /** MOQ: the smallest quantity a customer may order or request in a quote. */
  quantiteMinimale?: number
  motifDecision: string | null
  soumisLe: string
  /** The variant name the customer will see ("128 Go / Noir"); null for a plain offer. */
  libelleVariante?: string | null
  attributsVariante?: Record<string, string> | null
  offre: {
    id: string
    referenceVendeur: string
    produit: { id: string; nom: string; slug: string; images?: ModerationImage[] }
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
  descriptionCourte?: string | null
  ficheTechnique?: string | null
  ficheTechniquePdfUrl?: string | null
  /** Proposed with the complete product sheet (6 November 2026); null: unchanged. */
  nom?: string | null
  marque?: string | null
  description?: string | null
  soumisLe: string
  motifDecision: string | null
  produit: {
    id: string
    nom: string
    slug: string
    marque?: string | null
    description?: string | null
    metaTitre: string | null
    metaDescription: string | null
    descriptionCourte?: string | null
    ficheTechnique?: string | null
    ficheTechniquePdfUrl?: string | null
  }
  boutique: { id: string; nom: string } | null
  /** The gallery in its proposed order; `image` is null if the file disappeared since. */
  images: Array<{ imageId: string; texteAlternatif: string | null; image: MarketplaceContentImage | null }>
}

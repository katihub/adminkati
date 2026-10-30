/** BackendKati/src/marketplace/produits-administration.service.ts:23 — liste administrative marketplace. */
export interface AdminMarketplaceProductSummary {
  id: string
  nom: string
  slug: string
  marque: string | null
  categorie: string | null
  statut: string
  image: string | null
  offres: number
  modifieLe: string
}
/** BackendKati/src/marketplace/produits-administration.service.ts:42 — pagination. */
export interface CataloguePagination {
  page: number
  taille: number
  total: number
  pages: number
}
/** BackendKati/src/marketplace/produits-administration.dto.ts:7. */
export interface MarketplaceProductFilters {
  recherche?: string
  categorieId?: string
  statut?: string
  page?: number
  taille?: number
}
/** BackendKati/src/marketplace/produits-administration.service.ts:41. */
export interface AdminMarketplaceProductsPage {
  elements: AdminMarketplaceProductSummary[]
  pagination: CataloguePagination
}
/** BackendKati/src/marketplace/produits-administration.service.ts:50 — offres liees sans données privées vendeur. */
export interface LinkedMarketplaceOffer {
  id: string
  titre: string | null
  referenceVendeur: string
  libelleVariante: string | null
  statut: string
  prixFcfa: number | null
  quantiteMinimale: number
  garantieMois: number | null
  delaiMaxJours: number | null
  boutique: { id: string; nom: string; slug?: string; vendeurId: string; suiviStock: boolean }
  stock: { quantite: number; quantiteReservee: number } | null
}
/** BackendKati/src/marketplace/produits-administration.service.ts:11 — contenu commun, jamais les clés de stockage. */
export interface AdminMarketplaceProduct extends Omit<AdminMarketplaceProductSummary, "offres" | "image"> {
  categorieId: string | null
  description: string | null
  descriptionCourte: string | null
  ficheTechnique: string | null
  ficheTechniquePdfUrl: string | null
  metaTitre: string | null
  metaDescription: string | null
  images: Array<{ id: string; url: string; texteAlternatif: string; ordre: number }>
  offres: LinkedMarketplaceOffer[]
}
/** BackendKati/src/marketplace/produits-administration.service.ts:58 — historique des corrections (projection). */
export interface CatalogueHistoryEntry {
  id: string
  action: string
  creeLe: string
  acteurRole: string | null
  detail: { motif?: string; avant?: Record<string, unknown>; apres?: Record<string, unknown> } | null
}
/** BackendKati/src/marketplace/produits-administration.service.ts:62. */
export interface AdminMarketplaceProductDetail {
  produit: AdminMarketplaceProduct
  historique: CatalogueHistoryEntry[]
  peutLireOffres: boolean
}
/** BackendKati/src/marketplace/corrections-offres-administration.service.ts:15. */
export interface AdminMarketplaceOfferDetail {
  offre: LinkedMarketplaceOffer & {
    produitId: string
    prixReferenceFcfa: number | null
    modifieLe: string
    description: string | null
    etat: string | null
    modesLivraison: string[]
    villesLivraison: string[]
    produit: { id: string; nom: string; slug: string }
    revisions: Array<{
      id: string
      numero: number
      statut: string
      soumisLe: string
      decideLe: string | null
      motifDecision: string | null
    }>
  }
  historique: CatalogueHistoryEntry[]
}
/** BackendKati/src/marketplace/produits-administration.dto.ts:24. */
export interface MarketplaceProductCorrection {
  nom: string
  marque: string | null
  description: string | null
  descriptionCourte: string | null
  ficheTechnique: string | null
  categorieId: string
  modifieLe: string
  motif: string
}
/** BackendKati/src/marketplace/produits-administration.dto.ts:50. */
export interface MarketplaceOfferCorrection {
  prixFcfa: number
  prixReferenceFcfa: number | null
  quantiteMinimale: number
  garantieMois: number
  delaiMaxJours: number
  modifieLe: string
  motif: string
}

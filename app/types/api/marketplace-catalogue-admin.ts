/** `GET /v1/marketplace/administration/offres`: every offer of every shop, for the direction. */
export type MarketplaceOfferStatus = "brouillon" | "publiee" | "suspendue" | "archivee"
export type MarketplaceOfferStockLevel = "rupture" | "faible" | "disponible"
export type MarketplaceOfferSort = "recent" | "boutique" | "nom" | "prix_asc" | "prix_desc" | "stock_asc" | "stock_desc"

export interface MarketplaceOfferFilters {
  recherche?: string
  boutiqueId?: string
  produitId?: string
  statut?: MarketplaceOfferStatus
  categorieId?: string
  stock?: MarketplaceOfferStockLevel
  tri?: MarketplaceOfferSort
  page?: number
  taille?: number
}

export interface MarketplaceAdminOffer {
  id: string
  referenceVendeur: string
  statut: MarketplaceOfferStatus
  titre: string | null
  libelleVariante: string | null
  prixFcfa: number | null
  prixReferenceFcfa: number | null
  quantiteMinimale: number
  publieLe: string | null
  creeLe: string
  verifieParKatiLe: string | null
  produit: {
    id: string
    nom: string
    slug: string
    statut: string
    marque: string | null
    categorie: string | null
    image: string | null
  }
  boutique: {
    id: string
    nom: string
    slug: string
    statut: string
    suiviStock: boolean
    vendeurId?: string
    vendeur: { nomLegal: string; statut: string }
  }
  /** Set by the team: anything but `en_stock` takes the offer off sale (`disponible` is then 0). */
  statutStock?: "en_stock" | "rupture" | "reapprovisionnement"
  /** `disponible` is null when the shop does not track its stock: it always sells. */
  stock: { suivi: boolean; quantite: number; reservee: number; disponible: number | null }
}

export interface MarketplaceAdminOfferPage {
  elements: MarketplaceAdminOffer[]
  pagination: { page: number; taille: number; total: number; pages: number }
  /** Platform-wide count per status, independent of the filters. */
  compteurs: Partial<Record<MarketplaceOfferStatus, number>>
  boutiques: Array<{ id: string; nom: string; offres: number }>
}

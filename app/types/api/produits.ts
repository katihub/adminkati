import type { DelaiLivraison } from "@/types/api/delais-livraison"
import type { InventaireProduit, StatutStock } from "@/types/api/inventaire"

/** Mirrors `src/catalogue/administration.service.ts:146-168` in NowTech-backend-. */
export interface ProductListItem {
  id: number
  slug: string
  nom: string
  prix: number
  prix_reference: number | null
  remise_pct: number | null
  /**
   * LA FENÊTRE DE LA PROMOTION, en ISO-8601. `promo_debut` nul veut dire
   * « déjà commencée », `promo_fin` nul « sans terme » — un déstockage
   * permanent est légitime, et imposer une date forcerait à en inventer une.
   */
  promo_debut?: string | null
  promo_fin?: string | null
  /** @deprecated Derived by the backend from `statut_stock`; read `statut_stock` instead. */
  en_stock?: boolean
  quantite_stock: number
  statut_stock: StatutStock
  marque: string | null
  categorie_principale_id: number | null
  retire_le: string | null
  categorie: string | null
  rayon: string | null
  image: string | null
}

/** Mirrors `src/catalogue/administration.service.ts:161-168` in NowTech-backend-. */
export interface ProductListResponse {
  total: number
  page: number
  taille: number
  pages: number
  produits: ProductListItem[]
}

/** Mirrors `src/catalogue/administration.service.ts:190-194` in NowTech-backend-. */
export interface ProductImage {
  rang: number
  url: string
  chemin_local: string | null
  octets: number | null
  alt: string | null
}

/** Mirrors `src/catalogue/administration.service.ts:195-200` in NowTech-backend-. */
export interface ProductCategory {
  id: number
  nom: string
  slug: string
  rayon: string | null
}

export type ProductHistoryType = "creation" | "modification" | "disparition"

/** Mirrors `src/catalogue/administration.service.ts:216-223` in NowTech-backend-. */
export interface ProductHistoryEntry {
  id: number
  lot_id: number | null
  type: ProductHistoryType
  statut: string
  champs: Record<string, { avant: unknown; apres: unknown } | null>
  detectee_le: string
  decidee_le: string | null
  decidee_par: string | null
  motif: string | null
}

/** Mirrors `src/catalogue/administration.service.ts:210-266` in NowTech-backend-. */
export interface ProductDetail extends Omit<ProductListItem, "categorie" | "image"> {
  nom_source: string | null
  ajoute_le: string | null
  url_source: string | null
  caracteristiques: string[]
  description: string | null
  fiche_technique: string | null
  inventaire: InventaireProduit
  categorie_nom: string | null
  images: ProductImage[]
  categories: ProductCategory[]
  historique: ProductHistoryEntry[]
  /**
   * The manufacturer's datasheet. `fiche_pdf` is the STORAGE PATH, not a URL —
   * the admin projection hands back the object key while the public catalogue
   * route resolves it. The panel therefore shows presence, name and weight,
   * and leaves the public page to serve the download.
   */
  fiche_pdf: string | null
  fiche_pdf_nom: string | null
  fiche_pdf_octets: number | null
  /**
   * Raw stored value: `null` means "inherits the default option". Optional so a payload from a
   * backend that predates delivery intervals still satisfies the type.
   */
  delai_livraison_id?: number | null
  /** The option resolved with the default applied. */
  delai_livraison?: DelaiLivraison
}

export interface TaxonomieRayon {
  id: string
  slug: string
  nom: string
  nom_court: string
  compte_total: number
}

export interface TaxonomieCategorie {
  id: number
  nom: string
  slug: string
  parent_id: number | null
  niveau: number
  rayon: string | null
  compte_total: number
  masquee: boolean
}

export interface TaxonomieMarque {
  nom: string
  slug: string
  nombre_produits: number
  logo_url: string | null
}

// GET /catalogue/administration/taxonomie — ../NowTech-backend-/src/catalogue/administration.service.ts:395-409
export interface Taxonomie {
  rayons: TaxonomieRayon[]
  categories: TaxonomieCategorie[]
  marques: TaxonomieMarque[]
}

/** Mirrors `src/catalogue/administration.dto.ts:45-80` in NowTech-backend-. */
export interface ProductListQuery {
  q?: string
  rayon?: string
  categorie?: number
  marque?: string
  stock?: "tous" | "en-stock" | "rupture" | "reapprovisionnement"
  etat?: "actifs" | "retires" | "tous"
  tri?: "recent" | "nom" | "prix-croissant" | "prix-decroissant"
  page?: number
  taille?: number
}

export type WarrantyUnit = "mois" | "annees"

/** The warranty that applies to a node: its own, or its parent's when `heritee`. */
export interface CategoryWarranty {
  mois: number
  unite: WarrantyUnit
  heritee: boolean
  libelle: string
}

export interface MarketplaceSubcategory {
  id: string
  nom: string
  slug: string
  parentId: string
  garantieMinimaleMois: number | null
  uniteGarantie: WarrantyUnit
  ordre: number
  active: boolean
  produits: number
  garantie: CategoryWarranty
  /** The variant attributes offered to the category's products; empty on a sub-category means inherited. */
  attributsVariante: string[]
}

export interface MarketplaceCategory extends Omit<MarketplaceSubcategory, "parentId"> {
  parentId: null
  sousCategories: MarketplaceSubcategory[]
}

export interface CategoryWarrantyInput {
  valeur: number
  unite: WarrantyUnit
}

export interface CreateCategoryInput {
  nom: string
  parentId?: string
  garantie?: CategoryWarrantyInput
  ordre?: number
  attributsVariante?: string[]
}

export interface UpdateCategoryInput {
  nom?: string
  /** `null` on a sub-category: inherit the parent's warranty again. */
  garantie?: CategoryWarrantyInput | null
  ordre?: number
  active?: boolean
  attributsVariante?: string[]
}

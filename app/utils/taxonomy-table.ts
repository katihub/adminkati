import type { Marque, Rayon } from "@/types/api/taxonomie"

export type FlatTaxonomySortKey = "nom" | "nom_court" | "compte_total"
export interface FlatTaxonomySort {
  key: FlatTaxonomySortKey
  direction: "asc" | "desc"
}

export type BrandSortKey = "nom" | "slug" | "nombre_produits"
export interface BrandSort {
  key: BrandSortKey
  direction: "asc" | "desc"
}

export function sortDepartments(departments: Rayon[], sort: FlatTaxonomySort): Rayon[] {
  return [...departments].sort((left, right) => {
    const comparison =
      sort.key === "compte_total"
        ? left.compte_total - right.compte_total
        : (left[sort.key] ?? "").localeCompare(right[sort.key] ?? "", undefined, { sensitivity: "base" })
    if (comparison !== 0) return sort.direction === "asc" ? comparison : -comparison
    return left.id.localeCompare(right.id)
  })
}

export function sortBrands(brands: Marque[], sort: BrandSort): Marque[] {
  return [...brands].sort((left, right) => {
    const comparison =
      sort.key === "nombre_produits"
        ? left.nombre_produits - right.nombre_produits
        : left[sort.key].localeCompare(right[sort.key], undefined, { sensitivity: "base" })
    if (comparison !== 0) return sort.direction === "asc" ? comparison : -comparison
    return left.slug.localeCompare(right.slug)
  })
}

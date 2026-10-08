import type { ProductDetail } from "@/types/api/produits"

type Current<K extends keyof ProductDetail> = Pick<ProductDetail, K> | null

export function deriveScalarValues(current: Current<"nom" | "marque" | "url_source">) {
  return {
    nom: current?.nom ?? "",
    marque: current?.marque ?? null,
    url_source: current?.url_source ?? "",
  }
}

export function deriveDescriptionValues(current: Current<"description" | "fiche_technique">) {
  return {
    description: current?.description ?? "",
    fiche_technique: current?.fiche_technique ?? "",
  }
}

export function deriveDeliveryValues(current: Current<"delai_livraison_id">) {
  return { delai_livraison_id: current?.delai_livraison_id ?? null }
}

/** Secondary = every category the product carries other than its principal one. */
export function deriveCategoryValues(current: Current<"categorie_principale_id" | "categories">) {
  return {
    categorie_principale_id: current?.categorie_principale_id ?? null,
    categories_ids: current
      ? current.categories
          .filter(category => category.id !== current.categorie_principale_id)
          .map(category => category.id)
      : [],
  }
}

export function deriveListValues(current: Current<"caracteristiques" | "images">) {
  return {
    caracteristiques: current ? [...current.caracteristiques] : [],
    images: current ? [...current.images] : [],
  }
}

/** `2026-09-30T23:00:00.000Z` -> `2026-09-30`, pour le champ de saisie. */
function versDateDeChamp(iso: string | null | undefined) {
  if (!iso) return ""
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ""
    : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function derivePromoValues(current: Current<"promo_debut" | "promo_fin">) {
  return { debut: versDateDeChamp(current?.promo_debut), fin: versDateDeChamp(current?.promo_fin) }
}

export function deriveNumericValues(current: Current<"prix" | "prix_reference" | "remise_pct">) {
  return {
    prix: current ? String(current.prix) : "",
    prix_reference: current?.prix_reference != null ? String(current.prix_reference) : "",
    remise_pct: current?.remise_pct != null ? String(current.remise_pct) : "",
  }
}

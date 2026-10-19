export type ProductImportRowStatus = "pret" | "cree" | "echec"

export interface ProductImportRow {
  ligne: number
  nom: string
  prix_saisi: string
  slug: string | null
  categorie_id: number | null
  statut: ProductImportRowStatus
  produit_id: number | null
  code_erreur: string | null
  message: string | null
}

export interface ProductImportResponse {
  apercu: boolean
  total_lignes: number
  pretes: number
  creees: number
  echouees: number
  lignes: ProductImportRow[]
}

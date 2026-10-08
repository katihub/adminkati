export type ModeImportStock = "reception" | "count"

export type StatutLigneImport = "applique" | "ignore" | "echec"

/** Mirrors `CODES_ERREUR_LIGNE` in `src/catalogue/stock-import.dto.ts:47-58` in NowTech-backend-. */
export type CodeErreurLigne =
  | "produit_manquant"
  | "produit_introuvable"
  | "produit_en_double"
  | "quantite_invalide"
  | "motif_invalide"
  | "variation_hors_limite"
  | "stock_insuffisant"
  | "stock_trop_eleve"
  | "stock_reference_invalide"
  | "echec_inattendu"

/** Mirrors `CodeErreurFichier` in `src/catalogue/stock-import.parser.ts:29-40` in NowTech-backend-. Nothing was written. */
export type CodeErreurFichier =
  | "fichier_vide"
  | "fichier_trop_volumineux"
  | "format_non_pris_en_charge"
  | "contenu_incoherent"
  | "classeur_invalide"
  | "csv_invalide"
  | "colonnes_manquantes"
  | "aucune_ligne"
  | "trop_de_lignes"
  | "dimensions_excessives"
  | "cellule_trop_longue"

/**
 * The 409 codes of `src/catalogue/stock-import.service.ts:179` (`cle_idempotence_conflit`) and `:196`
 * (`importation_en_cours`) in NowTech-backend-. HTTP 413 (Multer) and the plain 400s carry no `code_erreur`.
 */
export type CodeErreurIdempotence = "cle_idempotence_conflit" | "importation_en_cours"

/**
 * Why a row is `ignore`, mirroring `RaisonIgnore` in `src/catalogue/stock-import.dto.ts:73` in NowTech-backend-:
 * an empty quantity cell ("not touched"), a count already equal to the stock, or a stock that moved since the
 * file was exported.
 */
export type RaisonIgnore = "quantite_vide" | "aucun_ecart" | "stock_modifie"

/**
 * Mirrors `LigneResultatImport` in `src/catalogue/stock-import.dto.ts:75-94` in NowTech-backend-. In a preview
 * (`apercu: true`) `applique` means "would apply" and `stock_apres` is the current stock plus `variation`.
 */
export interface LigneResultatImport {
  /** Physical line (CSV) or sheet row (XLSX), header included. */
  ligne: number
  produit_saisi: string
  quantite_saisie: string
  motif_saisi: string | null
  produit_id: number | null
  produit_nom: string | null
  variation: number | null
  stock_avant: number | null
  stock_apres: number | null
  statut: StatutLigneImport
  /** Non-null exactly when `statut` is `echec`. */
  code_erreur: CodeErreurLigne | null
  /** French detail, at most 500 characters, null unless `statut` is `echec`. */
  message: string | null
  /** `null` unless `statut` is `ignore` (`stock-import.dto.ts:89`). */
  raison_ignore: RaisonIgnore | null
  /** The file's `current_stock` when the row was drift-checked, else `null` (`stock-import.dto.ts:91`). */
  stock_fichier: number | null
  /** `stock_avant` differs from `stock_fichier` (`stock-import.dto.ts:93`). */
  stock_modifie: boolean
}

/**
 * Mirrors `ReponseImportStock` in `src/catalogue/stock-import.dto.ts:96-110` in NowTech-backend-, returned by
 * `POST /v1/catalogue/administration/produits/inventaire/import` (`administration.controller.ts:255-274`).
 * Counts are of rows that WOULD apply when `apercu` is true.
 */
export interface ReponseImportStock {
  /** `null` for a preview: nothing is persisted, so no import exists. */
  importation_id: string | null
  /** `true` when nothing was written; `false` for every real run, replays included. */
  apercu: boolean
  mode: ModeImportStock
  total_lignes: number
  appliquees: number
  ignorees: number
  echouees: number
  /** Effective flag: always `false` in reception (`stock-import.dto.ts:107`). */
  inclure_stock_modifie: boolean
  /** Rows with `stock_modifie`, whatever their `statut` (`stock-import.dto.ts:109`). */
  stock_modifiees: number
  lignes: LigneResultatImport[]
}

/**
 * Mirrors `src/delais-livraison/delais-livraison.service.ts:23` (DelaiLivraison) and
 * `src/delais-livraison/delais-livraison.dto.ts:3` (unit list) in NowTech-backend-.
 * Routes: `src/catalogue/administration.controller.ts:79` (GET), `:90` (POST), `:103` (PATCH).
 * Product fields: `src/catalogue/administration.service.ts:77-78`, body field
 * `src/catalogue/administration.dto.ts:141`.
 */
export type DelaiUnite = "minutes" | "heures" | "jours_ouvres" | "jours" | "semaines" | "mois"

export interface DelaiLivraison {
  id: number
  min_valeur: number
  /** `null` means a single value rather than a range. */
  max_valeur: number | null
  unite: DelaiUnite
  est_defaut: boolean
  actif: boolean
  /** Product count; drives value immutability and the "in use" hint. */
  utilise_par: number
}

export interface DelaiLivraisonInput {
  min_valeur: number
  max_valeur: number | null
  unite: DelaiUnite
}

export interface DelaiLivraisonPatch extends Partial<DelaiLivraisonInput> {
  actif?: boolean
}

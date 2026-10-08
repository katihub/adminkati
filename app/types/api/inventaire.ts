export type StatutStock = "en_stock" | "rupture" | "reapprovisionnement"

/** What the direction can impose: `reapprovisionnement` is a counted-stock state, never a decision. */
export type StatutForce = Exclude<StatutStock, "reapprovisionnement">

/** Mirrors `InventaireProduit` in `src/catalogue/administration/administration.service.ts:63-71` in NowTech-backend-. */
export interface InventaireProduit {
  produit_id: number
  quantite_stock: number
  /** The SELLING status: the direction's decision first, then the stock row, then the catalogue flag. */
  statut_stock: StatutStock
  /** `null` while the product has no stock row yet (`administration.service.ts:816-845`). */
  modifie_le: string | null
  /** The direction's decision, `null` when the count decides. */
  disponibilite_forcee: StatutForce | null
}

export type MouvementStockType =
  | "initialisation"
  | "reception"
  | "correction"
  | "commande_confirmee"
  | "commande_liberee"

/** Mirrors the movement mapping in `administration.service.ts:460-472` in NowTech-backend-. */
export interface MouvementStock {
  id: string
  type: MouvementStockType
  variation: number
  quantite_avant: number
  quantite_apres: number
  motif: string | null
  acteur: { type: "equipe" | "systeme"; id: string | null; role: string | null }
  commande_reference: string | null
  cree_le: string
}

/** Mirrors `lireInventaire()` (`administration.service.ts:443-476`), served by `administration.controller.ts:172-175`. */
export interface InventaireHistorique {
  inventaire: InventaireProduit
  mouvements: MouvementStock[]
  page: number
  taille: number
  pages: number
  total: number
}

/** Mirrors `AjusterStockDto` (`administration.dto.ts:203-212`), POSTed to `administration.controller.ts:183`. */
export interface AjusterStockInput {
  type: "reception" | "correction"
  variation: number
  motif: string
}

/** Mirrors `ChangerStatutStockDto` (`administration.dto.ts:215-218`), PATCHed to `administration.controller.ts:197`. */
export interface ChangerStatutStockInput {
  statut: "rupture" | "reapprovisionnement"
}

/**
 * Mirrors `ChangerDisponibiliteDto` (`administration.dto.ts:248-251`), PATCHed to `administration.controller.ts:303`.
 * `null` takes the decision back so the count decides again.
 */
export interface ChangerDisponibiliteInput {
  disponibilite_forcee: StatutForce | null
}

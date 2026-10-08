/** Mirrors `prisma/schema.prisma:295-301` in the backend. */
export type StatutDevis = "ouvert" | "commande" | "archive"

/** Mirrors `prisma/schema.prisma:350-367` in the backend. */
export interface DevisLigne {
  id: string
  devisId: string
  rang: number
  produitId: number
  slug: string
  nomFige: string
  prixFige: number
  quantite: number
}

/** Mirrors `devis.service.ts:listerPourEquipe()` in the backend. */
export interface DevisListItem {
  id: string
  reference: string
  statut: StatutDevis
  totalTtc: number
  creeLe: string
  clientId: string
  _count: { lignes: number }
}

/** Mirrors `devis.service.ts:lire()` in the backend. */
export interface DevisDetail {
  id: string
  reference: string
  clientId: string
  statut: StatutDevis
  catalogueGenereLe: string | null
  totalTtc: number
  totalHt: number
  tva: number
  tauxTva: string
  commandeId: string | null
  commandeReference: string | null
  creeLe: string
  majLe: string
  lignes: DevisLigne[]
}

/** Mirrors the relevant fields returned by `devis.service.ts:rafraichir()`. */
export interface RefreshQuoteEcart {
  slug: string
  nom: string
  ancien: number
  nouveau: number
  quantite: number
}

/** `aujourdhui` is intentionally omitted because the admin only renders `ecarts`. */
export interface RefreshQuoteResult {
  devis: DevisDetail
  ecarts: RefreshQuoteEcart[]
  inchange: boolean
}

/** Mirrors `devis.service.ts:archiver()`'s selected response. */
export interface ArchiveQuoteResult {
  id: string
  reference: string
  statut: StatutDevis
}

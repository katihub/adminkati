/** Mirrors `src/profil/profil.dto.ts` and `src/profil/profil.service.ts` in the backend. */
export type CustomerStatus = "actif" | "suspendu" | "supprime"
export type CustomerSort = "recent" | "nom"

/** Mirrors `src/profil/profil.dto.ts:145-157` in the backend. */
export interface CustomerDirectoryQuery {
  q?: string
  statut?: CustomerStatus
  tri?: CustomerSort
  page?: number
  taille?: number
}

/** Mirrors `src/profil/profil.service.ts:346-357` in the backend. */
export interface CustomerDirectoryProfile {
  nom: string
  telephone: string
  raisonSociale: string | null
  comptoirPrefere: string
}

/** Mirrors `src/profil/profil.service.ts:346-357` in the backend. */
export interface CustomerDirectoryItem {
  id: string
  statut: CustomerStatus
  /** Set at sign-up, before any fiche exists: often the only way to name a row. */
  courriel: string
  creeLe: string
  dernierAccesLe: string | null
  profil: CustomerDirectoryProfile | null
}

/** Mirrors `src/profil/profil.service.ts:361-363` in the backend. */
export interface CustomerDirectoryPage {
  total: number
  page: number
  taille: number
  pages: number
  elements: CustomerDirectoryItem[]
}

/** Mirrors `prisma/schema.prisma:146-177` in the backend. */
export interface CustomerProfile {
  clientId: string
  nom: string
  telephone: string
  telephoneChiffres: string
  telephoneSecours: string | null
  telephoneSecoursChiffres: string | null
  comptoirPrefere: string
  raisonSociale: string | null
  /** Asked at sign-up since 15 October 2026; null for older accounts. */
  ville?: string | null
  completLe: string | null
  majLe: string
}

/** Mirrors `prisma/schema.prisma:199-215` in the backend. */
export interface CustomerAddress {
  id: string
  clientId: string
  mode: "retrait" | "domicile" | "agence"
  ville: string
  quartier: string | null
  repere: string | null
  telephoneDestinataire: string | null
  comptoir: string | null
  parDefaut: boolean
  archivee: boolean
  creeLe: string
}

/** Mirrors `src/profil/profil.dto.ts:17-22` in the backend. */
export interface CustomerAccountDetail {
  client: {
    id: string
    statut: CustomerStatus
    courriel: string
    creeLe: string
    dernierAccesLe: string | null
  }
  profil: CustomerProfile | null
  adresses: CustomerAddress[]
  complet: boolean
}

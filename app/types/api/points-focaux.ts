/** Mirrors `src/points-focaux/points-focaux.service.ts` in the backend. */
import type { AdresseFigee } from "./commandes"
import type { TeamRole } from "./equipe"

export interface FocalPointMember {
  id: string
  nom: string
  courriel: string
  telephone: string | null
  actif: boolean
  roles: TeamRole[]
  /** How many shops are assigned to this member. */
  boutiques: number
}

export interface FocalPointShop {
  id: string
  nom: string
  slug: string
  ville: string | null
  statut: string
  creeLe: string
  vendeur: { id: string; nomLegal: string; statut: string; statutVerification: string }
  /** Null until the direction assigns the shop; a shop has at most one focal point. */
  pointFocal: { id: string; nom: string; actif: boolean; roles: TeamRole[] } | null
}

export interface FocalPointShopFilters {
  recherche?: string
  /** `sans` for unassigned shops, or a member id for that focal point's shops. */
  pointFocal?: string
  page?: number
}

export interface FocalPointShopsPage {
  total: number
  page: number
  taille: number
  pages: number
  elements: FocalPointShop[]
}

export interface FocalShopOrder {
  id: string
  reference: string
  statut: string
  modeLivraison: string | null
  totalNetProduits: number
  creeLe: string
  expeditions: Array<{ reference: string; statut: string; livreeLe: string | null }>
  lignes: Array<{ produitNomCapture: string; quantite: number; totalNetFcfa: number; quantiteRetournee: number }>
  commande: {
    reference: string
    /** The address frozen at checkout, kept even if the customer archives it. */
    adresseFigee: AdresseFigee | null
    telephoneLivraison: string | null
    client: { courriel: string | null; nom: string | null; telephone: string | null }
  }
}

export interface FocalShopOrdersPage {
  total: number
  page: number
  taille: number
  pages: number
  elements: FocalShopOrder[]
}

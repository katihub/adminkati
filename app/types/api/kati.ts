/** The KATI programme rules, as the direction approves them (rates in basis points). */
export interface KatiRules {
  katiParFcfa: number
  gainClientBps: number
  commissionParrainBps: number
  assiette: "produits" | "produits_et_livraison"
  liberationApresLivraisonJours: number
  parrainageDureeMois: number
  plafondCommissionsMensuelKati: number
  depenseMinimumKati: number
  depensePlafondBps: number
  expirationGainsMois: number
  rechargeActive: boolean
  rechargeMinimumFcfa: number
  rechargeMaximumFcfa: number
}

export interface KatiPolicy {
  id: string
  version: number
  statut: "brouillon" | "approuvee" | "active" | "archivee"
  regles: KatiRules
  effectiveLe: string | null
  termineeLe: string | null
  approuveePar: string | null
  approuveeLe: string | null
  creeLe: string
}

export interface KatiIndicators {
  politiqueVersion: number
  katiParFcfa: number
  kati: { disponible: number; enAttente: number; reserve: number; utilises: number; annules: number; expires: number }
  valeurFcfa: { disponible: number; enAttente: number }
  emisCeMois: { gains: number; commissions: number; ajustements: number; total: number; coutFcfa: number }
  commissionsEnRevue: number
  parrainagesActifs: number
}

export interface KatiClientBalance {
  id: string
  nom: string | null
  courriel: string | null
  telephone: string | null
  disponible: number
  enAttente: number
}

export type KatiOperationType =
  | "attribution"
  | "liberation"
  | "reservation"
  | "utilisation"
  | "annulation"
  | "expiration"
  | "correction"
  | "ajustement"

export interface KatiOperation {
  id: string
  type: KatiOperationType
  libelle: string
  creeLe: string
  commande: string | null
  commission: boolean
  disponible: number
  enAttente: number
  reserve: number
}

interface PersonRef {
  id: string
  profil: { nom: string | null } | null
}

export interface KatiClientSheet {
  client: { id: string; nom: string | null; courriel: string | null; telephone: string | null; statut: string }
  soldes: { disponible: number; enAttente: number; reserve: number }
  historique: { total: number; page: number; taille: number; elements: KatiOperation[] }
  parrain: {
    id: string
    statut: string
    attacheLe: string
    expireLe: string
    source: string
    parrain: PersonRef
  } | null
  filleuls: Array<{ id: string; statut: string; attacheLe: string; expireLe: string; filleul: PersonRef }>
  code: string | null
}

export interface KatiAdjustmentInput {
  sens: "credit" | "retrait"
  points: number
  motif: string
  cle: string
}

export interface KatiCommissionUnderReview {
  id: string
  motifRevue: string | null
  creeLe: string
  commande: { reference: string; totalFermeTtc: number }
  parrainage: { id: string; parrain: PersonRef; filleul: PersonRef } | null
}

export interface KatiSponsorship {
  id: string
  statut: "actif" | "revoque"
  source: "lien" | "code"
  attacheLe: string
  expireLe: string
  motifRevocation: string | null
  parrain: PersonRef
  filleul: PersonRef
  _count: { attributions: number }
}

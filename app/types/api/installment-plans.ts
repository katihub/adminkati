/** Pay-in-instalments (paiement en plusieurs fois): the product is paid bit by bit, delivered once paid. */
export type InstallmentMode = "libre" | "tranches_fixes"

export type InstallmentPlanStatus =
  | "ouvert"
  | "reserve"
  | "solde"
  | "converti"
  | "expire"
  | "abandonne"
  | "annule_defaillance"

export interface InstallmentSettings {
  id: number
  /** Global switch: off, no new plan opens; open plans carry on. */
  actif: boolean
  plansOuvertsMaxParClient: number
  modifieLe: string
  modifiePar: string | null
}

export type InstallmentSettingsUpdate = Partial<Pick<InstallmentSettings, "actif" | "plansOuvertsMaxParClient">>

export interface InstallmentRule {
  categorieId: string
  actif: boolean
  dureeMaxJours: number
  /** First payment, in basis points of the price: 1000 = 10 %. */
  apportInitialBps: number
  versementMinFcfa: number
  /** Share of the price paid from which the stock is reserved: 5000 = 50 %. */
  seuilReservationBps: number
  prixMinFcfa: number
  mode: InstallmentMode
  nombreTranches: number | null
  inactiviteMaxJours: number
}

export type InstallmentRuleInput = Omit<InstallmentRule, "categorieId">

export interface InstallmentCategoryRule {
  id: string
  nom: string
  slug: string
  /** False: the defaults are shown, nothing is saved for this category yet. */
  saisie: boolean
  regle: InstallmentRule
}

export interface InstallmentPlan {
  reference: string
  statut: InstallmentPlanStatus
  quantite: number
  prixUnitaireFcfa: number
  totalProduitsFcfa: number
  montantVerseFcfa: number
  resteFcfa: number
  echeanceLe: string
  stockReserve: number
  commande: string | null
  fraisLivraisonFcfa: number | null
  motifCloture: string | null
  creeLe: string
  boutique: { nom: string; slug: string }
  produit: { nom: string; slug: string; image: string | null; offreId: string }
  versements: Array<{ reference: string; nature: "produits" | "livraison"; montantFcfa: number; statut: string }>
  client: { nom: string | null; courriel: string | null; telephone: string | null }
  /** A plan cancelled for failure whose refund has been confirmed. */
  rembourse: boolean
  /** The Kratospay refund of a plan cancelled for failure, once started. */
  remboursementPasserelle?: {
    statut: "prepare" | "soumis" | "reussi" | "echec" | "verification_requise"
    telephone: string
    montantFcfa: number
    raisonEchec: string | null
  } | null
}

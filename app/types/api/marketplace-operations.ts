export type MarketplaceReturnStatus = "demande" | "autorise" | "refuse" | "en_transit" | "recu" | "rembourse"
export type PspRefundStatus = "prepare" | "soumis" | "reussi" | "echec" | "verification_requise"

export interface PspRefund {
  id: string
  transId: string | null
  statut: PspRefundStatus
  montantFcfa: number
  telephone: string
  moyen: string | null
  raisonEchec: string | null
  initieLe: string | null
  confirmeLe: string | null
  verifieLe: string | null
}

export interface MarketplaceReturnListItem {
  id: string
  statut: MarketplaceReturnStatus
  quantite: number
  motifClient: string
  montantRemboursableFcfa: number
  commissionCorrigeeFcfa: number
  creeLe: string
  demande: {
    id: string
    reference: string
    objet: string
    categorie: string
    statut: string
    client: { courriel: string | null; profil: { nom: string | null } | null }
    boutique: { id: string; nom: string }
    commande: { id: string; reference: string }
    expedition: { id: string; reference: string } | null
  }
}

export interface MarketplaceReturnDetail extends MarketplaceReturnListItem {
  fraisRetourFcfa: number
  montantRembourseFcfa: number
  referenceRetour: string | null
  referenceRemboursement: string | null
  remboursementPsp: PspRefund | null
  eligibleJusqua: string
  ligne: {
    id: string
    produitNomCapture: string
    referenceVendeurCapture: string
    prixUnitaireFcfa: number
    totalNetFcfa: number
    quantite: number
  }
  demande: MarketplaceReturnListItem["demande"] & {
    evenements: Array<{
      id: string
      versStatut: string
      motif: string | null
      acteurType: string
      creeLe: string
    }>
    messages: Array<{
      id: string
      auteurType: string
      contenu: string
      interne: boolean
      creeLe: string
      pieces: Array<{
        id: string
        nomCapture: string
        typeMime: string
        tailleOctets: number
        empreinteSha256: string
        creeLe: string
      }>
    }>
  }
  capacites: {
    decider: boolean
    recevoir: boolean
    rembourser: boolean
    rapprocherRemboursement: boolean
    arbitrer: boolean
  }
}

export interface MarketplaceReturnsPage {
  total: number
  page: number
  taille: number
  pages: number
  elements: MarketplaceReturnListItem[]
}

export interface MarketplaceReturnFilters {
  q?: string
  statut?: MarketplaceReturnStatus
  page?: number
  taille?: number
}

export type SellerSanctionStatus = "active" | "contestee" | "confirmee" | "levee"

export interface SellerTrustListItem {
  id: string
  nomLegal: string
  statut: string
  statutVerification: string
  boutiques: Array<{ id: string; nom: string; statut: string }>
  reputations: Array<{ scoreRisque: number; tauxLitigeBps: number; creeLe: string }>
  sanctions: Array<{ id: string; type: string; statut: SellerSanctionStatus; commenceLe: string }>
}

export interface SellerTrustDetail extends SellerTrustListItem {
  motifStatut: string | null
  sanctions: Array<{
    id: string
    type: string
    statut: SellerSanctionStatus
    motif: string
    preuves: unknown
    scoreRisqueCapture: number | null
    commenceLe: string
    termineLe: string | null
    contesteeLe: string | null
    motifContestation: string | null
    arbitreeLe: string | null
    motifArbitrage: string | null
    leveeLe: string | null
    motifLevee: string | null
  }>
  capacites: { sanctionner: boolean; arbitrer: boolean; rehabiliter: boolean }
}

export interface SellerTrustPage {
  total: number
  page: number
  taille: number
  pages: number
  elements: SellerTrustListItem[]
}

export interface SellerTrustFilters {
  q?: string
  statut?: string
  page?: number
  taille?: number
}

export type SellerWithdrawalStatus = "demande" | "approuve" | "refuse" | "reverse" | "echec" | "annule"
export type SellerPayoutStatus =
  | "prepare"
  | "soumission_en_cours"
  | "soumis"
  | "reussi"
  | "echec"
  | "verification_requise"

export interface SellerPayout {
  id: string
  transId: string | null
  statut: SellerPayoutStatus
  montantFcfa: number
  telephone: string
  moyen: string | null
  raisonEchec: string | null
  tentatives: number
  initieLe: string | null
  confirmeLe: string | null
  verifieLe: string | null
}

export interface SellerPayoutProof {
  id: string
  nomCapture: string
  typeMime: string
  tailleOctets: number
  empreinteSha256: string
  creeLe: string
}

export interface SellerWithdrawal {
  id: string
  reference: string
  montantFcfa: number
  statut: SellerWithdrawalStatus
  motifDecision: string | null
  referenceExterne: string | null
  preuveStockageCle: string | null
  preuveEmpreinteSha256: string | null
  preuveMime: string | null
  preuveTailleOctets: number | null
  creeLe: string
  decideLe: string | null
  reverseLe: string | null
  boutique: { id: string; nom: string; vendeur: { id: string; nomLegal: string } }
  documentDestination: { id: string; type: string; stockageCle: string; expireLe: string | null }
  reversementPsp: SellerPayout | null
  piecesJustificatives: SellerPayoutProof[]
}

export interface SellerWithdrawalsPage {
  total: number
  page: number
  taille: number
  elements: SellerWithdrawal[]
}

export interface SellerWithdrawalFilters {
  boutiqueId?: string
  statut?: SellerWithdrawalStatus
  page?: number
  taille?: number
}

export interface CommissionAcquisitionResult {
  examinees: number
  acquises: number
  commissionTotaleFcfa: number
  netVendeurTotalFcfa: number
}

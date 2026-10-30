import type { MarketplaceReturnStatus, PspRefundStatus } from "./marketplace-operations"

/** BackendKati/src/profil/profil.service.ts:26 — lireActiviteEquipe, GET /clients/:id/activite. */
export interface CustomerActivity {
  limite: number
  assistance: {
    total: number
    elements: Array<{
      id: string
      reference: string
      question: string
      statut: string
      creeLe: string
      reponduLe: string | null
    }>
  }
  dossiers: {
    total: number
    elements: Array<{
      id: string
      reference: string
      objet: string
      description: string
      statut: string
      categorie: string
      creeLe: string
      boutique: { id: string; nom: string }
      commande: { reference: string }
      retour: null | {
        id: string
        statut: MarketplaceReturnStatus
        montantRembourseFcfa: number
        referenceRemboursement: string | null
        remboursementPsp: null | {
          statut: PspRefundStatus
          montantFcfa: number
          transId: string | null
          confirmeLe: string | null
        }
      }
    }>
  }
}

/** Mirrors `src/paiements/kratospay/kratospay.client.ts` (certification) and `paiements.service.ts` (lister). */
export interface PaymentGatewayCertification {
  pret: boolean
  base: string | null
  environnement: "test" | "production" | null
  notificationsSignees: boolean
  consultationStatut: boolean
  erreurs: string[]
}

export type PaymentAttemptState = "attente" | "echec" | "tous"

export interface PaymentAttempt {
  transId: string
  statut: "CREATED" | "PENDING" | "SUCCESSFUL" | "FAILED" | "EXPIRED"
  montant: number
  operateur: string | null
  telephone: string | null
  demandeLe: string
  objet: { type: "commande" | "versement" | "livraison"; reference: string | null }
}

export interface PaymentAttemptsPage {
  compteurs: { attente: number; echec: number; reussis: number }
  elements: PaymentAttempt[]
}

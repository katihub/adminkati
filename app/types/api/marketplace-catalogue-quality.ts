/** A published offer, as the direction sees it to set the "Vérifié par KatiHub" badge. */
export interface PublishedOffer {
  id: string
  titre: string | null
  prixFcfa: number | null
  libelleVariante: string | null
  referenceVendeur: string
  quantiteMinimale: number
  /** Set when KatiHub received and tested this shop's item. */
  verifieParKatiLe: string | null
  noteVerification: string | null
  produit: { nom: string; slug: string }
  boutique: { id: string; nom: string; slug: string }
}

export type PublishedOfferFilter = "toutes" | "verifiees"

export interface OfferVerificationInput {
  verifiee: boolean
  note?: string
}

export type RefundStatus = "prepare" | "soumis" | "reussi" | "echec" | "verification_requise"

/** A line a shop without stock tracking refused; the deposit it no longer covers is owed to the customer. */
export interface RefusedLine {
  id: string
  commandeId: string
  quantite: number
  montantFcfa: number
  remboursementDuFcfa: number
  motif: string
  rembourseLe: string | null
  creeLe: string
  ligne: {
    produitNomCapture: string
    offreTitreCapture: string
    quantite: number
    sousCommande: {
      reference: string
      boutique: { nom: string }
      commande: { reference: string; telephoneLivraison: string | null }
    }
  }
  remboursementPsp: {
    id: string
    statut: RefundStatus
    montantFcfa: number
    telephone: string
    raisonEchec: string | null
    initieLe: string | null
    confirmeLe: string | null
  } | null
}

export type RefusedLineFilter = "a_rembourser" | "tous"

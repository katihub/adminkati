export const LEGAL_PROOF_TYPES = [
  "identite_exploitant",
  "contrats_politiques",
  "matrice_responsabilites",
  "matrice_kyc",
  "fiscalite_facturation",
  "encaissement_reversement",
] as const

export type LegalProofType = (typeof LEGAL_PROOF_TYPES)[number]
export type LegalSignerFunction =
  | "representant_legal"
  | "juriste_camerounais"
  | "comptable_fiscaliste_camerounais"
  | "responsable_donnees"

export interface LegalSigner {
  fonction: LegalSignerFunction
  nom: string
  referenceProfessionnelle?: string
}

export interface LegalProof {
  type: LegalProofType
  version: string
  referenceDocument: string
  empreinteSha256: string
  valideLe: string
  expireLe: string | null
  validePar: LegalSigner[]
}

export interface LegalClosureState {
  close: boolean
  bloquants: string[]
  versions: Partial<Record<LegalProofType, string>>
  preuves: LegalProof[]
}

export interface RegisterLegalProofInput {
  type: LegalProofType
  version: string
  referenceDocument: string
  empreinteSha256: string
  valideLe: string
  expireLe?: string
  validePar: LegalSigner[]
}

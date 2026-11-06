import type { SellerDocument } from "@/types/api/marketplace-moderation"

type DocumentForApproval = Pick<SellerDocument, "type" | "statut" | "creeLe">

// * Mirrors `dossierApprouvable` in BackendKati/src/vendeurs/pieces-requises.ts: a refused or expired document
// no longer blocks approval once a newer document of the same type was submitted.
export function isSellerFileApprovable(documents: DocumentForApproval[]): boolean {
  const isReplaced = (document: DocumentForApproval) =>
    (document.statut === "refuse" || document.statut === "expire") &&
    documents.some(other => other.type === document.type && Date.parse(other.creeLe) > Date.parse(document.creeLe))
  const current = documents.filter(document => !isReplaced(document))
  return current.length > 0 && current.every(document => document.statut === "valide")
}

/** BackendKati/src/administration/administration.service.ts:7 — GET /administration/systeme. */
export type AdministrativeEvidenceStatus = "non_configuree" | "illisible" | "invalide" | "echec" | "ancienne" | "ok"
/** BackendKati/src/administration/administration.service.ts:8 — projection publique des preuves. */
export interface AdministrativeEvidence {
  statut: AdministrativeEvidenceStatus
  date: string | null
}
/** BackendKati/src/administration/administration.service.ts:22 — réponse direction uniquement. */
export interface AdministrativeSystemStatus {
  verifieLe: string
  fuseau: string
  sauvegarde: AdministrativeEvidence & { horsSite: boolean | null }
  restauration: AdministrativeEvidence
}

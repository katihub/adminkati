/** The audit (12 November 2026): one line of the backend journal, with a name on its author. */
export type AuditCategory = "argent" | "commandes" | "vendeurs" | "catalogue" | "clients" | "administration"
export type AuditActorType = "equipe" | "vendeur" | "client" | "systeme" | "anonyme"

export interface AuditEntry {
  id: string
  action: string
  cibleType: string | null
  cibleId: string | null
  acteurType: string
  acteurId: string | null
  acteurRole: string | null
  acteurNom: string | null
  acteurBoutique: string | null
  ip: string | null
  agent: string | null
  detail: unknown
  creeLe: string
}

export interface AuditPage {
  total: number
  page: number
  taille: number
  pages: number
  elements: AuditEntry[]
}

export interface AuditFilters {
  du?: string
  au?: string
  categorie?: AuditCategory
  acteurType?: AuditActorType
  acteurId?: string
  cible?: string
  q?: string
}

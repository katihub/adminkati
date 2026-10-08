/**
 * Mirrors the team-facing assistant administration contract — `GET/POST
 * /v1/assistant/administration/demandes[/:id[/reponse|/cloture]]`, guarded
 * `@Roles(direction, comptoir)` — which the backend implements in
 * `src/assistant/` (administration controller and service). The backend side
 * was written in parallel with this panel, so the contract is the source of
 * truth until line references can be cited.
 */
export type StatutDemandeAssistance = "nouvelle" | "repondue" | "close"

/** Mirrors the query accepted by `GET /v1/assistant/administration/demandes`. */
export interface ListerDemandesAssistanceQuery {
  statut: StatutDemandeAssistance
  page: number
  taille: number
}

/** Mirrors one row of `GET /v1/assistant/administration/demandes`. */
export interface DemandeAssistanceResume {
  id: string
  /** Human reference, e.g. `AS-000123` — what the team reads out to a customer. */
  reference: string
  statut: StatutDemandeAssistance
  /** Truncated to 200 characters in the list; whole in the detail. */
  question: string
  nom: string | null
  telephone: string | null
  courriel: string | null
  clientId: string | null
  creeLe: string
  reponduLe: string | null
}

/** Mirrors the page envelope of `GET /v1/assistant/administration/demandes`. */
export interface DemandesAssistancePage {
  elements: DemandeAssistanceResume[]
  total: number
  page: number
  taille: number
  /** Per-status totals, independent of the `statut` filter the page was asked for. */
  compteurs: Record<StatutDemandeAssistance, number>
}

/** Mirrors the conversation author enum returned with a request's detail. */
export type AuteurMessageAssistance = "visiteur" | "assistant" | "equipe"

/** Mirrors one message of `DemandeDetail.conversation`. */
export interface MessageConversationAssistance {
  rang: number
  auteur: AuteurMessageAssistance
  texte: string
  creeLe: string
}

/** Mirrors `GET /v1/assistant/administration/demandes/:id` (also the body of both POST answers). */
export interface DemandeAssistanceDetail extends DemandeAssistanceResume {
  reponse: string | null
  reponduPar: { id: string; nom: string } | null
  ficheCle: string | null
  /** `null` once the conversation has been purged — the request itself outlives it. */
  conversation: { messages: MessageConversationAssistance[] } | null
}

/** Mirrors the body of `POST /v1/assistant/administration/demandes/:id/reponse`. */
export interface RepondreDemandeInput {
  /** 2 to 4000 characters. */
  reponse: string
  /** Direction only — the backend answers 403 when comptoir sets it. */
  enregistrerCommeFiche?: boolean
  /** Required when `enregistrerCommeFiche` is set (400 otherwise). */
  fiche?: {
    /** 3 to 200 characters. */
    titre: string
    domaine?: string
    motsCles?: string
  }
}

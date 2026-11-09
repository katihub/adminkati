/** A customer or seller account, as the team sees it to help someone get back in (9 November 2026). */
export type AccountAction = "lien" | "confirmer" | "lien_a_transmettre" | "temporaire"

export interface AccountShop {
  id: string
  nom: string
  slug: string
  roles: string[]
  actif: boolean
}

export interface AccountSummary {
  courriel: string
  nom: string | null
  telephone: string | null
  client: { id: string; statut: string } | null
  boutiques: AccountShop[]
}

export interface AccountAuth {
  id: string
  courriel: string
  courrielConfirme: boolean
  derniereConnexion: string | null
  creeLe: string | null
  banni: boolean
}

export interface AccountDetail extends AccountSummary {
  auth: AccountAuth | null
  actions: AccountAction[]
}

export interface AccountActionResult {
  action: AccountAction
  lien?: string
  motDePasse?: string
  dejaConfirme?: boolean
}

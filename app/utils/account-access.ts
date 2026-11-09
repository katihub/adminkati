import type { AccountAction, AccountDetail } from "@/types/api/accounts"

/**
 * HELPING A CUSTOMER OR A SELLER BACK INTO THEIR ACCOUNT (9 November 2026).
 * The backend decides who may do what; these helpers only shape the panel.
 */
export const ACCOUNT_ACTIONS: readonly AccountAction[] = [
  "creer_acces",
  "lien",
  "confirmer",
  "lien_a_transmettre",
  "temporaire",
]

/** The API path of an action. */
export function accountActionPath(action: AccountAction): string {
  return {
    creer_acces: "/comptes/creer-acces",
    lien: "/comptes/lien-reinitialisation",
    confirmer: "/comptes/confirmer-courriel",
    lien_a_transmettre: "/comptes/lien-a-transmettre",
    temporaire: "/comptes/mot-de-passe-temporaire",
  }[action]
}

/** A copied link or a temporary password opens the account: the team says why. */
export function accountActionNeedsReason(action: AccountAction): boolean {
  return action === "lien_a_transmettre" || action === "temporaire"
}

/** The actions to show: the ones allowed, without confirming an e-mail already confirmed. */
export function visibleAccountActions(account: Pick<AccountDetail, "actions" | "auth">): AccountAction[] {
  return ACCOUNT_ACTIONS.filter(
    action => account.actions.includes(action) && !(action === "confirmer" && account.auth?.courrielConfirme),
  )
}

/** Who the account belongs to, in a few words. */
export function accountKinds(account: Pick<AccountDetail, "client" | "boutiques">): ("client" | "seller")[] {
  return [...(account.client ? (["client"] as const) : []), ...(account.boutiques.length ? (["seller"] as const) : [])]
}

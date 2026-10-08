import type { StatutCommande } from "@/types/api/commandes"

/**
 * How consequential an action reads: `primary` is the expected next step, `secondary` a
 *  lateral or backward move, `warning` a serious-but-not-final flag, `destructive` ends the
 *  order outright. Severity is scoped to the order's *current* status — the same target status
 *  (e.g. `annulation_demandee`) reads as more or less severe depending on what else is on offer
 *  in that state (see `ORDER_TRANSITION_SEVERITY` below: it's `destructive` in `en_preparation`,
 *  where nothing more final is available, but downgrades to `warning` in `prete_au_retrait`,
 *  where `close` is present and outranks it).
 */
export type TransitionSeverity = "primary" | "secondary" | "warning" | "destructive"

/**
 * Keyed by the order's current status, then by each transition it can reach from there.
 *  Mirrors `ORDER_TRANSITIONS` in `order-transitions.ts` exactly — every reachable target from
 *  every status has an entry here.
 */
export const ORDER_TRANSITION_SEVERITY: Readonly<
  Record<StatutCommande, Partial<Record<StatutCommande, TransitionSeverity>>>
> = {
  soumise: {
    confirmee: "primary",
    refusee: "destructive",
    annulee: "destructive",
  },
  confirmee: {
    en_preparation: "primary",
    soumise: "secondary",
    annulation_demandee: "destructive",
  },
  refusee: {},
  en_preparation: {
    prete_au_retrait: "primary",
    en_remise: "secondary",
    annulation_demandee: "destructive",
  },
  prete_au_retrait: {
    close: "destructive",
    annulation_demandee: "warning",
  },
  en_remise: {
    close: "destructive",
    en_preparation: "secondary",
    retour_ouvert: "secondary",
  },
  retour_ouvert: {
    close: "destructive",
  },
  annulation_demandee: {
    annulee: "destructive",
  },
  annulee: {},
  close: {},
}

/**
 * Collect Payment isn't a status transition, so it isn't in the map above — but its severity
 *  is scoped the same way, by the order's current status. `primary` only at the three
 *  money-changes-hands stages (ready for pickup, being handed over, open return); `secondary`
 *  everywhere else it's shown, so it never competes with a state's real primary action (e.g.
 *  Ready staying the only primary in `en_preparation`).
 */
export const ORDER_PAYMENT_ACTION_SEVERITY: Readonly<Partial<Record<StatutCommande, TransitionSeverity>>> = {
  prete_au_retrait: "primary",
  en_remise: "primary",
  retour_ouvert: "primary",
}

export const ORDER_TRANSITION_ICON: Readonly<Record<StatutCommande, string>> = {
  soumise: "ph:arrow-u-up-left",
  confirmee: "ph:check",
  refusee: "ph:x",
  en_preparation: "ph:package",
  prete_au_retrait: "ph:handbag",
  en_remise: "ph:handshake",
  retour_ouvert: "ph:arrow-counter-clockwise",
  annulation_demandee: "ph:flag",
  annulee: "ph:x-circle",
  close: "ph:archive",
}

import type { StatutCommande } from "@/types/api/commandes"
import type { Role } from "@/types/session"

/** Mirrors `machine-etats.ts:28-40` in the backend. */
export const ORDER_TRANSITIONS: Readonly<Record<StatutCommande, readonly StatutCommande[]>> = {
  soumise: ["confirmee", "refusee", "annulee"],
  confirmee: ["en_preparation", "soumise", "annulation_demandee"],
  refusee: [],
  en_preparation: ["prete_au_retrait", "en_remise", "annulation_demandee"],
  prete_au_retrait: ["close", "annulation_demandee"],
  en_remise: ["close", "en_preparation", "retour_ouvert"],
  retour_ouvert: ["close"],
  annulation_demandee: ["annulee"],
  annulee: [],
  close: [],
}

/** Mirrors the equipe entries in `machine-etats.ts:65-76` in the backend. */
export const ORDER_TRANSITION_RIGHTS: Readonly<Record<StatutCommande, readonly Role[]>> = {
  soumise: ["comptoir", "direction"],
  confirmee: ["comptoir", "direction"],
  refusee: ["comptoir", "direction"],
  // Le livreur y revient depuis `en_remise` : c'est l'échec de livraison,
  // l'absence du client, et c'est lui qui est devant la porte fermée.
  en_preparation: ["comptoir", "preparation", "livreur", "direction"],
  prete_au_retrait: ["comptoir", "preparation", "direction"],
  en_remise: ["comptoir", "direction"],
  retour_ouvert: ["comptoir", "direction"],
  annulation_demandee: ["comptoir", "direction"],
  annulee: ["direction"],
  /**
   * CLORE REVIENT À QUI REMET, ET LA PRÉPARATION NE REMET RIEN.
   *
   * Clore, c'est déclarer que la marchandise est partie et poser le motif qui
   * dit comment : « retirée », « livrée », « sans preuve ». Le préparateur
   * emballe, imprime le bordereau, pose la commande sur l'étagère ; il ne voit
   * pas ce moment-là et choisissait donc son motif à l'aveugle. Le backend le
   * lui a retiré (`machine-etats.ts`) ; il garde tout le reste de son travail,
   * `en_preparation` et `prete_au_retrait` compris.
   */
  close: ["comptoir", "livreur", "direction"],
}

export function eligibleTransitions(status: StatutCommande, roles: readonly Role[]): StatutCommande[] {
  return ORDER_TRANSITIONS[status].filter(target => ORDER_TRANSITION_RIGHTS[target].some(role => roles.includes(role)))
}

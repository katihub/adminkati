import type { Comptoir } from "@/types/api/vitrine"
import type { PublicSession, Role } from "@/types/session"

/**
 * The label of a counter, or its key when the list could not be read.
 *
 * A `preparation` session is refused `GET administration/points-vente`, so it holds
 * no labels at all. Showing `Akwa-Paris-Dancing` is rough, but it names the counter;
 * an empty cell would not.
 */
export function comptoirLabel(comptoirs: readonly Comptoir[], cle: string): string {
  return comptoirs.find(comptoir => comptoir.cle === cle)?.libelle ?? cle
}

/** The labels of a member's counters, in the order the shop displays its counters. */
export function comptoirLabels(comptoirs: readonly Comptoir[], cles: readonly string[]): string[] {
  const ordered = comptoirs.filter(comptoir => cles.includes(comptoir.cle)).map(comptoir => comptoir.libelle)
  const unknown = cles.filter(cle => !comptoirs.some(comptoir => comptoir.cle === cle))
  return [...ordered, ...unknown]
}

/**
 * A MEMBER'S PERIMETER, `null` MEANING THE WHOLE SHOP.
 *
 * Mirrors `src/commun/perimetre.ts` in the backend, including its choice to
 * collapse the two ways of seeing everything — an exempt role, and an empty
 * list — into one answer. An empty list is what everyone carries the day the
 * feature ships; reading it as "nothing" would stop the shop.
 */
function perimetre(
  session: Pick<PublicSession, "roles" | "comptoirs"> | null | undefined,
  exemptRoles: readonly Role[],
): string[] | null {
  if (!session) return null
  if (session.roles.some(role => exemptRoles.includes(role))) return null
  return session.comptoirs?.length ? [...session.comptoirs] : null
}

/**
 * WHAT A MEMBER MAY READ IN THE ORDERS.
 *
 * `preparation` keeps the whole shop alongside `direction`: it packs for every
 * counter and prints every slip, and it never touches the money.
 */
export function readingPerimetre(
  session: Pick<PublicSession, "roles" | "comptoirs"> | null | undefined,
): string[] | null {
  return perimetre(session, ["direction", "preparation"])
}

/**
 * WHAT A MEMBER MAY TOUCH WHEN IT IS ABOUT MONEY — narrower, and only
 * `direction` is exempt. Cashing in, counting, validating: the Akwa seller has
 * no business in the Bonamoussadi till, even if he also packs orders.
 */
export function moneyPerimetre(
  session: Pick<PublicSession, "roles" | "comptoirs"> | null | undefined,
): string[] | null {
  return perimetre(session, ["direction"])
}

/**
 * IS THIS ORDER INSIDE THAT PERIMETER.
 *
 * The rules the backend applies before answering 403, so that nobody discovers
 * them by pressing a button: `null` covers the whole shop, an order with no
 * counter belongs to nobody and stays open to all, and anything else has to
 * match.
 */
export function isOrderInPerimetre(
  perimetreComptoirs: readonly string[] | null | undefined,
  orderComptoir: string | null | undefined,
): boolean {
  if (!perimetreComptoirs || perimetreComptoirs.length === 0) return true
  if (!orderComptoir) return true
  return perimetreComptoirs.includes(orderComptoir)
}

/**
 * The counters a member may actually ASK for.
 *
 * `?comptoir=` outside the perimeter is a 403 on the whole list, not a narrower
 * list — the backend refuses rather than intersecting in silence. So the filter
 * offers nothing it would be refused.
 */
export function selectableComptoirs(
  comptoirs: readonly Comptoir[],
  perimetreComptoirs: readonly string[] | null,
): Comptoir[] {
  return perimetreComptoirs === null
    ? [...comptoirs]
    : comptoirs.filter(comptoir => perimetreComptoirs.includes(comptoir.cle))
}

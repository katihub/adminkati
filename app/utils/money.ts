/**
 * Below a million the exact figure is shown, because `Intl` compacts `999 999`
 * to "1 M" — a rounding across an order of magnitude, which is a lie about money.
 * Six-digit amounts therefore stay exact.
 */
const SEUIL_COMPACT = 1_000_000

function formatteur(locale: string, compact: boolean): Intl.NumberFormat {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "XAF",
    ...(compact ? { notation: "compact" } : {}),
  })
}

/**
 * `affiche` is what the UI renders; `exact` is the full figure it carries in
 * `title` and `aria-label`, so compaction never loses the precise amount.
 *
 * XAF is an integer currency (../NowTech-backend-/prisma/schema.prisma:12-14) and
 * `Intl` already renders it as `FCFA` in both locales, so nothing here divides or
 * substitutes a symbol. `Math.abs` rather than a bare comparison, so a large
 * negative compacts too.
 */
export function formatMontant(valeur: number, locale: string): { affiche: string; exact: string } {
  const exact = formatteur(locale, false).format(valeur)
  const compact = Math.abs(valeur) >= SEUIL_COMPACT

  return { affiche: compact ? formatteur(locale, true).format(valeur) : exact, exact }
}

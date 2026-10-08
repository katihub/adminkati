import { formatMontant } from "./money"

export interface ProposalValueContext {
  categories: ReadonlyMap<number, string>
  emptyLabel: string
  locale: string
  noLabel: string
  yesLabel: string
}

function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)
}

type ProposalValueFormatter = (value: unknown, context: ProposalValueContext) => string | undefined

function formatMoneyValue(value: unknown, context: ProposalValueContext): string {
  return typeof value === "number" ? formatMontant(value, context.locale).affiche : String(value)
}

function formatDiscountValue(value: unknown, context: ProposalValueContext): string {
  return typeof value === "number" ? `${formatNumber(value, context.locale)}%` : String(value)
}

function formatStockValue(value: unknown, context: ProposalValueContext): string | undefined {
  return typeof value === "boolean" ? (value ? context.yesLabel : context.noLabel) : undefined
}

function formatCategoryValue(value: unknown, context: ProposalValueContext): string | undefined {
  return typeof value === "number" ? (context.categories.get(value) ?? String(value)) : undefined
}

const formatters: Record<string, ProposalValueFormatter> = {
  prix: formatMoneyValue,
  prix_reference: formatMoneyValue,
  remise_pct: formatDiscountValue,
  en_stock: formatStockValue,
  categorie_principale_id: formatCategoryValue,
}

export function formatProposalValue(field: string, value: unknown, context: ProposalValueContext): string {
  if (value === null || value === undefined || value === "") return context.emptyLabel

  const formatted = formatters[field]?.(value, context)
  if (formatted !== undefined) return formatted

  if (Array.isArray(value)) return value.length ? value.map(String).join(", ") : context.emptyLabel

  return String(value)
}

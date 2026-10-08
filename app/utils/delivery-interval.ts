import type { DelaiLivraison, DelaiLivraisonInput, DelaiUnite } from "@/types/api/delais-livraison"

/**
 * Minutes per unit, only to order options against each other. `jours_ouvres` is a 7/5 stretch of a
 * calendar day; no calendar logic lives here because the interval is display-only.
 */
const UNIT_MINUTES: Record<DelaiUnite, number> = {
  minutes: 1,
  heures: 60,
  jours: 1440,
  jours_ouvres: 2016,
  semaines: 10_080,
  mois: 43_200,
}

type IntervalValue = Pick<DelaiLivraison, "min_valeur" | "max_valeur" | "unite">

export interface DeliveryIntervalLabel {
  key: string
  count: number
  params: Record<string, number>
}

/** A range whose bounds are equal is really a single value. */
function normalizedMax(option: Pick<IntervalValue, "min_valeur" | "max_valeur">): number | null {
  return option.max_valeur === option.min_valeur ? null : option.max_valeur
}

interface Bound {
  value: number
  unite: DelaiUnite
}

/**
 * The backend stores one unit per option, so "30 min - 72 h" arrives as 30..4320 minutes. Only
 * minutes are folded into hours (and only when it divides evenly): the other units are already
 * what an operator would write.
 */
function displayBound(value: number, unite: DelaiUnite): Bound {
  return unite === "minutes" && value >= 60 && value % 60 === 0
    ? { value: value / 60, unite: "heures" }
    : { value, unite }
}

/** The caller renders it with `t(key, params, count)`; the plural form follows `count`. */
export function deliveryIntervalLabel(option: IntervalValue): DeliveryIntervalLabel {
  const min = displayBound(option.min_valeur, option.unite)
  const rawMax = normalizedMax(option)
  if (rawMax === null)
    return { key: `products.delivery.label.single.${min.unite}`, count: min.value, params: { count: min.value } }

  const max = displayBound(rawMax, option.unite)
  const shape = min.unite === max.unite ? min.unite : `${min.unite}_${max.unite}`
  return { key: `products.delivery.label.range.${shape}`, count: max.value, params: { min: min.value, max: max.value } }
}

function upperBoundMinutes(option: IntervalValue): number {
  return (option.max_valeur ?? option.min_valeur) * UNIT_MINUTES[option.unite]
}

export function sortDeliveryIntervals(options: DelaiLivraison[]): DelaiLivraison[] {
  return [...options].sort(
    (a, b) =>
      Number(b.est_defaut) - Number(a.est_defaut) ||
      upperBoundMinutes(a) - upperBoundMinutes(b) ||
      a.min_valeur - b.min_valeur ||
      a.id - b.id,
  )
}

/** Archived options count: the backend rejects them as duplicates too, and the UI can offer a restore. */
export function findDuplicateInterval(
  options: DelaiLivraison[],
  candidate: DelaiLivraisonInput,
  excludeId?: number,
): DelaiLivraison | undefined {
  const candidateMax = normalizedMax(candidate)
  return options.find(
    option =>
      option.id !== excludeId &&
      option.unite === candidate.unite &&
      option.min_valeur === candidate.min_valeur &&
      normalizedMax(option) === candidateMax,
  )
}

/** An unset `modelValue` means the product inherits the default; `resolved` covers a list that is not loaded. */
export function resolveSelectedInterval(
  options: DelaiLivraison[],
  modelValue: number | null,
  resolved?: DelaiLivraison | null,
): DelaiLivraison | null {
  const match =
    modelValue === null ? options.find(option => option.est_defaut) : options.find(option => option.id === modelValue)
  return match ?? resolved ?? null
}

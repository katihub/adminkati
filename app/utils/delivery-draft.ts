import type { DelaiLivraison, DelaiLivraisonInput, DelaiUnite } from "@/types/api/delais-livraison"
import { delaiLivraisonSchema } from "../schemas/delai-livraison"
import { findDuplicateInterval } from "./delivery-interval"

export interface DeliveryDraftFields {
  unit: DelaiUnite
  mode: "single" | "range"
  min: string
  max: string
}

export type DeliveryDraftCheck = { input: DelaiLivraisonInput; errorKey: null } | { input: null; errorKey: string }

/** Each opening starts from the option being edited, or blank. */
export function initialDraft(interval?: DelaiLivraison | null): DeliveryDraftFields {
  if (!interval) return { unit: "jours", mode: "single", min: "", max: "" }
  const isRange = interval.max_valeur != null
  return {
    unit: interval.unite,
    mode: isRange ? "range" : "single",
    min: String(interval.min_valeur),
    max: isRange ? String(interval.max_valeur) : "",
  }
}

function duplicateErrorKey(duplicate: DelaiLivraison) {
  return duplicate.actif ? "products.delivery.dialog.duplicate" : "products.delivery.dialog.duplicateArchived"
}

/** Returns the input to send, or the i18n key of the reason it cannot be sent. */
export function checkDeliveryDraft(draft: unknown, options: DelaiLivraison[], excludeId?: number): DeliveryDraftCheck {
  const parsed = delaiLivraisonSchema.safeParse(draft)
  if (!parsed.success) return { input: null, errorKey: "products.delivery.dialog.invalid" }
  const input: DelaiLivraisonInput = { ...parsed.data, max_valeur: parsed.data.max_valeur ?? null }
  const duplicate = findDuplicateInterval(options, input, excludeId)
  return duplicate ? { input: null, errorKey: duplicateErrorKey(duplicate) } : { input, errorKey: null }
}

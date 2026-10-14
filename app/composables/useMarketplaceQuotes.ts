import type { MaybeRefOrGetter } from "vue"
import { useMutation, useQuery } from "@tanstack/vue-query"
import { computed, toValue } from "vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

export type QuoteStatus = "ouvert" | "accepte" | "annule"
export type QuotePartStatus = "en_attente" | "confirmee" | "refusee" | "acceptee" | "non_retenue"

export interface QuotePart {
  id: string
  reference: string
  statut: QuotePartStatus
  totalFcfa: number
  creeLe: string
  valideJusquau: string | null
  enRetard: boolean
  lignes: number
  boutique: { id: string; nom: string; ville: string | null }
}

export interface QuoteSummary {
  id: string
  reference: string
  statut: QuoteStatus
  entreprise: string | null
  totalFcfa: number
  creeLe: string
  commande: { reference: string } | null
  client: { nom: string | null; ville: string | null; courriel: string | null }
  parties: QuotePart[]
}

export interface QuoteTracking {
  indicateurs: { total: number; acceptes: number; tauxConversionBps: number; partiesEnRetard: number }
  devis: QuoteSummary[]
}

export interface QuoteFilters {
  statut?: QuoteStatus
  enRetard?: boolean
}

/** Every marketplace quote, with conversion and shops late to answer (direction only). */
export function useMarketplaceQuotes(filters: MaybeRefOrGetter<QuoteFilters>) {
  const apiFetch = useApiFetch()
  const params = computed(() => toValue(filters))
  return useQuery<QuoteTracking>({
    queryKey: computed(() => apiQueryKeys.marketplaceQuotes.list(params.value)),
    queryFn: () =>
      apiFetch("/marketplace/administration/devis", {
        query: {
          ...(params.value.statut ? { statut: params.value.statut } : {}),
          ...(params.value.enRetard ? { enRetard: "true" } : {}),
        },
      }),
  })
}

export function useQuoteReminders() {
  const apiWrite = useApiWrite()
  return useMutation({
    mutationFn: () =>
      apiWrite<{ boutiquesRelancees: number; clientsPrevenus: number }>("/marketplace/administration/devis/relances", {
        method: "POST",
      }),
  })
}

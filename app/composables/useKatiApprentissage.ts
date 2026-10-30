import type { MaybeRefOrGetter } from "vue"
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { computed, toValue } from "vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

const KATI_PATH = "/assistant/administration/kati"
const katiKeys = {
  all: [...apiQueryKeys.assistant.all, "kati"] as const,
  review: (days: number) => [...apiQueryKeys.assistant.all, "kati", "a-revoir", days] as const,
  corrections: [...apiQueryKeys.assistant.all, "kati", "corrections"] as const,
  report: (days: number) => [...apiQueryKeys.assistant.all, "kati", "rapport", days] as const,
}

/** One question customers asked, grouped across every time Kati failed it. */
export interface KatiReviewItem {
  question: string
  frequence: number
  dernierLe: string
  /** `incomprise`, `sans_resultat`, `conseiller`, `hors_perimetre`… */
  types: string[]
  passations: number
  /** The logged turns behind this line, marked as reviewed together. */
  ids: string[]
  conversationId: string | null
}

export interface KatiReviewList {
  jours: number
  total: number
  elements: KatiReviewItem[]
}

export type KatiCorrectionKind = "synonyme" | "exemple"

export interface KatiCorrection {
  id: string
  genre: KatiCorrectionKind
  expression: string
  cible: string
  active: boolean
  creePar: string | null
  creeLe: string
  majLe: string
}

export interface KatiReport {
  jours: number
  questions: number
  tauxComprehension: number
  tauxPassation: number
  partIa: number
  dureeMedianeMs: number
  jetons: { entree: number; sortie: number }
  replis: Record<string, number>
  plusFrequentes: Array<{ question: string; frequence: number }>
  nonComprises: Array<{ question: string; frequence: number }>
}

export function useKatiReview(days: MaybeRefOrGetter<number>) {
  const apiFetch = useApiFetch()
  const jours = computed(() => toValue(days))
  return useQuery<KatiReviewList>({
    queryKey: computed(() => katiKeys.review(jours.value)),
    queryFn: () => apiFetch<KatiReviewList>(`${KATI_PATH}/a-revoir`, { query: { jours: jours.value } }),
  })
}

export function useKatiCorrections() {
  const apiFetch = useApiFetch()
  return useQuery<KatiCorrection[]>({
    queryKey: katiKeys.corrections,
    queryFn: () => apiFetch<KatiCorrection[]>(`${KATI_PATH}/corrections`),
  })
}

export function useKatiReport(days: MaybeRefOrGetter<number>) {
  const apiFetch = useApiFetch()
  const jours = computed(() => toValue(days))
  return useQuery<KatiReport>({
    queryKey: computed(() => katiKeys.report(jours.value)),
    queryFn: () => apiFetch<KatiReport>(`${KATI_PATH}/rapport`, { query: { jours: jours.value } }),
  })
}

/** Every write refreshes the whole Kati screen: a correction settles review lines, and review lines feed the report. */
export function useKatiMutations() {
  const apiWrite = useApiWrite()
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: katiKeys.all })
  const markReviewed = useMutation({
    mutationFn: (ids: string[]) => apiWrite(`${KATI_PATH}/a-revoir/revus`, { method: "POST", body: { ids } }),
    onSuccess: invalidate,
  })
  const teach = useMutation({
    mutationFn: (body: { genre: KatiCorrectionKind; expression: string; cible: string; tours?: string[] }) =>
      apiWrite(`${KATI_PATH}/corrections`, { method: "POST", body }),
    onSuccess: invalidate,
  })
  const withdraw = useMutation({
    mutationFn: (id: string) =>
      apiWrite(`${KATI_PATH}/corrections/${encodeURIComponent(id)}/retrait`, { method: "POST" }),
    onSuccess: invalidate,
  })
  return { markReviewed, teach, withdraw }
}

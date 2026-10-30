import type { MaybeRefOrGetter } from "vue"
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { computed, toValue } from "vue"

/** BackendKati/src/marketplace/livraisons/kati-express.service.ts — the Kati Express dispatch board. */
export type KatiExpressQueue = "a_attribuer" | "en_cours" | "terminees"

export interface KatiExpressShipment {
  id: string
  reference: string
  statut: string
  ville: string
  quartier: string | null
  adresseFigee: { quartier?: string; repere?: string } | null
  telephoneClientCapture: string
  montantACollecterFcfa: number
  fraisLivraisonFcfa: number
  fraisPrepayes: boolean
  livraisonPrevueDebut: string | null
  livraisonPrevueFin: string | null
  priseEnChargeLe: string | null
  departLivraisonLe: string | null
  livreeLe: string | null
  creeLe: string
  agentCourant: { id: string; nom: string; telephone: string } | null
  sousCommande: {
    reference: string
    statut: string
    preteLe: string | null
    boutique: { nom: string; ville: string | null; adresseRetrait: string | null }
    commande: { reference: string }
    _count: { lignes: number }
  }
}

export interface KatiExpressBoard {
  file: KatiExpressQueue
  elements: KatiExpressShipment[]
  compteurs: Record<KatiExpressQueue, number>
  villes: Array<{ ville: string; actives: number }>
}

export interface KatiExpressCourier {
  id: string
  nom: string
  telephone: string
  verifie: boolean
  plafondEspecesFcfa: number | null
  missionsEnCours: number
  aEncaisserFcfa: number
  especesNonRemisesFcfa: number
  villes: string[]
}

export interface KatiExpressSuggestion {
  agentId: string
  nom: string
  telephone: string
  score: number
  eligible: boolean
  blocage: string | null
  raisons: string[]
  missionsEnCours: number
  memeQuartier: number
  memeVille: number
  expositionApresFcfa: number
  plafondFcfa: number | null
}

export interface KatiExpressSuggestions {
  expedition: {
    id: string
    reference: string
    statut: string
    ville: string
    quartier: string | null
    montantACollecterFcfa: number
  }
  suggestions: KatiExpressSuggestion[]
  recommandee: string | null
}

const KEY = ["v1", "marketplace", "kati-express"] as const

export function useKatiExpressBoard(filters: MaybeRefOrGetter<{ file: KatiExpressQueue; ville?: string }>) {
  const api = useApiFetch()
  const query = computed(() => {
    const value = toValue(filters)
    return { file: value.file, ...(value.ville ? { ville: value.ville } : {}) }
  })
  return useQuery<KatiExpressBoard>({
    queryKey: computed(() => [...KEY, "expeditions", query.value]),
    queryFn: () => api("/marketplace/kati-express/expeditions", { query: query.value }),
    refetchInterval: 60_000,
  })
}

export function useKatiExpressCouriers() {
  const api = useApiFetch()
  return useQuery<KatiExpressCourier[]>({
    queryKey: [...KEY, "livreurs"],
    queryFn: () => api("/marketplace/kati-express/livreurs"),
    refetchInterval: 60_000,
  })
}

export function useKatiExpressSuggestions(id: MaybeRefOrGetter<string | null>) {
  const api = useApiFetch()
  return useQuery<KatiExpressSuggestions>({
    queryKey: computed(() => [...KEY, "suggestions", toValue(id)]),
    queryFn: () => api(`/marketplace/kati-express/expeditions/${encodeURIComponent(toValue(id) ?? "")}/suggestions`),
    enabled: computed(() => Boolean(toValue(id))),
  })
}

/** The team's validation: the existing assignment route, with every check it already makes. */
export function useKatiExpressAssign() {
  const api = useApiWrite()
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ expeditionId, agentId }: { expeditionId: string; agentId: string }) =>
      api(`/marketplace/expeditions/${encodeURIComponent(expeditionId)}/affectation`, {
        method: "POST",
        body: { agentId },
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  })
}

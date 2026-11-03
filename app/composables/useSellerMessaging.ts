import type { MaybeRefOrGetter } from "vue"
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { computed, toValue } from "vue"

/** BackendKati/src/vendeurs/messagerie-vendeurs.service.ts — direct messages between a shop and the KATI team. */
export type SellerConversationStatus = "ouverte" | "resolue"

export interface SellerConversation {
  id: string
  sujet: string
  statut: SellerConversationStatus
  dernierMessageLe: string
  creeLe: string
  boutique: { id: string; nom: string; slug: string }
  nonLus: number
}

export interface SellerMessage {
  id: string
  auteurType: "vendeur" | "equipe"
  auteurNom: string
  contenu: string
  creeLe: string
}

export type SellerThread = Omit<SellerConversation, "nonLus"> & { messages: SellerMessage[] }

const KEY = ["v1", "messagerie-vendeurs"] as const

export function useSellerConversations(statut: MaybeRefOrGetter<SellerConversationStatus | "">) {
  const api = useApiFetch()
  const query = computed(() => (toValue(statut) ? { statut: toValue(statut) } : {}))
  return useQuery<SellerConversation[]>({
    queryKey: computed(() => [...KEY, "liste", query.value]),
    queryFn: () => api("/messagerie-vendeurs", { query: query.value }),
    refetchInterval: 30_000,
  })
}

/** Reading the thread marks it read for the team, so the list is refreshed with it. */
export function useSellerThread(id: MaybeRefOrGetter<string | null>) {
  const api = useApiFetch()
  const client = useQueryClient()
  return useQuery<SellerThread>({
    queryKey: computed(() => [...KEY, "fil", toValue(id)]),
    queryFn: async () => {
      const thread = await api<SellerThread>(`/messagerie-vendeurs/${encodeURIComponent(toValue(id) ?? "")}`)
      void client.invalidateQueries({ queryKey: [...KEY, "liste"] })
      return thread
    },
    enabled: computed(() => Boolean(toValue(id))),
    refetchInterval: 20_000,
  })
}

export function useSellerReply() {
  const api = useApiWrite()
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, contenu }: { id: string; contenu: string }) =>
      api(`/messagerie-vendeurs/${encodeURIComponent(id)}/messages`, { method: "POST", body: { contenu } }),
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  })
}

export function useSellerConversationStatus() {
  const api = useApiWrite()
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, statut }: { id: string; statut: SellerConversationStatus }) =>
      api(`/messagerie-vendeurs/${encodeURIComponent(id)}/statut`, { method: "POST", body: { statut } }),
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  })
}

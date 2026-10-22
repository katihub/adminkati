import type {
  SaveDraftInput,
  SiteTextDetail,
  SiteTextRights,
  SiteTextSettings,
  SiteTextSummary,
  SiteTextType,
  SiteTextVersion,
  TeamRole,
} from "@/types/api/site-texts"
import type { MaybeRefOrGetter } from "vue"
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { computed, toValue } from "vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

const BASE = "/contenus"

/** What the signed-in member may do with site texts: draft, publish, change who drafts. */
export function useSiteTextRights() {
  const apiFetch = useApiFetch()
  return useQuery<SiteTextRights>({
    queryKey: apiQueryKeys.siteTexts.rights,
    queryFn: () => apiFetch(`${BASE}/droits`),
  })
}

export function useSiteTextList(type: MaybeRefOrGetter<SiteTextType | "">) {
  const apiFetch = useApiFetch()
  return useQuery<SiteTextSummary[]>({
    queryKey: computed(() => apiQueryKeys.siteTexts.list(toValue(type))),
    queryFn: () => {
      const value = toValue(type)
      return apiFetch(BASE, { query: value ? { type: value } : {} })
    },
  })
}

export function useSiteTextDetail(key: MaybeRefOrGetter<string | null>) {
  const apiFetch = useApiFetch()
  return useQuery<SiteTextDetail>({
    queryKey: computed(() => apiQueryKeys.siteTexts.detail(toValue(key) ?? "")),
    queryFn: () => apiFetch(`${BASE}/${encodeURIComponent(toValue(key) ?? "")}`),
    enabled: computed(() => Boolean(toValue(key))),
  })
}

export function useSiteTextSettings(enabled: MaybeRefOrGetter<boolean>) {
  const apiFetch = useApiFetch()
  return useQuery<SiteTextSettings>({
    queryKey: apiQueryKeys.siteTexts.settings,
    queryFn: () => apiFetch(`${BASE}/reglages`),
    enabled: computed(() => toValue(enabled)),
  })
}

export function useSiteTextMutations() {
  const apiWrite = useApiWrite()
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: apiQueryKeys.siteTexts.all })
  const version = (id: string, action = "") => `${BASE}/versions/${encodeURIComponent(id)}${action ? `/${action}` : ""}`
  return {
    openDraft: useMutation({
      mutationFn: ({ key, fromVersionId }: { key: string; fromVersionId?: string }) =>
        apiWrite<SiteTextVersion>(`${BASE}/${encodeURIComponent(key)}/brouillon`, {
          method: "POST",
          body: fromVersionId ? { depuisVersionId: fromVersionId } : {},
        }),
      onSuccess: refresh,
    }),
    save: useMutation({
      mutationFn: ({ id, body }: { id: string; body: SaveDraftInput }) =>
        apiWrite<SiteTextVersion>(version(id), { method: "PUT", body }),
      onSuccess: refresh,
    }),
    submit: useMutation({
      mutationFn: (id: string) => apiWrite(version(id, "soumettre"), { method: "POST" }),
      onSuccess: refresh,
    }),
    publish: useMutation({
      mutationFn: (id: string) => apiWrite(version(id, "publier"), { method: "POST" }),
      onSuccess: refresh,
    }),
    sendBack: useMutation({
      mutationFn: ({ id, comment }: { id: string; comment: string }) =>
        apiWrite(version(id, "renvoyer"), { method: "POST", body: { commentaire: comment } }),
      onSuccess: refresh,
    }),
    discard: useMutation({
      mutationFn: (id: string) => apiWrite(version(id), { method: "DELETE" }),
      onSuccess: refresh,
    }),
    updateSettings: useMutation({
      mutationFn: (roles: TeamRole[]) =>
        apiWrite(`${BASE}/reglages`, { method: "PATCH", body: { rolesRedaction: roles } }),
      onSuccess: refresh,
    }),
  }
}

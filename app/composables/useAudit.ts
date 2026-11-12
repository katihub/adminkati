import type { AuditFilters, AuditPage } from "@/types/api/audit"
import type { MaybeRefOrGetter } from "vue"
import { keepPreviousData, useQuery } from "@tanstack/vue-query"
import { computed, toValue } from "vue"
import { auditQuery } from "@/utils/audit"

const KEY = ["v1", "audit"] as const

/** One page of the audit, the most recent first (direction only, 12 November 2026). */
export function useAuditPage(filters: MaybeRefOrGetter<AuditFilters>, page: MaybeRefOrGetter<number>) {
  const apiFetch = useApiFetch()
  const query = computed(() => ({ ...auditQuery(toValue(filters)), page: toValue(page), taille: 50 }))
  return useQuery<AuditPage>({
    queryKey: computed(() => [...KEY, query.value]),
    queryFn: () => apiFetch("/audit", { query: query.value }),
    placeholderData: keepPreviousData,
  })
}

/** The CSV export of the same selection; the backend records it in the journal. */
export async function downloadAuditExport(filters: AuditFilters): Promise<Blob> {
  return await $fetch<Blob>("/api/v1/audit/export", { query: auditQuery(filters), responseType: "blob" })
}

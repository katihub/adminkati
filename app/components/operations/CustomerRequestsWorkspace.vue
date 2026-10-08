<script setup lang="ts">
import type {
  DemandeAssistanceDetail,
  DemandesAssistancePage,
  ListerDemandesAssistanceQuery,
  StatutDemandeAssistance,
} from "@/types/api/assistant"
import { computed } from "vue"
import { prefetchApi } from "@/composables/useApi"
import { useCachedSession } from "@/composables/useCachedSession"
import {
  DEMANDES_ASSISTANCE_PATH,
  useDemandeAssistance,
  useDemandesAssistance,
} from "@/composables/useDemandesAssistance"
import { apiQueryKeys } from "@/utils/api-query-keys"
import { parseAssistantRequestStatus } from "@/utils/assistant-requests"
import { routeQueryString } from "@/utils/route-query"

const PAGE_SIZE = 20

const route = useRoute()
const queryClient = useNuxtApp().$queryClient
const session = useCachedSession()
/** The backend refuses the fiche to comptoir with a 403; the switch is not offered to them at all. */
const canSaveFiche = computed(() => session.value?.roles.includes("direction") ?? false)

/**
 * The URL is the whole workspace state. The email that alerts the team links
 * to `/assistant?demande=<id>`, so an explicit request must open on its own,
 * whatever tab or page the list happens to be on. Nothing is auto-selected:
 * answering a customer is a deliberate act, and on a phone an auto-opened
 * detail would hide the queue.
 */
const status = computed(() => parseAssistantRequestStatus(routeQueryString(route.query.statut)))
const page = computed(() => {
  const parsed = Number(routeQueryString(route.query.page))
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
})
const selectedId = computed(() => routeQueryString(route.query.demande) ?? null)
const listFilters = computed<ListerDemandesAssistanceQuery>(() => ({
  statut: status.value,
  page: page.value,
  taille: PAGE_SIZE,
}))

function workspaceQuery(overrides: { statut?: StatutDemandeAssistance; page?: number; demande?: string | null }) {
  const statut = overrides.statut ?? status.value
  const nextPage = overrides.page ?? page.value
  const demande = "demande" in overrides ? overrides.demande : selectedId.value
  return {
    ...(statut !== "nouvelle" ? { statut } : {}),
    ...(nextPage > 1 ? { page: String(nextPage) } : {}),
    ...(demande ? { demande } : {}),
  }
}

if (import.meta.server) {
  await Promise.allSettled([
    prefetchApi<DemandesAssistancePage>(
      queryClient,
      apiQueryKeys.assistant.list(listFilters.value),
      DEMANDES_ASSISTANCE_PATH,
      { ...listFilters.value },
    ),
    ...(selectedId.value
      ? [
          prefetchApi<DemandeAssistanceDetail>(
            queryClient,
            apiQueryKeys.assistant.detail(selectedId.value),
            `${DEMANDES_ASSISTANCE_PATH}/${encodeURIComponent(selectedId.value)}`,
          ),
        ]
      : []),
  ])
}

const listQuery = useDemandesAssistance(listFilters)
const detailQuery = useDemandeAssistance(selectedId)

function selectRequest(id: string) {
  void navigateTo({ path: route.path, query: { tab: "customer-requests", ...workspaceQuery({ demande: id }) } })
}

function setStatus(next: StatutDemandeAssistance) {
  void navigateTo({
    path: route.path,
    query: { tab: "customer-requests", ...workspaceQuery({ statut: next, page: 1 }) },
  })
}

function setPage(next: number) {
  void navigateTo({ path: route.path, query: { tab: "customer-requests", ...workspaceQuery({ page: next }) } })
}

function clearSelection() {
  void navigateTo({ path: route.path, query: { tab: "customer-requests", ...workspaceQuery({ demande: null }) } })
}
</script>

<template>
  <div class="grid min-h-0 w-full flex-1 grid-cols-1 border-t border-border bg-card lg:grid-cols-[340px_1fr]">
    <div
      class="h-full overflow-hidden border-r border-border bg-card"
      :class="selectedId ? 'hidden lg:block' : 'block'"
      data-testid="assistant-workspace-sidebar"
    >
      <AssistantListPanel
        :page-data="listQuery.data.value"
        :status="status"
        :page="page"
        :page-size="PAGE_SIZE"
        :selected-id="selectedId"
        :is-pending="listQuery.isPending.value"
        :error="listQuery.error.value"
        @select="selectRequest"
        @status="setStatus"
        @page="setPage"
      />
    </div>

    <div
      class="h-full overflow-hidden bg-muted/70"
      :class="selectedId ? 'block' : 'hidden lg:block'"
      data-testid="assistant-workspace-detail"
    >
      <AssistantDetailPanel
        :demande="detailQuery.data.value"
        :selected="Boolean(selectedId)"
        :is-pending="detailQuery.isPending.value"
        :error="detailQuery.error.value"
        :can-save-fiche="canSaveFiche"
        @retry="() => void detailQuery.refetch()"
        @back="clearSelection"
      />
    </div>
  </div>
</template>

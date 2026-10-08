<script setup lang="ts">
import type { Filter } from "@/components/vuzeno/filters"
import type { CaisseStatusFilter } from "@/stores/caisse-workspace"
import type { CaisseDetail, CaisseEncours, CaisseListItem } from "@/types/api/caisse"
import type { CaisseFilterCriteria } from "@/utils/filter-caisses"
import { computed } from "vue"
import { prefetchApi } from "@/composables/useApi"
import { useCaisse, useCaisses } from "@/composables/useCaisse"
import { prefetchTeam } from "@/composables/useTeam"
import { useCaisseWorkspaceStore } from "@/stores/caisse-workspace"
import { apiQueryKeys } from "@/utils/api-query-keys"

const STATUS_VALUES: Exclude<CaisseStatusFilter, undefined>[] = ["attention", "ouverte", "comptee", "litige", "validee"]

const { t } = useI18n()
const route = useRoute()
const workspace = useCaisseWorkspaceStore()

const filters = computed<CaisseFilterCriteria>({
  get: () => ({
    searchTerm: workspace.searchTerm,
    statusFilter: workspace.statusFilter,
    selectedPorteurId: workspace.selectedPorteurId,
  }),
  set: value => {
    workspace.setSearchTerm(value.searchTerm)
    workspace.setStatusFilter(value.statusFilter)
    workspace.setSelectedPorteur(value.selectedPorteurId)
  },
})

const toolbarFilters = computed<Filter[]>({
  get: () => [
    { field: "q", operator: "contains", value: filters.value.searchTerm || null },
    { field: "statut", operator: "eq", value: filters.value.statusFilter ?? null },
    { field: "porteur", operator: "eq", value: filters.value.selectedPorteurId },
  ],
  set: next => {
    const chip = (field: string) => next.find(candidate => candidate.field === field)?.value
    const searchValue = chip("q")
    const statusValue = chip("statut")
    const porteurValue = chip("porteur")

    workspace.setSearchTerm(typeof searchValue === "string" ? searchValue : "")
    workspace.setStatusFilter(
      typeof statusValue === "string" && STATUS_VALUES.includes(statusValue as Exclude<CaisseStatusFilter, undefined>)
        ? (statusValue as Exclude<CaisseStatusFilter, undefined>)
        : undefined,
    )
    workspace.setSelectedPorteur(typeof porteurValue === "string" ? porteurValue : null)
  },
})

const hasActiveToolbarFilters = computed(
  () =>
    Boolean(filters.value.searchTerm) ||
    filters.value.statusFilter !== undefined ||
    filters.value.selectedPorteurId !== null,
)

function clearToolbarFilters() {
  workspace.setSearchTerm("")
  workspace.setStatusFilter(undefined)
  workspace.setSelectedPorteur(null)
}

function parseId(raw: string | (string | null)[] | null | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw
  return typeof value === "string" && value.length > 0 ? value : null
}

const explicitId = computed(() => parseId(route.query.caisse))

const queryClient = useNuxtApp().$queryClient

if (import.meta.server) {
  await Promise.allSettled([
    prefetchApi<CaisseListItem[]>(queryClient, apiQueryKeys.caisse.list(), "/caisses"),
    prefetchApi<CaisseEncours[]>(queryClient, apiQueryKeys.caisse.encours, "/caisses/encours"),
    prefetchTeam(queryClient, { taille: 200 }),
    explicitId.value
      ? prefetchApi<CaisseDetail>(
          queryClient,
          apiQueryKeys.caisse.detail(explicitId.value),
          `/caisses/${encodeURIComponent(explicitId.value)}`,
        )
      : Promise.resolve(),
  ])
}

/** Nothing in the URL yet on first load — the list is already fetched (prefetched above), so open
 *  its first row rather than leaving the detail panel empty for no reason. */
const { data: caisseList } = useCaisses()
const effectiveId = computed(() => explicitId.value ?? caisseList.value?.[0]?.id ?? null)
const {
  data: selectedCaisse,
  isPending: isCaissePending,
  error: caisseError,
  refetch: refetchCaisse,
} = useCaisse(computed(() => effectiveId.value ?? ""))

function selectCaisse(id: string) {
  void navigateTo({ path: route.path, query: { ...route.query, caisse: id } })
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="shrink-0 border-t border-border px-4 py-3 sm:px-6 lg:px-10">
      <CaisseFilterBar
        v-model:filters="toolbarFilters"
        :has-active-filters="hasActiveToolbarFilters"
        @clear="clearToolbarFilters"
      />
    </div>

    <div class="grid flex-1 min-h-0 w-full grid-cols-1 border-t border-border bg-card lg:grid-cols-[300px_1fr]">
      <div class="h-full overflow-hidden border-r border-border bg-card" data-testid="caisse-workspace-sidebar">
        <CaisseListPanel :criteria="filters" :selected-id="effectiveId" @select="selectCaisse" />
      </div>

      <div class="h-full overflow-y-auto bg-muted/70" data-testid="caisse-detail-panel">
        <div v-if="caisseError" class="flex h-full items-center justify-center p-6 text-center">
          <ApiErrorCard :error="caisseError" @retry="() => void refetchCaisse()" />
        </div>
        <div
          v-else-if="effectiveId === null"
          data-testid="caisse-detail-empty"
          class="flex h-full items-center justify-center p-6"
        >
          <EmptyStateCard icon="ph:cursor-click" :text="t('caisse.page.empty')" />
        </div>
        <div v-else-if="isCaissePending" class="flex h-full items-center justify-center p-6 text-center">
          <p data-testid="caisse-detail-loading" class="text-sm text-muted-foreground">
            {{ t("caisse.page.loading") }}
          </p>
        </div>
        <CaisseDetailPanel v-else-if="selectedCaisse" :caisse="selectedCaisse" />
      </div>
    </div>
  </div>
</template>

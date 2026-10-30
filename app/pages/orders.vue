<script setup lang="ts">
import type { Filter } from "@/components/vuzeno/filters"
import type { CommandesFilters } from "@/composables/useOrders"
import type { CommandeAnnuairePage, CommandeDetail, StatutCommande } from "@/types/api/commandes"
import type { DevisDetail, DevisListItem, StatutDevis } from "@/types/api/devis"
import { computed } from "vue"
import { prefetchApi } from "@/composables/useApi"
import { useCachedSession } from "@/composables/useCachedSession"
import { prefetchOrders, useOrder, useOrders } from "@/composables/useOrders"
import { useComptoirs } from "@/composables/usePointsVente"
import { prefetchQuotes, useQuote, useQuotes } from "@/composables/useQuotes"
import { useOrderWorkspaceStore } from "@/stores/order-workspace"
import { useQuoteWorkspaceStore } from "@/stores/quote-workspace"
import { apiQueryKeys } from "@/utils/api-query-keys"
import { readingPerimetre, selectableComptoirs } from "@/utils/comptoirs"
import { toDateRangeFilterValue, toOrderDateRange } from "@/utils/order-date-range"

definePageMeta({ layout: "admin", roles: ["direction", "comptoir", "preparation", "livreur"] })

defineI18nRoute({
  paths: {
    en: "/orders",
    fr: "/commandes",
  },
})

const { t } = useI18n()
const route = useRoute()

const activeTab = computed(() => (route.query.quote !== undefined ? "quotes" : "orders"))
const orderWorkspace = useOrderWorkspaceStore()
const quoteWorkspace = useQuoteWorkspaceStore()
const session = useCachedSession()
const { comptoirs: publishedComptoirs } = useComptoirs()
/**
 * `?comptoir=` hors périmètre vaut un 403 sur toute la liste, pas une liste plus
 * courte : le backend refuse au lieu d'intersecter en silence. Le filtre ne
 * propose donc que ce qu'il pourrait demander.
 */
const comptoirs = computed(() => selectableComptoirs(publishedComptoirs.value, readingPerimetre(session.value)))

const filters = computed<CommandesFilters>({
  get: () => orderWorkspace.filters,
  set: value => {
    orderWorkspace.setSearchTerm(value.q ?? "")
    orderWorkspace.setStatus(value.statut)
    orderWorkspace.setComptoirs(value.comptoir ?? [])
    orderWorkspace.setSort(value.tri)
  },
})

/** A chip only ever hands back keys the counter list itself offered. */
function readComptoirs(value: unknown, known: readonly string[]): string[] {
  return Array.isArray(value)
    ? value.filter((cle): cle is string => typeof cle === "string" && known.includes(cle))
    : []
}

const toolbarFilters = computed<Filter[]>({
  get: () => [
    { field: "q", operator: "contains", value: filters.value.q ?? null },
    { field: "statut", operator: "eq", value: filters.value.statut ?? null },
    ...(comptoirs.value.length > 0
      ? [{ field: "comptoir", operator: "in", value: filters.value.comptoir ?? [] } as Filter]
      : []),
    { field: "tri", operator: "eq", value: filters.value.tri ?? "recent" },
    { field: "creeLe", operator: "btw", value: toDateRangeFilterValue(orderWorkspace.dateRange) },
  ],
  set: next => {
    const chip = (field: string) => next.find(candidate => candidate.field === field)?.value
    const searchValue = chip("q")
    const statusValue = chip("statut")
    const sortValue = chip("tri")

    orderWorkspace.setSearchTerm(typeof searchValue === "string" ? searchValue : "")
    orderWorkspace.setStatus(
      typeof statusValue === "string" && ORDER_STATUSES.includes(statusValue as StatutCommande)
        ? (statusValue as StatutCommande)
        : undefined,
    )
    orderWorkspace.setComptoirs(
      readComptoirs(
        chip("comptoir"),
        comptoirs.value.map(comptoir => comptoir.cle),
      ),
    )
    orderWorkspace.setSort(
      sortValue === "ancien" || sortValue === "montant-croissant" || sortValue === "montant-decroissant"
        ? sortValue
        : "recent",
    )
    orderWorkspace.setDateRange(toOrderDateRange(chip("creeLe") ?? null))
  },
})

const hasActiveToolbarFilters = computed(
  () =>
    Boolean(filters.value.q) ||
    Boolean(filters.value.statut) ||
    (filters.value.comptoir?.length ?? 0) > 0 ||
    (filters.value.tri !== undefined && filters.value.tri !== "recent") ||
    Boolean(orderWorkspace.dateRange),
)

function clearToolbarFilters() {
  orderWorkspace.setSearchTerm("")
  orderWorkspace.setStatus(undefined)
  orderWorkspace.setComptoirs([])
  orderWorkspace.setSort("recent")
  orderWorkspace.setDateRange(undefined)
}

function parseReference(raw: string | (string | null)[] | null | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw
  return typeof value === "string" && value.length > 0 ? value : null
}

const explicitReference = computed(() => parseReference(route.query.order))
const explicitQuoteReference = computed(() => {
  const reference = parseReference(route.query.quote)
  return reference === "1" ? null : reference
})

const queryClient = useNuxtApp().$queryClient

if (import.meta.server) {
  if (activeTab.value === "quotes") {
    await prefetchQuotes(queryClient, quoteWorkspace.filters.statut)
    const quoteList = queryClient.getQueryData<DevisListItem[]>(apiQueryKeys.quotes.list(quoteWorkspace.filters.statut))
    const quoteReference = explicitQuoteReference.value ?? quoteList?.[0]?.reference
    if (quoteReference) {
      await prefetchApi<DevisDetail>(
        queryClient,
        apiQueryKeys.quotes.detail(quoteReference),
        `/devis/${encodeURIComponent(quoteReference)}`,
      ).catch(() => undefined)
    }
  } else {
    await prefetchOrders(queryClient, filters.value)

    const listData = queryClient.getQueryData<{ pages: CommandeAnnuairePage[] }>(
      apiQueryKeys.orders.list(filters.value),
    )
    const detailReference = explicitReference.value ?? listData?.pages[0]?.elements[0]?.reference
    if (detailReference) {
      await prefetchApi<CommandeDetail>(
        queryClient,
        apiQueryKeys.orders.detail(detailReference),
        `/commandes/${encodeURIComponent(detailReference)}`,
      ).catch(() => undefined)
    }
  }
}

const listFilters = computed(() => filters.value)
const {
  data: listData,
  error: listError,
  refetch: refetchOrders,
} = useOrders(
  listFilters,
  computed(() => activeTab.value === "orders"),
)
const autoSelectedReference = computed(() => listData.value?.pages[0]?.elements[0]?.reference ?? null)
const effectiveReference = computed(() =>
  activeTab.value === "orders" ? (explicitReference.value ?? autoSelectedReference.value) : null,
)
const {
  data: selectedOrder,
  isPending: isOrderPending,
  error: orderError,
  refetch: refetchOrder,
} = useOrder(effectiveReference)

const quoteStatus = computed<StatutDevis | undefined>(() => quoteWorkspace.filters.statut)
const { data: quoteList } = useQuotes(
  quoteStatus,
  computed(() => activeTab.value === "quotes"),
)
const autoSelectedQuoteReference = computed(() => quoteList.value?.[0]?.reference ?? null)
const effectiveQuoteReference = computed(() =>
  activeTab.value === "quotes" ? (explicitQuoteReference.value ?? autoSelectedQuoteReference.value) : null,
)
const {
  data: selectedQuote,
  isPending: isQuotePending,
  error: quoteError,
  refetch: refetchQuote,
} = useQuote(effectiveQuoteReference)

const tabs = computed(() => [
  { value: "orders", label: t("orders.tabs.orders"), icon: "ph:receipt", testid: "orders-tab-orders" },
  { value: "quotes", label: t("orders.tabs.quotes"), icon: "ph:file-text", testid: "orders-tab-quotes" },
])

function selectOrder(reference: string) {
  const query = { ...route.query, order: reference, quote: undefined }
  void navigateTo({ path: route.path, query })
}

function selectQuote(reference: string) {
  const query = { ...route.query, quote: reference, order: undefined }
  void navigateTo({ path: route.path, query })
}

function updateQuoteStatus(status: StatutDevis | undefined) {
  quoteWorkspace.setStatus(status)
}

function retryQuote() {
  void refetchQuote()
}

function onQuoteArchived() {
  void navigateTo({ path: route.path, query: { ...route.query, quote: "1" } })
}

function switchTab(tab: string) {
  if (tab !== "orders" && tab !== "quotes") return

  const query =
    tab === "orders"
      ? { ...route.query, quote: undefined }
      : { ...route.query, order: undefined, quote: explicitQuoteReference.value ?? "1" }
  void navigateTo({ path: route.path, query })
}

useSeoMeta({
  title: () => t("orders.page.seo.title"),
  description: () => t("orders.page.seo.description"),
  ogTitle: () => t("orders.page.seo.title"),
  ogDescription: () => t("orders.page.seo.description"),
  ogType: "website",
})

useHead({
  titleTemplate: "%s",
})
</script>

<template>
  <div class="flex min-h-[calc(100dvh-4rem)] flex-col gap-4 py-4 lg:h-workspace lg:min-h-0 lg:overflow-hidden">
    <div>
      <AdminPageHeader :title="t('orders.page.heading')">
        {{ t("orders.page.subtitle") }}
        <template #tabs>
          <PillTabs :model-value="activeTab" :items="tabs" data-testid="orders-tabs" @update:model-value="switchTab" />
        </template>
      </AdminPageHeader>
    </div>
    <div v-if="activeTab === 'orders'" class="w-full min-w-0" data-testid="orders-filter-row">
      <OrdersFilterBar
        v-model:filters="toolbarFilters"
        :comptoirs="comptoirs"
        :has-active-filters="hasActiveToolbarFilters"
        @clear="clearToolbarFilters"
      />
    </div>

    <div
      v-if="activeTab === 'orders'"
      class="grid min-h-0 w-full flex-1 grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card shadow-xs lg:grid-cols-[320px_minmax(0,1fr)]"
    >
      <div
        class="h-56 overflow-hidden border-b border-border bg-card lg:h-full lg:border-r lg:border-b-0"
        data-testid="orders-workspace-sidebar"
      >
        <OrdersListPanel
          :filters="filters"
          :date-range="orderWorkspace.dateRange"
          :selected-reference="effectiveReference"
          @select="selectOrder"
          @update:filters="filters = $event"
        />
      </div>

      <div class="min-h-96 overflow-y-auto bg-muted/35 lg:h-full lg:min-h-0" data-testid="orders-detail-panel">
        <div
          v-if="listError && effectiveReference === null"
          class="flex h-full items-center justify-center p-6 text-center"
        >
          <ApiErrorCard :error="listError" @retry="() => void refetchOrders()" />
        </div>
        <div v-else-if="orderError" class="flex h-full items-center justify-center p-6 text-center">
          <ApiErrorCard :error="orderError" @retry="() => void refetchOrder()" />
        </div>
        <div
          v-else-if="effectiveReference === null"
          data-testid="orders-detail-empty"
          class="flex h-full items-center justify-center p-6"
        >
          <EmptyStateCard icon="ph:cursor-click" :text="t('orders.page.empty')" />
        </div>
        <OrdersDetailSkeleton v-else-if="isOrderPending" :label="t('orders.page.loading')" />
        <OrdersDetailPanel v-else-if="selectedOrder" :order="selectedOrder" />
      </div>
    </div>

    <QuotesWorkspace
      v-else
      :status="quoteStatus"
      :selected-reference="effectiveQuoteReference"
      :selected-quote="selectedQuote"
      :is-pending="isQuotePending"
      :error="quoteError"
      @select="selectQuote"
      @update:status="updateQuoteStatus"
      @retry="retryQuote"
      @archived="onQuoteArchived"
    />
  </div>
</template>

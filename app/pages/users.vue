<script setup lang="ts">
import type { Filter } from "@/components/vuzeno/filters"
import type { CustomerDirectoryPage, CustomerSort, CustomerStatus } from "@/types/api/clients"
import { computed, onBeforeUnmount, ref, watch } from "vue"
import { toast } from "vue-sonner"
import { prefetchApi } from "@/composables/useApi"
import { useCachedSession } from "@/composables/useCachedSession"
import { useCustomerMutations } from "@/composables/useCustomerMutations"
import { prefetchCustomers, useCustomer, useCustomers } from "@/composables/useCustomers"
import { apiErrorText } from "@/utils/api-error"
import { apiQueryKeys } from "@/utils/api-query-keys"
import { routeQueryString, routeQueryUuid } from "@/utils/route-query"

definePageMeta({ layout: "admin", roles: ["direction", "comptoir"] })

defineI18nRoute({
  paths: {
    en: "/users",
    fr: "/clients",
  },
})

const { t } = useI18n()
const route = useRoute()
const queryClient = useNuxtApp().$queryClient
const session = useCachedSession()
/** Le comptoir consulte l'annuaire ; seule la direction change un statut (`@Roles(direction)`). */
const canWrite = computed(() => session.value?.roles.includes("direction") ?? false)

function customerStatus(value: unknown): CustomerStatus | undefined {
  const status = routeQueryString(value)
  return status === "actif" || status === "suspendu" || status === "supprime" ? status : undefined
}

function customerSort(value: unknown): CustomerSort {
  return routeQueryString(value) === "nom" ? "nom" : "recent"
}

const selectedId = computed(() => routeQueryUuid(route.query.id))
const autoSelectionDismissed = ref(false)
const status = computed(() => customerStatus(route.query.statut))
const sort = computed(() => customerSort(route.query.tri))
const searchInput = ref(routeQueryString(route.query.q) ?? "")

watch(
  () => route.query.q,
  value => {
    const next = routeQueryString(value) ?? ""
    if (next !== searchInput.value) searchInput.value = next
  },
)

const listFilters = computed(() => {
  const q = searchInput.value.trim()
  return {
    ...(q ? { q } : {}),
    ...(status.value ? { statut: status.value } : {}),
    tri: sort.value,
    taille: 50,
  }
})

function workspaceQuery(overrides: { id?: string; q?: string; statut?: CustomerStatus; tri?: CustomerSort } = {}) {
  const q = "q" in overrides ? overrides.q : searchInput.value.trim() || undefined
  const id = "id" in overrides ? overrides.id : (selectedId.value ?? undefined)
  const statut = "statut" in overrides ? overrides.statut : status.value
  const tri = "tri" in overrides ? overrides.tri : sort.value

  return {
    ...(id ? { id } : {}),
    ...(q ? { q } : {}),
    ...(statut ? { statut } : {}),
    ...(tri !== "recent" ? { tri } : {}),
  }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
function updateSearch(value: string) {
  searchInput.value = value
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    void navigateTo({ path: route.path, query: workspaceQuery({ q: value.trim() || undefined }) })
  }, 300)
}

function updateStatus(value: CustomerStatus | undefined) {
  void navigateTo({ path: route.path, query: workspaceQuery({ statut: value }) })
}

function updateSort(value: CustomerSort) {
  void navigateTo({ path: route.path, query: workspaceQuery({ tri: value }) })
}

const toolbarFilters = computed<Filter[]>({
  get: () => [
    { field: "q", operator: "contains", value: searchInput.value || null },
    { field: "statut", operator: "eq", value: status.value ?? null },
    { field: "tri", operator: "eq", value: sort.value },
  ],
  set: next => {
    const chip = (field: string) => next.find(candidate => candidate.field === field)?.value
    const searchValue = chip("q")
    const statusValue = chip("statut")
    const sortValue = chip("tri")
    const nextSearch = typeof searchValue === "string" ? searchValue : ""
    const nextStatus =
      statusValue === "actif" || statusValue === "suspendu" || statusValue === "supprime" ? statusValue : undefined
    const nextSort = sortValue === "nom" ? "nom" : "recent"

    if (nextSearch !== searchInput.value) updateSearch(nextSearch)
    if (nextStatus !== status.value) updateStatus(nextStatus)
    if (nextSort !== sort.value) updateSort(nextSort)
  },
})

const hasActiveToolbarFilters = computed(
  () => Boolean(searchInput.value) || Boolean(status.value) || sort.value !== "recent",
)

function clearToolbarFilters() {
  if (searchTimer) clearTimeout(searchTimer)
  searchInput.value = ""
  void navigateTo({ path: route.path, query: workspaceQuery({ q: undefined, statut: undefined, tri: "recent" }) })
}

function selectCustomer(id: string) {
  autoSelectionDismissed.value = false
  void navigateTo({ path: route.path, query: workspaceQuery({ id }) })
}

function clearSelection() {
  autoSelectionDismissed.value = true
  void navigateTo({ path: route.path, query: workspaceQuery({ id: undefined }) })
}

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})

if (import.meta.server) {
  await prefetchCustomers(queryClient, listFilters.value)
  const listData = queryClient.getQueryData<{ pages: CustomerDirectoryPage[] }>(
    apiQueryKeys.customers.list(listFilters.value),
  )
  const detailId = selectedId.value ?? listData?.pages[0]?.elements[0]?.id

  if (detailId) {
    await prefetchApi(
      queryClient,
      apiQueryKeys.customers.detail(detailId),
      `/clients/${encodeURIComponent(detailId)}`,
    ).catch(() => undefined)
  }
}

const customerQuery = useCustomers(listFilters)
const customers = computed(() => customerQuery.data.value?.pages.flatMap(page => page.elements) ?? [])
const autoSelectedId = computed(() => (autoSelectionDismissed.value ? null : (customers.value[0]?.id ?? null)))
const effectiveId = computed(() => selectedId.value ?? autoSelectedId.value)
const customerDetailQuery = useCustomer(effectiveId)
const { suspend, reactivate } = useCustomerMutations()
const statusPending = computed(() => suspend.isPending.value || reactivate.isPending.value)

async function refetchCustomerState() {
  await Promise.all([customerQuery.refetch(), customerDetailQuery.refetch()])
}

async function suspendCustomer() {
  if (!effectiveId.value) return
  try {
    await suspend.mutateAsync(effectiveId.value)
    await refetchCustomerState()
    toast.success(t("users.toast.suspended"))
  } catch (error) {
    toast.error(apiErrorText(error, t))
  }
}

async function reactivateCustomer() {
  if (!effectiveId.value) return
  try {
    await reactivate.mutateAsync(effectiveId.value)
    await refetchCustomerState()
    toast.success(t("users.toast.reactivated"))
  } catch (error) {
    toast.error(apiErrorText(error, t))
  }
}

useSeoMeta({
  title: () => t("users.page.seo.title"),
  description: () => t("users.page.seo.description"),
  ogTitle: () => t("users.page.seo.title"),
  ogDescription: () => t("users.page.seo.description"),
  ogType: "website",
})

useHead({
  titleTemplate: "%s",
})
</script>

<template>
  <div class="-mx-4 flex h-workspace flex-col overflow-hidden sm:-mx-6 lg:-mx-10">
    <div class="px-4 sm:px-6 lg:px-10">
      <AdminPageHeader :title="t('users.page.heading')">
        <template #toolbar>
          <UsersFilterBar
            v-model:filters="toolbarFilters"
            :has-active-filters="hasActiveToolbarFilters"
            @clear="clearToolbarFilters"
          />
        </template>
      </AdminPageHeader>
    </div>

    <div class="grid flex-1 min-h-0 w-full grid-cols-1 border-t border-border bg-card lg:grid-cols-[300px_1fr]">
      <div
        class="h-full overflow-hidden border-r border-border bg-card"
        :class="effectiveId ? 'hidden lg:block' : 'block'"
        data-testid="users-workspace-sidebar"
      >
        <UsersListPanel
          :items="customers"
          :selected-id="effectiveId"
          :is-pending="customerQuery.isPending.value"
          :error="customerQuery.error.value"
          :has-next-page="Boolean(customerQuery.hasNextPage.value)"
          :is-fetching-next-page="customerQuery.isFetchingNextPage.value"
          @select="selectCustomer"
          @load-more="() => void customerQuery.fetchNextPage()"
        />
      </div>

      <div
        class="h-full overflow-y-auto bg-muted/70"
        :class="effectiveId ? 'block' : 'hidden lg:block'"
        data-testid="users-workspace-detail"
      >
        <UsersDetailPanel
          :detail="customerDetailQuery.data.value"
          :selected="Boolean(effectiveId)"
          :is-pending="customerDetailQuery.isPending.value"
          :error="customerDetailQuery.error.value"
          :can-write="canWrite"
          :status-pending="statusPending"
          @retry="() => void customerDetailQuery.refetch()"
          @back="clearSelection"
          @suspend="() => void suspendCustomer()"
          @reactivate="() => void reactivateCustomer()"
        />
      </div>
    </div>
  </div>
</template>

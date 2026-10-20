<script setup lang="ts">
import type { CustomerSearchPeriod } from "@/types/api/customer-searches"
import type { ApiStatistiquesApercu } from "@/types/api/statistiques"
import { computed, ref } from "vue"
import CustomerSearchRequests from "@/components/stats/CustomerSearchRequests/CustomerSearchRequests.vue"
import { prefetchApi } from "@/composables/useApi"
import { apiQueryKeys } from "@/utils/api-query-keys"

definePageMeta({ layout: "admin", team: true })

defineI18nRoute({
  paths: {
    en: "/",
    fr: "/",
  },
})

const { t } = useI18n({ useScope: "local" })
const { periode } = usePeriode()
const queryClient = useNuxtApp().$queryClient
const session = useCachedSession(queryClient)
const canViewCustomerSearches = computed(() => session.value?.roles.includes("direction") ?? false)
const customerSearchDays = ref<CustomerSearchPeriod>(30)

if (import.meta.server) {
  await prefetchApi<ApiStatistiquesApercu>(
    queryClient,
    apiQueryKeys.statistics.overview(periode.value),
    "/statistiques/apercu",
    { periode: periode.value },
  )
}

const { data, dataUpdatedAt, error, isFetching, isPending, refetch } = useStatistiquesApercu(periode)
const {
  data: customerSearches,
  error: customerSearchesError,
  isFetching: customerSearchesFetching,
  isPending: customerSearchesPending,
  refetch: refetchCustomerSearches,
} = useCustomerSearches(customerSearchDays, canViewCustomerSearches)

function refresh() {
  void refetch()
}

function refreshCustomerSearches() {
  void refetchCustomerSearches()
}

useSeoMeta({
  title: () => t("seo.title"),
  description: () => t("seo.description"),
  ogTitle: () => t("seo.title"),
  ogDescription: () => t("seo.description"),
  ogType: "website",
})

useHead({
  titleTemplate: "%s",
})
</script>

<template>
  <div class="space-y-6 pb-12">
    <AdminPageHeader :title="t('heading')">
      {{ t("subtitle") }}
      <template #actions>
        <StatsRangePicker v-model="periode" :busy="isFetching" :updated-at="dataUpdatedAt" @refresh="refresh" />
      </template>
    </AdminPageHeader>

    <ApiErrorCard v-if="error" :error="error" @retry="refresh" />
    <StatsOverviewSkeleton v-else-if="isPending && !data" :label="t('loading')" />
    <StatsOverviewBlocks v-else-if="data" :data="data" :busy="isFetching" />

    <CustomerSearchRequests
      v-if="canViewCustomerSearches"
      v-model:days="customerSearchDays"
      :data="customerSearches"
      :error="customerSearchesError"
      :pending="customerSearchesPending"
      :busy="customerSearchesFetching"
      @retry="refreshCustomerSearches"
    />
  </div>
</template>

<i18n lang="json">
{
  "en": {
    "heading": "Operations overview",
    "subtitle": "What needs your attention today.",
    "loading": "Loading overview...",
    "title": "KatiMarket Admin",
    "seo": {
      "title": "KatiMarket Admin",
      "description": "Overview of KatiMarket sales, operations, cash health and open actions."
    }
  },
  "fr": {
    "heading": "Pilotage",
    "subtitle": "Ce qui demande votre attention aujourd’hui.",
    "loading": "Chargement de la vue d’ensemble...",
    "title": "Administration KatiMarket",
    "seo": {
      "title": "Administration KatiMarket",
      "description": "Vue d’ensemble des ventes, opérations, caisse et actions KatiMarket."
    }
  }
}
</i18n>

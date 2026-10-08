<script setup lang="ts">
import type { ApiStatistiquesApercu } from "@/types/api/statistiques"

const { data, busy = false } = defineProps<{
  data: ApiStatistiquesApercu
  busy?: boolean
}>()
</script>

<template>
  <!--
    Dimmed rather than replaced while a refetch is in flight: the period tabs and
    the range picker both swap the whole payload, and blanking six cards to
    skeletons on every switch reads as a page load rather than as a filter.
  -->
  <div class="space-y-6 transition-opacity duration-200" :class="busy && 'opacity-60'" :aria-busy="busy">
    <StatsKpiGrid v-if="data.kpis" :kpis="data.kpis" :periode="data.periode.id" />

    <StatsOverviewAnalyticsRow v-if="data.salesStatistics || data.totalProfit || data.catalogueSummary" :data="data" />

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <StatsRecentTransactionsCard :transactions="data.recentTransactions" />
      <StatsTopSellingProductsCard v-if="data.topSellingProducts" :products="data.topSellingProducts" />
    </div>
  </div>
</template>

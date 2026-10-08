<script setup lang="ts">
import type { ApiStatistiquesApercu } from "@/types/api/statistiques"

const { data } = defineProps<{
  data: ApiStatistiquesApercu
}>()
</script>

<template>
  <div data-testid="overview-analytics-row" class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
    <div v-if="data.salesStatistics" class="min-w-0">
      <StatsSalesStatisticsCard :data="data.salesStatistics" :granularite="data.periode.granularite" />
    </div>
    <div
      v-if="data.totalProfit || data.catalogueSummary"
      data-testid="overview-other-items"
      class="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2"
    >
      <div
        v-if="data.totalProfit || data.catalogueSummary"
        data-testid="overview-profit-column"
        class="grid min-w-0 grid-cols-1 gap-4"
      >
        <div v-if="data.totalProfit" class="min-w-0">
          <StatsTotalProfitCard :data="data.totalProfit" :granularite="data.periode.granularite" />
        </div>
        <div v-if="data.catalogueSummary" class="min-w-0">
          <StatsCatalogueSummaryCard :data="data.catalogueSummary" metric="totalCategories" />
        </div>
      </div>
      <div v-if="data.catalogueSummary" data-testid="overview-catalogue-column" class="min-w-0">
        <StatsCatalogueSummaryCards :data="data.catalogueSummary" :hide-categories="true" />
      </div>
    </div>
  </div>
</template>

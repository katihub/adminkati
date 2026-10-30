<script setup lang="ts">
import type { ApiStatistiquesApercu, Periode } from "@/types/api/statistiques"
import { computed } from "vue"

const { kpis = {}, periode } = defineProps<{
  kpis?: NonNullable<ApiStatistiquesApercu["kpis"]>
  periode: Periode
}>()

const { t } = useI18n()

const periodLabel = computed(() => t(`stats.kpis.periodLabels.${periode}`))
</script>

<template>
  <div
    class="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4"
  >
    <StatsKpiCard
      v-if="kpis.totalSales"
      :title="t('stats.kpis.totalSales')"
      :valeur="kpis.totalSales.valeur"
      :precedent="kpis.totalSales.precedent"
      :period-label="periodLabel"
      :unit="t('stats.unites')"
      icon="ph:chart-line-up"
      to="/orders"
      class="min-w-[78vw] snap-start sm:min-w-0"
    />
    <StatsKpiCard
      v-if="kpis.totalStock"
      :title="t('stats.kpis.totalStock')"
      :sub-title="t('stats.kpis.totalStockSubtitle')"
      :valeur="kpis.totalStock.valeur"
      :precedent="kpis.totalStock.precedent"
      :period-label="t('stats.kpis.periodLabels.stock')"
      :unit="t('stats.unites')"
      show-absolute-delta
      icon="ph:package"
      to="/products"
      class="min-w-[78vw] snap-start sm:min-w-0"
    />
    <StatsKpiCard
      v-if="kpis.returnProducts"
      :title="t('stats.kpis.returnProducts')"
      :valeur="kpis.returnProducts.valeur"
      :precedent="kpis.returnProducts.precedent"
      :period-label="periodLabel"
      :unit="t('stats.unites')"
      icon="ph:arrows-clockwise"
      to="/orders"
      class="min-w-[78vw] snap-start sm:min-w-0"
    />
    <StatsKpiCard
      v-if="kpis.productRevenue"
      :title="t('stats.kpis.productRevenue')"
      :valeur="kpis.productRevenue.valeur"
      :precedent="kpis.productRevenue.precedent"
      :period-label="periodLabel"
      is-currency
      icon="ph:chart-bar"
      to="/orders"
      class="min-w-[78vw] snap-start sm:min-w-0"
    />
  </div>
</template>

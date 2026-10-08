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
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <StatsKpiCard
      v-if="kpis.totalSales"
      :title="t('stats.kpis.totalSales')"
      :valeur="kpis.totalSales.valeur"
      :precedent="kpis.totalSales.precedent"
      :period-label="periodLabel"
      :unit="t('stats.unites')"
      icon="ph:chart-line-up"
      to="/orders"
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
    />
  </div>
</template>

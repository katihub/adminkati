<script setup lang="ts">
import type { CatalogueSummaryData } from "@/types/api/statistiques"
import { computed } from "vue"

type CatalogueMetric = keyof CatalogueSummaryData

const { data, hideCategories = false } = defineProps<{
  data: CatalogueSummaryData
  hideCategories?: boolean
}>()

const { t } = useI18n()

const metrics = computed<CatalogueMetric[]>(() =>
  hideCategories
    ? ["totalProducts", "totalBrands", "totalDepartments"]
    : ["totalProducts", "totalBrands", "totalDepartments", "totalCategories"],
)
</script>

<template>
  <div
    data-testid="catalogue-summary"
    role="group"
    :aria-label="t('stats.catalogue.title')"
    class="grid h-full grid-cols-1 gap-4"
  >
    <StatsCatalogueSummaryCard v-for="metric in metrics" :key="metric" :data="data" :metric="metric" />
  </div>
</template>

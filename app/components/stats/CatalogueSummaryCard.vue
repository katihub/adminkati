<script setup lang="ts">
import type { CatalogueSummaryData } from "@/types/api/statistiques"
import { computed } from "vue"

type CatalogueMetric = keyof CatalogueSummaryData

const { data, metric } = defineProps<{
  data: CatalogueSummaryData
  metric: CatalogueMetric
}>()

const { locale, t } = useI18n()

const definition = computed(() => {
  const definitions: Record<CatalogueMetric, { icon: string; label: string; testId: string }> = {
    totalProducts: {
      label: t("stats.catalogue.totalProducts"),
      icon: "ph:package",
      testId: "catalogue-summary-total-products",
    },
    totalBrands: {
      label: t("stats.catalogue.totalBrands"),
      icon: "ph:tag",
      testId: "catalogue-summary-total-brands",
    },
    totalDepartments: {
      label: t("stats.catalogue.totalDepartments"),
      icon: "ph:storefront",
      testId: "catalogue-summary-total-departments",
    },
    totalCategories: {
      label: t("stats.catalogue.totalCategories"),
      icon: "ph:tree-structure",
      testId: "catalogue-summary-total-categories",
    },
  }

  return definitions[metric]
})

function formatCount(value: number) {
  return new Intl.NumberFormat(locale.value).format(value)
}
</script>

<template>
  <article
    :data-testid="definition.testId"
    class="flex min-h-32 flex-col justify-between rounded-2xl bg-card p-5 text-card-foreground"
  >
    <div class="flex items-center gap-2 text-muted-foreground">
      <Icon :name="definition.icon" size="18" aria-hidden="true" />
      <span class="text-xs font-medium">{{ definition.label }}</span>
    </div>
    <p class="mt-3 text-2xl font-extrabold tracking-tight text-foreground">
      {{ formatCount(data[metric]) }}
    </p>
  </article>
</template>

<script setup lang="ts">
import type { CustomerSearchDashboard } from "@/types/api/customer-searches"

const { summary } = defineProps<{
  summary: CustomerSearchDashboard["resume"]
}>()

const { t } = useI18n({ useScope: "local" })
</script>

<template>
  <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
    <article data-testid="customer-search-total" class="rounded-2xl bg-muted/50 p-4">
      <p class="text-xs font-medium text-muted-foreground">{{ t("total") }}</p>
      <p class="mt-2 font-heading text-2xl font-semibold tabular-nums">{{ summary.total }}</p>
    </article>
    <article data-testid="customer-search-unique" class="rounded-2xl bg-muted/50 p-4">
      <p class="text-xs font-medium text-muted-foreground">{{ t("unique") }}</p>
      <p class="mt-2 font-heading text-2xl font-semibold tabular-nums">{{ summary.uniques }}</p>
    </article>
    <article data-testid="customer-search-today" class="rounded-2xl bg-muted/50 p-4">
      <p class="text-xs font-medium text-muted-foreground">{{ t("today") }}</p>
      <p class="mt-2 font-heading text-2xl font-semibold tabular-nums">{{ summary.aujourdhui }}</p>
    </article>
  </div>
</template>

<i18n lang="json">
{
  "en": {
    "total": "Submitted searches",
    "unique": "Unique terms",
    "today": "Today"
  },
  "fr": {
    "total": "Recherches validées",
    "unique": "Termes uniques",
    "today": "Aujourd’hui"
  }
}
</i18n>

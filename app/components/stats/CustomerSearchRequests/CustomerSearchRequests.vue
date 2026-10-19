<script setup lang="ts">
import type { CustomerSearchDashboard, CustomerSearchPeriod } from "@/types/api/customer-searches"
import CustomerSearchLists from "./CustomerSearchLists.vue"
import CustomerSearchSummary from "./CustomerSearchSummary.vue"

const {
  data,
  days,
  busy = false,
  pending = false,
  error = null,
} = defineProps<{
  data?: CustomerSearchDashboard
  days: CustomerSearchPeriod
  busy?: boolean
  pending?: boolean
  error?: unknown
}>()

const emit = defineEmits<{
  "update:days": [days: CustomerSearchPeriod]
  retry: []
}>()

const { t } = useI18n({ useScope: "local" })

function changePeriod(event: Event) {
  emit("update:days", Number((event.target as HTMLSelectElement).value) as CustomerSearchPeriod)
}
</script>

<template>
  <section data-testid="customer-search-requests">
    <ApiErrorCard v-if="error" :error="error" @retry="emit('retry')" />

    <div
      v-else-if="pending && !data"
      class="min-h-64 animate-pulse rounded-3xl bg-card p-6"
      aria-busy="true"
      :aria-label="t('loading')"
    >
      <div class="h-5 w-52 rounded bg-muted" />
      <div class="mt-6 grid grid-cols-3 gap-3">
        <div v-for="index in 3" :key="index" class="h-20 rounded-2xl bg-muted" />
      </div>
    </div>

    <StatsBlockShell v-else-if="data" :title="t('title')" :busy="busy">
      <template #header>
        <label class="sr-only" for="customer-search-period">{{ t("periodLabel") }}</label>
        <select
          id="customer-search-period"
          data-testid="customer-search-period"
          class="h-9 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          :value="days"
          @change="changePeriod"
        >
          <option value="7">{{ t("days", { count: 7 }) }}</option>
          <option value="30">{{ t("days", { count: 30 }) }}</option>
          <option value="90">{{ t("days", { count: 90 }) }}</option>
        </select>
      </template>

      <template v-if="data.resume.total === 0">
        <p data-testid="customer-search-empty" class="text-sm text-muted-foreground">{{ t("empty") }}</p>
      </template>

      <template v-else>
        <CustomerSearchSummary :summary="data.resume" />
        <CustomerSearchLists :popular="data.populaires" :recent="data.recentes" />
      </template>
    </StatsBlockShell>
  </section>
</template>

<i18n lang="json">
{
  "en": {
    "title": "Customer searches",
    "loading": "Loading customer searches...",
    "periodLabel": "Analysis period",
    "days": "Last {count} days",
    "empty": "No submitted searches for this period yet."
  },
  "fr": {
    "title": "Recherches clients",
    "loading": "Chargement des recherches clients...",
    "periodLabel": "Période d’analyse",
    "days": "{count} derniers jours",
    "empty": "Aucune recherche validée sur cette période pour le moment."
  }
}
</i18n>

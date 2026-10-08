<script setup lang="ts">
import type { Granularite, TotalProfit } from "@/types/api/statistiques"
import { computed } from "vue"
import { formatLabelSeau } from "@/utils/dates"
import { formatMontant } from "@/utils/money"

const { data, granularite } = defineProps<{
  data: TotalProfit
  granularite: Granularite
}>()

const { locale, t } = useI18n()

const total = computed(() => (data.status === "complete" ? formatMontant(data.total, locale.value) : null))
const totalDisplay = computed(() => total.value?.affiche ?? "—")

/**
 * Stacked, and the stack means something: margin plus cost of goods is the
 * bucket's revenue. Stacking profit on top of revenue would draw the margin
 * twice and make every bar taller than the money that came in.
 */
const categories = computed(() => ({
  profit: {
    name: t("stats.profit.totalProfit"),
    color: "#10b981",
  },
  cout: {
    name: t("stats.profit.cout"),
    color: "#0d9488",
  },
}))

function xFormatter(_tick: number | Date, i?: number): string {
  if (data.status !== "complete") return ""
  const point = i === undefined ? undefined : data.serie[i]
  return point ? formatLabelSeau(point.debut, granularite, locale.value) : ""
}
</script>

<template>
  <div class="flex flex-col justify-between rounded-2xl bg-card p-5 text-card-foreground lg:col-span-3">
    <div class="flex items-center justify-between">
      <h3 class="text-base font-medium text-foreground">
        {{ t("stats.blocks.totalProfit") }}
      </h3>
      <StatsCardLink to="/orders" :label="t('stats.actions.viewMore')" />
    </div>

    <div class="mt-4 flex flex-wrap items-baseline justify-between gap-2">
      <div class="text-2xl font-bold font-heading tracking-tight text-foreground sm:text-3xl" :title="total?.exact">
        {{ totalDisplay }}
      </div>
    </div>

    <div
      v-if="data.status === 'complete'"
      class="mt-2 flex items-center gap-3 text-xs font-medium text-muted-foreground"
    >
      <div class="flex items-center gap-1.5">
        <span class="size-2.5 rounded-full bg-emerald-500" />
        <span>{{ t("stats.profit.totalProfit") }}</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="size-2.5 rounded-full bg-teal-600 dark:bg-teal-400" />
        <span>{{ t("stats.profit.cout") }}</span>
      </div>
    </div>

    <div class="mt-4 h-48 w-full min-w-0">
      <BarChart
        v-if="data.status === 'complete' && data.serie.length > 0"
        :data="data.serie"
        :height="190"
        :y-axis="['profit', 'cout']"
        :stacked="true"
        :categories="categories"
        :x-formatter="xFormatter"
        :hide-legend="true"
        :radius="3"
        :bar-padding="0.35"
        :padding="{ top: 10, right: 10, bottom: 20, left: 10 }"
        :hide-y-axis="true"
      />
      <p v-else class="flex h-full items-center justify-center text-xs text-muted-foreground">
        {{ t("stats.vide") }}
      </p>
    </div>
  </div>
</template>

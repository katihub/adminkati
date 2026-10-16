<script setup lang="ts">
import type { Granularite, SalesStatisticsPoint } from "@/types/api/statistiques"
import { computed } from "vue"
import { CurveType } from "vue-chrts/enums"
import { brand } from "~~/brand.config"
import { formatLabelSeau } from "@/utils/dates"

const { data = [], granularite } = defineProps<{
  data?: SalesStatisticsPoint[]
  granularite: Granularite
}>()

const { locale, t } = useI18n()

const categories = computed(() => ({
  current: {
    name: t("stats.chart.current"),
    color: brand.colors.orange,
  },
  previous: {
    name: t("stats.chart.previous"),
    color: brand.colors.navy,
  },
}))

function xFormatter(_tick: number | Date, i?: number): string {
  const point = i === undefined ? undefined : data[i]
  return point ? formatLabelSeau(point.debut, granularite, locale.value) : ""
}

/** Axis ticks are compacted per locale: `1,4 M` in French, `1.4M` in English. */
function yFormatter(tick: number | Date): string {
  return new Intl.NumberFormat(locale.value, { notation: "compact", maximumFractionDigits: 1 }).format(Number(tick))
}
</script>

<template>
  <div class="h-64 w-full">
    <AreaChart
      v-if="data && data.length > 0"
      :data="data"
      :height="250"
      :categories="categories"
      :x-formatter="xFormatter"
      :y-formatter="yFormatter"
      :curve-type="CurveType.Natural"
      :hide-legend="true"
      :line-width="2.5"
      :y-num-ticks="4"
      :padding="{ top: 20, right: 10, bottom: 20, left: 45 }"
    />
  </div>
</template>

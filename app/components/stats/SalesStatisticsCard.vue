<script setup lang="ts">
import type { Granularite, Periode, SalesStatisticsData } from "@/types/api/statistiques"
import { computed } from "vue"
import { Button } from "@/components/ui/button"
import { formatMontant } from "@/utils/money"

const { data, granularite } = defineProps<{
  data: SalesStatisticsData
  granularite: Granularite
}>()

const { locale, t } = useI18n()
const { periode } = usePeriode()

/**
 * The tabs are shortcuts into the same period the header picker drives, not a
 * second filter: two controls silently disagreeing about what the chart shows is
 * worse than three presets that happen to be the common ones.
 */
const ONGLETS: readonly { cle: string; periode: Periode }[] = [
  { cle: "weekly", periode: "7j" },
  { cle: "monthly", periode: "30j" },
  { cle: "yearly", periode: "12mois" },
]

const total = computed(() => formatMontant(data.total, locale.value))
</script>

<template>
  <div class="flex flex-col justify-between rounded-2xl bg-card p-5 text-card-foreground lg:col-span-6">
    <div class="flex items-center justify-between">
      <h3 class="text-base font-medium text-foreground">
        {{ t("stats.blocks.salesStatistics") }}
      </h3>
      <StatsCardLink to="/orders" :label="t('stats.actions.viewMore')" />
    </div>

    <div class="mt-4 flex flex-wrap items-baseline justify-between gap-4">
      <div class="text-2xl font-bold font-heading tracking-tight text-foreground sm:text-3xl" :title="total.exact">
        {{ total.affiche }}
      </div>
      <div class="flex items-center gap-4 text-xs font-medium text-muted-foreground">
        <div class="flex items-center gap-1.5">
          <span class="size-2.5 rounded-full bg-emerald-500" />
          <span>{{ t("stats.chart.current") }}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="size-2.5 rounded-full bg-teal-600 dark:bg-teal-400" />
          <span>{{ t("stats.chart.previous") }}</span>
        </div>
      </div>
    </div>

    <!--
      The same segmented control as the header's range picker, deliberately: both
      write the same period, so wearing two different faces would suggest they
      filter two different things. Going through `Button` also inherits the design
      system's focus ring, which the hand-rolled tabs did not have.
    -->
    <div
      role="group"
      :aria-label="t('stats.actions.period')"
      class="mt-3 flex flex-wrap items-center gap-1 self-start rounded-2xl bg-muted/60 p-1"
    >
      <Button
        v-for="onglet in ONGLETS"
        :key="onglet.cle"
        variant="ghost"
        size="sm"
        :aria-pressed="periode === onglet.periode"
        :class="periode === onglet.periode && 'bg-background text-foreground shadow-sm'"
        @click="periode = onglet.periode"
      >
        {{ t(`stats.tabs.${onglet.cle}`) }}
      </Button>
    </div>

    <div class="mt-4 min-w-0">
      <StatsSalesStatisticsChart :data="data.serie" :granularite="granularite" />
    </div>
  </div>
</template>

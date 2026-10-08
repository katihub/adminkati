<script setup lang="ts">
import type { SensDelta } from "@/utils/delta"
import { computed } from "vue"
import { computeDelta } from "@/utils/delta"
import { formatMontant } from "@/utils/money"

const {
  title,
  subTitle,
  valeur,
  precedent,
  periodLabel,
  icon,
  iconBgClass = "bg-teal-500/15 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400",
  to = "/orders",
  linkLabel,
  unit,
  isCurrency = false,
  showAbsoluteDelta = false,
} = defineProps<{
  title: string
  subTitle?: string
  valeur: number
  precedent: number | null
  periodLabel?: string
  icon: string
  iconBgClass?: string
  to?: string
  linkLabel?: string
  unit?: string
  isCurrency?: boolean
  showAbsoluteDelta?: boolean
}>()

function absoluteDeltaText(
  value: number,
  previous: number | null,
  unit: string | undefined,
  locale: string,
  unavailable: string,
) {
  if (previous === null) return unavailable
  const difference = value - previous
  const formatted = new Intl.NumberFormat(locale).format(Math.abs(difference))
  return `${difference < 0 ? "−" : "+"}${formatted} ${unit ?? ""}`.trim()
}

function percentageDeltaText(percent: number | null, direction: SensDelta, locale: string, unavailable: string) {
  if (percent === null) return unavailable
  const formatted = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(Math.abs(percent))
  return `${formatted}% ${direction === "baisse" ? "↓" : "↑"}`
}

const { locale, t } = useI18n()

const montant = computed(() => formatMontant(valeur, locale.value))

const displayValue = computed(() => {
  if (isCurrency) return montant.value.affiche
  const formatted = new Intl.NumberFormat(locale.value).format(valeur)
  return unit ? `${formatted} ${unit}` : formatted
})

const delta = computed(() => computeDelta(valeur, precedent))

/**
 * Stock is a level, so a percentage against last month's level says nothing a
 * buyer can act on; the units that actually came in do. Every other KPI is a
 * flow, where the percentage is the whole point.
 */
const badgeText = computed(() => {
  const unavailable = t("stats.indisponible")
  return showAbsoluteDelta
    ? absoluteDeltaText(valeur, precedent, unit, locale.value, unavailable)
    : percentageDeltaText(delta.value.pct, delta.value.sens, locale.value, unavailable)
})

const isNegative = computed(() =>
  showAbsoluteDelta && precedent !== null ? valeur < precedent : delta.value.sens === "baisse",
)
</script>

<template>
  <div class="flex flex-col justify-between rounded-2xl bg-card p-5 text-card-foreground">
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="flex size-10 shrink-0 items-center justify-center rounded-full" :class="iconBgClass">
          <Icon :name="icon" size="20" aria-hidden="true" />
        </div>
        <div>
          <span class="block text-sm font-medium text-foreground/80">{{ title }}</span>
          <span v-if="subTitle" class="block text-xs text-muted-foreground">{{ subTitle }}</span>
        </div>
      </div>
      <NuxtLinkLocale
        v-if="to"
        :to="to"
        :aria-label="linkLabel || title"
        class="flex size-7 items-center justify-center rounded-lg border border-border/40 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Icon name="ph:arrow-up-right" size="14" aria-hidden="true" />
      </NuxtLinkLocale>
    </div>

    <div class="my-4">
      <span
        class="text-3xl font-heading font-extrabold tracking-tight text-foreground"
        :title="isCurrency ? montant.exact : undefined"
      >
        {{ displayValue }}
      </span>
    </div>

    <div class="flex items-center justify-between border-t border-border/30 pt-3 text-xs text-muted-foreground">
      <span>{{ periodLabel }}</span>
      <span
        class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold"
        :class="
          isNegative
            ? 'bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
            : 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
        "
      >
        {{ badgeText }}
      </span>
    </div>
  </div>
</template>

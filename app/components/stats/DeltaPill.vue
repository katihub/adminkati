<script setup lang="ts">
import type { SensDelta } from "@/utils/delta"
import { computed } from "vue"
import { computeDelta } from "@/utils/delta"

const {
  courant,
  precedent,
  tone = "card",
} = defineProps<{
  courant: number
  precedent: number | null
  /** `slab` because a success-green pill on a green slab is invisible. */
  tone?: "slab" | "card"
}>()

const { locale, t } = useI18n()

const icones: Record<SensDelta, string> = {
  hausse: "ph:arrow-up-right",
  baisse: "ph:arrow-down-right",
  stable: "ph:minus",
}

const delta = computed(() => computeDelta(courant, precedent))

const valeur = computed(() => {
  const { pct } = delta.value
  if (pct === null) return t("stats.indisponible")
  return new Intl.NumberFormat(locale.value, {
    style: "percent",
    signDisplay: "exceptZero",
    maximumFractionDigits: 1,
  }).format(pct / 100)
})

const etiquette = computed(() =>
  delta.value.pct === null
    ? t("stats.delta.indisponible")
    : t(`stats.delta.${delta.value.sens}`, { valeur: valeur.value }),
)

const classesTon = computed(() => {
  if (tone === "slab") return "bg-stat-slab-fill text-stat-slab-foreground"
  if (delta.value.sens === "hausse") return "bg-success/15 text-success"
  if (delta.value.sens === "baisse") return "bg-destructive/15 text-destructive"
  return "bg-muted text-muted-foreground"
})
</script>

<template>
  <!--
    The arrow glyph and the explicit sign both carry the direction, so hue is
    never the only thing saying which way the figure moved.
  -->
  <span
    role="img"
    class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
    :class="classesTon"
    :aria-label="etiquette"
    data-testid="stats-delta-pill"
  >
    <Icon :name="icones[delta.sens]" size="14" aria-hidden="true" class="shrink-0" />
    {{ valeur }}
  </span>
</template>

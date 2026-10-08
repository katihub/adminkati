<script setup lang="ts">
import { computed } from "vue"
import { formatMontant } from "@/utils/money"

const { valeur } = defineProps<{
  valeur: number
}>()

const { locale } = useI18n()

const montant = computed(() => formatMontant(valeur, locale.value))
</script>

<template>
  <!--
    role="img" so the exact figure in aria-label is what gets announced: a bare
    aria-label on a generic span is not guaranteed to be exposed, and the whole
    point is that compaction never hides the precise amount.
  -->
  <span role="img" :title="montant.exact" :aria-label="montant.exact" data-testid="stats-amount">{{
    montant.affiche
  }}</span>
</template>

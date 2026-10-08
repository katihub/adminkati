<script setup lang="ts">
import type { CaisseEcart, StatutRemiseCaisse } from "@/types/api/caisse"
import { computed } from "vue"
import { CAISSE_ECART_MOTIFS } from "@/utils/caisse-ecart-motifs"
import { formatDateCourte } from "@/utils/dates"
import { formatMontant } from "@/utils/money"

export interface EnrichedEcart extends CaisseEcart {
  arbitreName: string
}

const { ecarts, statut } = defineProps<{
  ecarts: EnrichedEcart[]
  statut: StatutRemiseCaisse
}>()

const { locale, t } = useI18n()

/** A `litige` caisse with no named discrepancy yet genuinely needs one before it can be
 *  validated — distinct from any other status with an empty `ecarts` array, which has none
 *  by definition (nothing to name). */
const needsDiscrepancy = computed(() => statut === "litige" && ecarts.length === 0)

function motifLabel(motif: string): string {
  const known = CAISSE_ECART_MOTIFS.find(candidate => candidate.value === motif)
  return known ? t(known.labelKey) : motif
}
</script>

<template>
  <section class="rounded-3xl bg-card p-4 sm:p-6" data-testid="caisse-ecarts-list">
    <h3 class="mb-4 border-b border-border/70 pb-4 font-heading text-lg font-semibold text-foreground">
      {{ t("caisse.detail.discrepanciesTitle") }}
    </h3>

    <div
      v-if="needsDiscrepancy"
      data-testid="caisse-ecarts-needed"
      class="rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
    >
      {{ t("caisse.detail.discrepancyNeeded") }}
    </div>

    <div
      v-else-if="ecarts.length === 0"
      data-testid="caisse-ecarts-empty"
      class="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground"
    >
      {{ t("caisse.detail.noDiscrepancies") }}
    </div>

    <ul v-else class="space-y-3">
      <li
        v-for="line in ecarts"
        :key="line.id"
        data-testid="caisse-ecart-row"
        class="rounded-2xl border border-border/70 p-3"
      >
        <div class="flex items-center justify-between gap-3">
          <span class="font-medium text-destructive">{{ formatMontant(line.montant, locale).affiche }}</span>
          <span class="text-xs text-muted-foreground">{{ formatDateCourte(line.creeLe, locale) }}</span>
        </div>
        <p class="mt-1 text-sm font-medium text-foreground">
          {{ motifLabel(line.motif) }}
        </p>
        <p v-if="line.commentaire" class="mt-0.5 text-sm text-muted-foreground">
          {{ line.commentaire }}
        </p>
        <p class="mt-1 text-xs text-muted-foreground">{{ t("caisse.detail.namedBy") }} {{ line.arbitreName }}</p>
      </li>
    </ul>
  </section>
</template>

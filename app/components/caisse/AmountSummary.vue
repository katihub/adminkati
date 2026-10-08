<script setup lang="ts">
import type { CaisseDetail } from "@/types/api/caisse"
import { computed } from "vue"
import { formatDateCourte } from "@/utils/dates"
import { formatMontant } from "@/utils/money"

const { caisse, counterName, validatorName } = defineProps<{
  caisse: CaisseDetail
  counterName: string | null
  validatorName: string | null
}>()

const { locale, t } = useI18n()
const expectedAmount = computed(() => formatMontant(caisse.montantAttendu, locale.value))
const countedAmount = computed(() =>
  caisse.montantCompte === null ? null : formatMontant(caisse.montantCompte, locale.value),
)
const gap = computed(() => (caisse.ecart === null ? null : formatMontant(caisse.ecart, locale.value)))
</script>

<template>
  <section class="rounded-3xl bg-card p-4 sm:p-6" data-testid="caisse-detail-amounts">
    <h3 class="font-heading text-lg font-semibold text-foreground">
      {{ t("caisse.detail.amountsTitle") }}
    </h3>

    <dl class="mt-4 space-y-3 border-t border-border/70 pt-4 text-sm">
      <div class="flex items-center justify-between gap-3">
        <dt class="text-foreground">
          {{ t("caisse.detail.expected") }}
        </dt>
        <dd data-testid="caisse-detail-expected" class="font-medium text-foreground" :title="expectedAmount.exact">
          {{ expectedAmount.affiche }}
        </dd>
      </div>
      <div class="flex items-center justify-between gap-3">
        <div>
          <dt class="text-foreground">
            {{ t("caisse.detail.counted") }}
          </dt>
          <dd v-if="counterName" class="text-xs text-muted-foreground">
            {{ t("caisse.detail.countedBy") }}
            <span data-testid="caisse-detail-counted-by" class="font-medium text-foreground">{{ counterName }}</span>
          </dd>
        </div>
        <dd data-testid="caisse-detail-counted" class="font-medium text-foreground" :title="countedAmount?.exact">
          {{ countedAmount ? countedAmount.affiche : "—" }}
        </dd>
      </div>
      <div
        v-if="gap !== null"
        class="flex items-center justify-between gap-3 border-t border-border/70 pt-3"
        data-testid="caisse-detail-gap"
      >
        <dt class="font-semibold" :class="caisse.ecart === 0 ? 'text-foreground' : 'text-destructive'">
          {{ t("caisse.detail.gap") }}
        </dt>
        <dd
          class="font-heading text-lg font-semibold"
          :class="caisse.ecart === 0 ? 'text-foreground' : 'text-destructive'"
          :title="gap.exact"
        >
          {{ gap.affiche }}
        </dd>
      </div>
    </dl>

    <p v-if="validatorName" class="mt-3 text-xs text-muted-foreground">
      {{ t("caisse.detail.validatedBy") }}
      <span data-testid="caisse-detail-validated-by" class="font-medium text-foreground">{{ validatorName }}</span>
      <template v-if="caisse.valideeLe"> · {{ formatDateCourte(caisse.valideeLe, locale) }} </template>
    </p>
  </section>
</template>

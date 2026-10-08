<script setup lang="ts">
import type { DevisDetail } from "@/types/api/devis"
import { computed } from "vue"
import { Badge } from "@/components/ui/badge"
import { formatMontant } from "@/utils/money"
import { QUOTE_STATUS_TONE } from "@/utils/quote-status"

const { quote } = defineProps<{
  quote: DevisDetail
}>()

const { locale, t } = useI18n()

const vatRateLabel = computed(() => {
  if (!quote.tauxTva) return ""
  return `${(Number(quote.tauxTva) * 100).toFixed(0)}% ${t("quotes.detail.vat")}`
})
</script>

<template>
  <section class="rounded-2xl bg-card p-5 space-y-4" data-testid="quotes-detail-amount">
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon name="ph:receipt" size="15" aria-hidden="true" />
        </div>
        <h3 class="font-heading text-sm font-semibold text-foreground">
          {{ t("quotes.detail.amountTitle") }}
        </h3>
      </div>
      <Badge
        v-if="quote.statut"
        :data-status="quote.statut"
        class="border-0! rounded-full px-2.5 py-0.5 text-xs font-semibold"
        :class="QUOTE_STATUS_TONE[quote.statut]"
      >
        {{ t(`quotes.status.${quote.statut}`) }}
      </Badge>
    </div>

    <!-- Total Callout Block without borders -->
    <div class="rounded-xl bg-primary/5 p-4 flex items-center justify-between gap-3 transition-colors">
      <div>
        <span class="text-xs font-medium block text-muted-foreground">
          {{ t("quotes.detail.total") }}
        </span>
        <span class="font-heading text-xl font-bold font-mono tracking-tight text-foreground">
          {{ formatMontant(quote.totalTtc, locale).affiche }}
        </span>
      </div>

      <span
        v-if="quote.statut === 'commande'"
        class="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
      >
        <Icon name="ph:check-circle-fill" size="14" aria-hidden="true" />
        <span>{{ t("quotes.status.commande") }}</span>
      </span>
      <span v-else-if="vatRateLabel" class="font-mono text-xs text-muted-foreground">
        {{ vatRateLabel }}
      </span>
    </div>

    <!-- Amount Breakdown Details -->
    <dl class="space-y-2.5 text-xs sm:text-sm">
      <div class="flex items-center justify-between gap-3 text-muted-foreground">
        <div>
          <dt class="inline text-foreground">
            {{ t("quotes.detail.subtotal") }}
          </dt>
          <dd class="inline text-xs text-muted-foreground ml-1.5">
            ({{ t("quotes.listPanel.itemCount", { count: quote.lignes.length }) }})
          </dd>
        </div>
        <dd class="font-mono text-foreground font-medium">
          {{ formatMontant(quote.totalHt, locale).affiche }}
        </dd>
      </div>

      <div class="flex items-center justify-between gap-3 text-muted-foreground">
        <dt class="text-foreground">
          {{ t("quotes.detail.vat") }}
        </dt>
        <dd class="font-mono text-foreground font-medium">
          {{ formatMontant(quote.tva, locale).affiche }}
        </dd>
      </div>

      <div class="flex items-center justify-between gap-3 pt-2" data-testid="quotes-detail-total">
        <dt class="font-semibold text-foreground">
          {{ t("quotes.detail.total") }}
        </dt>
        <dd
          class="font-heading text-base sm:text-lg font-bold font-mono text-foreground"
          :title="formatMontant(quote.totalTtc, locale).exact"
        >
          {{ formatMontant(quote.totalTtc, locale).affiche }}
        </dd>
      </div>
    </dl>
  </section>
</template>

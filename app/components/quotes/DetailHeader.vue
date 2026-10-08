<script setup lang="ts">
import type { DevisDetail } from "@/types/api/devis"
import { Badge } from "@/components/ui/badge"
import { QUOTE_STATUS_TONE } from "@/utils/quote-status"

const { quote } = defineProps<{
  quote: DevisDetail
}>()

const { t } = useI18n()
</script>

<template>
  <header class="sticky top-0 z-10 flex flex-col gap-3 bg-card p-4 sm:p-5" data-testid="quotes-detail-header">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex min-w-0 flex-wrap items-center gap-2.5">
        <h2
          class="truncate font-heading text-lg sm:text-xl font-bold font-mono tracking-tight text-foreground"
          data-testid="quotes-detail-header-reference"
        >
          {{ quote.reference }}
        </h2>
        <Badge
          data-testid="quotes-detail-status"
          :data-status="quote.statut"
          class="border-0! rounded-full px-2.5 py-0.5 text-xs font-semibold flex items-center gap-1.5"
          :class="QUOTE_STATUS_TONE[quote.statut]"
        >
          <span class="size-1.5 rounded-full bg-current" :class="quote.statut === 'ouvert' ? 'animate-pulse' : ''" />
          {{ t(`quotes.status.${quote.statut}`) }}
        </Badge>
        <span
          v-if="quote.commandeReference"
          class="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
        >
          <Icon name="ph:shopping-cart" size="14" aria-hidden="true" />
          {{ quote.commandeReference }}
        </span>
      </div>

      <div v-if="$slots.actions" class="flex min-w-0 flex-wrap items-center justify-end gap-2">
        <slot name="actions" />
      </div>
    </div>

    <!-- Stepper Lifecycle progression -->
    <QuotesDetailStepper :quote="quote" />
  </header>
</template>

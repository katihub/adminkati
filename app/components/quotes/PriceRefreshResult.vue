<script setup lang="ts">
import type { RefreshQuoteResult } from "@/types/api/devis"
import { Button } from "@/components/ui/button"
import { formatMontant } from "@/utils/money"

defineProps<{
  result: RefreshQuoteResult | null
  errorMessage: string
}>()

const emit = defineEmits<{
  dismiss: []
}>()

const { locale, t } = useI18n()
</script>

<template>
  <div
    v-if="errorMessage"
    class="flex items-center justify-between gap-3 rounded-2xl bg-destructive/10 p-4 text-xs font-medium text-destructive"
    data-testid="quotes-refresh-error"
    role="alert"
  >
    <div class="flex items-center gap-2">
      <Icon name="ph:warning-circle-fill" size="18" class="shrink-0" />
      <span>{{ errorMessage }}</span>
    </div>
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      class="size-6 rounded-md hover:bg-destructive/20 text-destructive"
      :aria-label="t('quotes.detail.refresh.close')"
      @click="emit('dismiss')"
    >
      <Icon name="ph:x" size="14" aria-hidden="true" />
    </Button>
  </div>

  <div
    v-else-if="result?.inchange || (result && result.ecarts.length === 0)"
    class="flex items-center justify-between gap-3 rounded-2xl bg-emerald-500/10 p-4 text-xs font-medium text-emerald-600 dark:text-emerald-400"
    data-testid="quotes-refresh-unchanged"
  >
    <div class="flex items-center gap-2">
      <Icon name="ph:check-circle-fill" size="18" class="shrink-0" />
      <span>{{ t("quotes.detail.refresh.unchanged") }}</span>
    </div>
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      class="size-6 rounded-md hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
      :aria-label="t('quotes.detail.refresh.close')"
      @click="emit('dismiss')"
    >
      <Icon name="ph:x" size="14" aria-hidden="true" />
    </Button>
  </div>

  <section
    v-else-if="result && result.ecarts.length > 0"
    class="space-y-3 rounded-2xl bg-amber-500/10 p-4 text-xs"
    data-testid="quotes-refresh-result"
  >
    <div class="flex items-center justify-between gap-2">
      <div
        class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300"
      >
        <Icon name="ph:warning-circle-fill" size="16" class="shrink-0" />
        <span>{{ t("quotes.detail.refresh.changed") }}</span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        class="size-6 rounded-md hover:bg-amber-500/20 text-amber-700 dark:text-amber-300"
        :aria-label="t('quotes.detail.refresh.close')"
        @click="emit('dismiss')"
      >
        <Icon name="ph:x" size="14" aria-hidden="true" />
      </Button>
    </div>
    <ul class="divide-y divide-amber-500/20 rounded-xl bg-card/60 p-1">
      <li
        v-for="ecart in result.ecarts"
        :key="ecart.slug"
        class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 p-2.5 text-xs"
      >
        <span class="truncate font-medium text-foreground">{{ ecart.nom }}</span>
        <span class="font-mono text-muted-foreground whitespace-nowrap">
          {{ formatMontant(ecart.ancien, locale).affiche }} →
          <strong class="font-semibold text-foreground">{{ formatMontant(ecart.nouveau, locale).affiche }}</strong>
          <span class="ml-1 font-semibold text-foreground">×{{ ecart.quantite }}</span>
        </span>
      </li>
    </ul>
  </section>
</template>

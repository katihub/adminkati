<script setup lang="ts">
import type { DevisDetail } from "@/types/api/devis"
import { formatDateCourte } from "@/utils/dates"

const { quote } = defineProps<{
  quote: DevisDetail
}>()

const { locale, t } = useI18n()
</script>

<template>
  <section class="rounded-2xl bg-card p-5" data-testid="quotes-detail-basic-details">
    <div class="mb-4 flex items-center gap-2">
      <div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon name="ph:info" size="15" aria-hidden="true" />
      </div>
      <h3 class="font-heading text-sm font-semibold text-foreground">
        {{ t("quotes.detail.basicDetailsTitle") }}
      </h3>
    </div>
    <dl class="grid grid-cols-2 gap-x-6 gap-y-3.5 text-xs sm:grid-cols-4 sm:text-sm">
      <div>
        <dt class="text-xs text-muted-foreground">
          {{ t("quotes.detail.quoteId") }}
        </dt>
        <dd class="mt-0.5 font-mono font-medium text-foreground">
          {{ quote.reference }}
        </dd>
      </div>
      <div>
        <dt class="text-xs text-muted-foreground">
          {{ t("quotes.detail.created") }}
        </dt>
        <dd class="mt-0.5 font-medium text-foreground">
          {{ formatDateCourte(quote.creeLe, locale) }}
        </dd>
      </div>
      <div>
        <dt class="text-xs text-muted-foreground">
          {{ t("quotes.detail.updated") }}
        </dt>
        <dd class="mt-0.5 font-medium text-foreground">
          {{ formatDateCourte(quote.majLe, locale) }}
        </dd>
      </div>
      <div>
        <dt class="text-xs text-muted-foreground">
          {{ t("quotes.detail.catalogueDate") }}
        </dt>
        <dd class="mt-0.5 font-medium text-foreground">
          {{ quote.catalogueGenereLe ? formatDateCourte(quote.catalogueGenereLe, locale) : "—" }}
        </dd>
      </div>
    </dl>
  </section>
</template>

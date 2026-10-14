<script setup lang="ts">
// fallow-ignore-file complexity -- declarative read-only tracking screen with filters and per-part states
import type { QuoteFilters, QuotePartStatus, QuoteStatus } from "@/composables/useMarketplaceQuotes"
import { computed, ref } from "vue"
import { toast } from "vue-sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { useMarketplaceQuotes, useQuoteReminders } from "@/composables/useMarketplaceQuotes"
import { apiErrorText } from "@/utils/api-error"
import { downloadBlob } from "@/utils/download-file"

const { t, locale } = useI18n()
const statut = ref<QuoteStatus | "">("")
const lateOnly = ref(false)
const filters = computed<QuoteFilters>(() => ({
  ...(statut.value ? { statut: statut.value } : {}),
  ...(lateOnly.value ? { enRetard: true } : {}),
}))
const query = useMarketplaceQuotes(filters)
const reminders = useQuoteReminders()
const money = computed(
  () => new Intl.NumberFormat(locale.value, { style: "currency", currency: "XAF", maximumFractionDigits: 0 }),
)
const date = computed(() => new Intl.DateTimeFormat(locale.value, { day: "2-digit", month: "short", year: "numeric" }))
const conversion = computed(() =>
  ((query.data.value?.indicateurs.tauxConversionBps ?? 0) / 100).toLocaleString(locale.value),
)

const PART_STATUS: Record<QuotePartStatus, string> = {
  en_attente: "operations.quotes.part.en_attente",
  confirmee: "operations.quotes.part.confirmee",
  refusee: "operations.quotes.part.refusee",
  acceptee: "operations.quotes.part.acceptee",
  non_retenue: "operations.quotes.part.non_retenue",
}
const QUOTE_STATUS: Record<QuoteStatus, string> = {
  ouvert: "operations.quotes.status.ouvert",
  accepte: "operations.quotes.status.accepte",
  annule: "operations.quotes.status.annule",
}

async function downloadPdf(reference: string) {
  try {
    const blob = await $fetch<Blob>(`/api/v1/marketplace/administration/devis/${encodeURIComponent(reference)}/pdf`, {
      responseType: "blob",
    })
    downloadBlob(blob, `devis-${reference}.pdf`)
  } catch (cause) {
    toast.error(apiErrorText(cause, t))
  }
}

async function remind() {
  try {
    const result = await reminders.mutateAsync()
    toast.success(
      t("operations.quotes.remindersSent", { shops: result.boutiquesRelancees, customers: result.clientsPrevenus }),
    )
    await query.refetch()
  } catch (cause) {
    toast.error(apiErrorText(cause, t))
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col" data-testid="marketplace-quotes-workspace">
    <div
      class="flex shrink-0 flex-col gap-3 border-t border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10"
    >
      <div class="flex flex-wrap items-center gap-3">
        <NativeSelect v-model="statut" :aria-label="t('operations.quotes.filterStatus')" data-testid="quotes-status">
          <NativeSelectOption value="">{{ t("operations.quotes.allStatuses") }}</NativeSelectOption>
          <NativeSelectOption value="ouvert">{{ t("operations.quotes.status.ouvert") }}</NativeSelectOption>
          <NativeSelectOption value="accepte">{{ t("operations.quotes.status.accepte") }}</NativeSelectOption>
        </NativeSelect>
        <label class="flex items-center gap-2 text-sm">
          <input v-model="lateOnly" type="checkbox" class="size-4" data-testid="quotes-late" />
          {{ t("operations.quotes.lateOnly") }}
        </label>
      </div>
      <Button
        size="sm"
        variant="outline"
        :disabled="reminders.isPending.value"
        data-testid="quotes-remind"
        @click="remind"
        ><Icon name="ph:bell-ringing" /> {{ t("operations.quotes.remindNow") }}</Button
      >
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto border-t border-border bg-muted/60 p-4 sm:p-6 lg:px-10">
      <div v-if="query.data.value" class="mb-4 grid gap-3 sm:grid-cols-4" data-testid="quotes-indicators">
        <div class="rounded-lg border border-border bg-card p-3">
          <p class="text-xs text-muted-foreground">{{ t("operations.quotes.total") }}</p>
          <p class="text-xl font-semibold">{{ query.data.value.indicateurs.total }}</p>
        </div>
        <div class="rounded-lg border border-border bg-card p-3">
          <p class="text-xs text-muted-foreground">{{ t("operations.quotes.accepted") }}</p>
          <p class="text-xl font-semibold">{{ query.data.value.indicateurs.acceptes }}</p>
        </div>
        <div class="rounded-lg border border-border bg-card p-3">
          <p class="text-xs text-muted-foreground">{{ t("operations.quotes.conversion") }}</p>
          <p class="text-xl font-semibold">{{ conversion }} %</p>
        </div>
        <div
          class="rounded-lg border bg-card p-3"
          :class="query.data.value.indicateurs.partiesEnRetard ? 'border-amber-300' : 'border-border'"
        >
          <p class="text-xs text-muted-foreground">{{ t("operations.quotes.lateParts") }}</p>
          <p class="text-xl font-semibold">{{ query.data.value.indicateurs.partiesEnRetard }}</p>
        </div>
      </div>

      <div v-if="query.isPending.value" class="space-y-2">
        <div v-for="n in 4" :key="n" class="h-20 animate-pulse rounded-lg bg-muted" />
      </div>
      <ApiErrorCard v-else-if="query.error.value" :error="query.error.value" @retry="query.refetch()" />
      <EmptyStateCard
        v-else-if="!query.data.value?.devis.length"
        icon="ph:file-text"
        :text="t('operations.quotes.empty')"
      />
      <ul v-else class="space-y-3">
        <li
          v-for="quote in query.data.value!.devis"
          :key="quote.id"
          class="rounded-lg border border-border bg-card p-4"
          :data-testid="`quote-${quote.reference}`"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="font-heading font-semibold">{{ quote.reference }}</h3>
                <Badge variant="outline">{{ t(QUOTE_STATUS[quote.statut]) }}</Badge>
                <span v-if="quote.commande" class="text-xs text-muted-foreground"
                  >→ {{ quote.commande.reference }}</span
                >
              </div>
              <p class="mt-1 text-xs text-muted-foreground">
                {{ quote.entreprise ?? quote.client.nom ?? quote.client.courriel ?? "—" }}
                <template v-if="quote.client.ville"> · {{ quote.client.ville }}</template>
                · {{ date.format(new Date(quote.creeLe)) }} · {{ money.format(quote.totalFcfa) }}
              </p>
            </div>
            <Button size="sm" variant="ghost" @click="downloadPdf(quote.reference)"
              ><Icon name="ph:file-pdf" /> {{ t("operations.quotes.pdf") }}</Button
            >
          </div>
          <ul class="mt-3 grid gap-2 sm:grid-cols-2">
            <li
              v-for="part in quote.parties"
              :key="part.id"
              class="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              :class="part.enRetard ? 'border-amber-300 bg-amber-50/40' : 'border-border'"
              :data-testid="`quote-part-${part.reference}`"
            >
              <span class="min-w-0 truncate">{{ part.boutique.nom }} · {{ money.format(part.totalFcfa) }}</span>
              <span class="shrink-0 text-xs">
                <template v-if="part.enRetard">{{ t("operations.quotes.late") }} · </template
                >{{ t(PART_STATUS[part.statut]) }}
              </span>
            </li>
          </ul>
        </li>
      </ul>
    </div>
  </div>
</template>

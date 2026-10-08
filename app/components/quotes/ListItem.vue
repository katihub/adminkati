<script setup lang="ts">
import type { DevisListItem } from "@/types/api/devis"
import { computed } from "vue"
import { Badge } from "@/components/ui/badge"
import { formatDateCourte } from "@/utils/dates"
import { formatMontant } from "@/utils/money"
import { QUOTE_STATUS_TONE } from "@/utils/quote-status"

const { quote, selected = false } = defineProps<{
  quote: DevisListItem
  selected?: boolean
}>()

const emit = defineEmits<{
  select: [reference: string]
}>()

const { locale, t } = useI18n()
const formattedTotal = computed(() => formatMontant(quote.totalTtc, locale.value))
</script>

<template>
  <button
    type="button"
    data-testid="quotes-list-item"
    :data-quote-reference="quote.reference"
    :aria-pressed="selected ? 'true' : 'false'"
    class="group relative flex w-full items-center gap-3 px-4 py-3 text-left transition-all"
    :class="
      selected
        ? 'border-l-4 border-l-primary bg-muted border-t border-b'
        : 'hover:bg-muted/50 hover:border-l-4 hover:border-l-muted'
    "
    @click="emit('select', quote.reference)"
  >
    <div
      class="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted/70 text-muted-foreground shadow-2xs"
    >
      <Icon name="ph:file-text" size="18" aria-hidden="true" />
    </div>

    <div class="min-w-0 flex-1 space-y-0.5">
      <div class="flex items-center justify-between gap-2">
        <span data-testid="quotes-list-item-reference" class="truncate text-sm font-medium text-foreground">
          {{ quote.reference }}
        </span>
        <span class="shrink-0 text-xs font-medium text-foreground" :title="formattedTotal.exact">
          {{ formattedTotal.affiche }}
        </span>
      </div>

      <p class="mb-2 text-xs font-medium text-muted-foreground">
        {{ formatDateCourte(quote.creeLe, locale) }}
      </p>

      <div class="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
        <Badge
          data-testid="quotes-list-item-status"
          :data-status="quote.statut"
          class="shrink-0 rounded-full border-0! px-2 py-0 text-[10px] font-medium"
          :class="QUOTE_STATUS_TONE[quote.statut]"
        >
          {{ t(`quotes.status.${quote.statut}`) }}
        </Badge>

        <p class="flex items-center gap-x-2 text-xs! line-clamp-1!">
          <Icon name="ph:package" aria-hidden="true" />
          {{ t("quotes.listPanel.itemCount", { count: quote._count.lignes }) }}
        </p>
      </div>
    </div>
  </button>
</template>

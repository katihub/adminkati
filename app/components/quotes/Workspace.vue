<script setup lang="ts">
import type { DevisDetail, StatutDevis } from "@/types/api/devis"

const {
  status,
  selectedReference = null,
  selectedQuote = null,
  isPending = false,
  error = null,
} = defineProps<{
  status?: StatutDevis
  selectedReference?: string | null
  selectedQuote?: DevisDetail | null
  isPending?: boolean
  error?: unknown
}>()

const emit = defineEmits<{
  select: [reference: string]
  "update:status": [status: StatutDevis | undefined]
  retry: []
  archived: []
}>()

const { t } = useI18n()
</script>

<template>
  <div
    class="grid flex-1 min-h-0 w-full grid-cols-1 border-t border-border bg-card lg:grid-cols-[300px_1fr]"
    data-testid="quotes-workspace"
  >
    <div
      class="h-full overflow-hidden border-r border-border bg-card lg:col-span-1"
      data-testid="quotes-workspace-sidebar"
    >
      <QuotesListPanel
        :status="status"
        :selected-reference="selectedReference"
        @select="emit('select', $event)"
        @update:status="emit('update:status', $event)"
      />
    </div>

    <div class="h-full overflow-y-auto bg-muted/70 lg:col-start-2 lg:row-start-1" data-testid="quotes-detail-panel">
      <div v-if="error" class="flex h-full items-center justify-center p-6 text-center">
        <ApiErrorCard :error="error" @retry="emit('retry')" />
      </div>
      <div
        v-else-if="selectedReference === null"
        data-testid="quotes-detail-empty"
        class="flex h-full items-center justify-center p-6"
      >
        <EmptyStateCard icon="ph:cursor-click" :text="t('quotes.detail.empty')" />
      </div>
      <QuotesDetailSkeleton v-else-if="isPending" :label="t('quotes.detail.loading')" />
      <QuotesDetailPanel v-else-if="selectedQuote" :quote="selectedQuote" @archived="emit('archived')" />
    </div>
  </div>
</template>

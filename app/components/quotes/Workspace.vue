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
    class="grid min-h-0 w-full flex-1 grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card shadow-xs lg:grid-cols-[320px_minmax(0,1fr)]"
    data-testid="quotes-workspace"
  >
    <div
      class="h-56 overflow-hidden border-b border-border bg-card lg:h-full lg:border-r lg:border-b-0"
      data-testid="quotes-workspace-sidebar"
    >
      <QuotesListPanel
        :status="status"
        :selected-reference="selectedReference"
        @select="emit('select', $event)"
        @update:status="emit('update:status', $event)"
      />
    </div>

    <div
      class="min-h-96 overflow-y-auto bg-muted/35 lg:col-start-2 lg:row-start-1 lg:h-full lg:min-h-0"
      data-testid="quotes-detail-panel"
    >
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

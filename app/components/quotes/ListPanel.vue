<script setup lang="ts">
import type { StatutDevis } from "@/types/api/devis"
import { computed, toRef } from "vue"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { useQuotes } from "@/composables/useQuotes"

const props = defineProps<{
  status?: StatutDevis
  selectedReference?: string | null
}>()

const emit = defineEmits<{
  select: [reference: string]
  "update:status": [status: StatutDevis | undefined]
}>()

const { t } = useI18n()
const activeStatus = toRef(props, "status")
const { data, isPending, error } = useQuotes(activeStatus)
const quotes = computed(() => data.value ?? [])
const showNotice = computed(() => !isPending.value && (Boolean(error.value) || quotes.value.length === 0))

function updateStatus(status: StatutDevis | undefined) {
  emit("update:status", status)
}
</script>

<template>
  <div class="flex h-full flex-col gap-3.5" data-testid="quotes-list-panel">
    <QuotesStatusFilterPills :active-status="status" :total-count="quotes.length" @select="updateStatus" />

    <ScrollArea data-testid="quotes-list-scroll-area" class="flex-1 min-h-0 p-0!">
      <div v-if="isPending" class="flex flex-col gap-2 p-3">
        <Skeleton v-for="n in 9" :key="n" data-testid="quotes-list-skeleton" class="h-14 w-full shrink-0 rounded-2xl" />
      </div>

      <InlineStateNotice
        v-else-if="showNotice"
        data-testid="quotes-list-empty"
        icon="ph:file-text"
        :text="t('quotes.listPanel.empty')"
      />

      <div v-else class="flex flex-col gap-1.5">
        <QuotesListItem
          v-for="quote in quotes"
          :key="quote.id"
          :quote="quote"
          :selected="quote.reference === selectedReference"
          @select="emit('select', $event)"
        />
      </div>
    </ScrollArea>
  </div>
</template>

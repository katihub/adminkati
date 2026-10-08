<script setup lang="ts">
import type { DevisDetail, RefreshQuoteResult } from "@/types/api/devis"
import { computed, ref, watch } from "vue"
import { Button } from "@/components/ui/button"
import { useQuoteMutations } from "@/composables/useQuoteMutations"
import { apiErrorText } from "@/utils/api-error"

const { quote } = defineProps<{
  quote: DevisDetail
}>()

const emit = defineEmits<{
  archived: []
}>()

const { t } = useI18n()
const mutation = useQuoteMutations()
const result = ref<RefreshQuoteResult | null>(null)
const errorMessage = ref("")
const isPending = computed(() => mutation.refresh.isPending.value)

watch(
  () => quote.reference,
  () => {
    result.value = null
    errorMessage.value = ""
  },
)

function refreshPrices() {
  errorMessage.value = ""
  mutation.refresh.mutate(quote.reference, {
    onSuccess: next => {
      result.value = next
    },
    onError: (error: unknown) => {
      errorMessage.value = apiErrorText(error, t)
    },
  })
}

function dismissResult() {
  result.value = null
  errorMessage.value = ""
}
</script>

<template>
  <article data-testid="quotes-detail-content">
    <QuotesDetailHeader :quote="quote">
      <template #actions>
        <div class="flex flex-wrap items-center justify-end gap-2" data-testid="quotes-detail-actions">
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold shadow-none"
            data-testid="quotes-refresh-button"
            :disabled="isPending"
            :aria-busy="isPending ? true : undefined"
            @click="refreshPrices"
          >
            <Spinner v-if="isPending" data-icon="inline-start" />
            <Icon v-else name="ph:arrow-clockwise" size="14" aria-hidden="true" />
            <span>{{ t("quotes.detail.refresh.button") }}</span>
          </Button>
          <QuotesArchiveDialog :quote="quote" @archived="emit('archived')" />
        </div>
      </template>
    </QuotesDetailHeader>

    <div v-if="errorMessage || result" class="px-4 pt-4 sm:px-6 sm:pt-6">
      <QuotesPriceRefreshResult :result="result" :error-message="errorMessage" @dismiss="dismissResult" />
    </div>

    <div class="grid w-full min-w-0 grid-cols-1 gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <!-- Left Column: Basic Details & Lines Table -->
      <div class="flex min-w-0 flex-col gap-5">
        <QuotesBasicDetails :quote="quote" />
        <QuotesLinesTable :lines="quote.lignes" class="flex-1" />
      </div>

      <!-- Right Column: Operational Sidebar -->
      <div class="flex min-w-0 flex-col gap-5">
        <QuotesAmountSummary :quote="quote" />
        <QuotesCustomerInfo :quote="quote" />
      </div>
    </div>
  </article>
</template>

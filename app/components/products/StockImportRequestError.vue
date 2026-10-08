<script setup lang="ts">
import type { StockImportFailure, StockImportPhase } from "@/types/stock-import"
import { computed } from "vue"
import { Button } from "@/components/ui/button"
import { STOCK_IMPORT_MAX_ROWS } from "@/utils/stock-import-files"

const { failure, phase } = defineProps<{ failure: StockImportFailure; phase: StockImportPhase }>()
defineEmits<{ retry: []; back: [] }>()
const { t, te } = useI18n()
const headline = computed(() => {
  if (phase === "preview" && failure.kind === "retryable") return t("products.stockImport.previewFailed")
  if (failure.kind === "inProgress") return t("products.stockImport.inProgress")
  if (failure.status === 429) return t("products.stockImport.rateLimited")
  if (failure.kind === "retryable") return t("products.stockImport.interrupted")
  const key = `products.stockImport.requestErrors.${failure.code}`
  return te(key) ? t(key, { limit: STOCK_IMPORT_MAX_ROWS }) : t("products.stockImport.requestErrors.rejected")
})
</script>

<template>
  <div class="flex flex-col gap-4" role="alert">
    <p class="text-sm font-medium">{{ headline }}</p>
    <p v-if="failure.kind === 'rejected' && failure.message" class="text-sm break-words text-muted-foreground">
      {{ failure.message }}
    </p>
    <div class="flex justify-end gap-2">
      <Button v-if="failure.kind === 'rejected' || phase === 'preview'" variant="outline" @click="$emit('back')">{{
        t("products.stockImport.back")
      }}</Button>
      <Button v-if="failure.kind !== 'rejected'" @click="$emit('retry')">{{
        t(phase === "preview" ? "products.stockImport.retryPreview" : "products.stockImport.retry")
      }}</Button>
    </div>
  </div>
</template>

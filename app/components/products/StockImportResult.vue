<script setup lang="ts">
import type { ReponseImportStock } from "@/types/api/stock-import"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

defineProps<{ result: ReponseImportStock }>()
defineEmits<{ download: []; done: [] }>()
const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col gap-4" aria-live="polite">
    <div class="flex flex-wrap items-center gap-2">
      <Badge variant="success">{{ t("products.stockImport.applied", { count: result.appliquees }) }}</Badge>
      <Badge variant="secondary">{{ t("products.stockImport.skipped", { count: result.ignorees }) }}</Badge>
      <Badge variant="destructive">{{ t("products.stockImport.failed", { count: result.echouees }) }}</Badge>
      <Badge v-if="result.stock_modifiees > 0" variant="warning" data-testid="stock-import-changed-badge">
        {{ t("products.stockImport.changed", { count: result.stock_modifiees }) }}
      </Badge>
    </div>
    <p
      v-if="result.stock_modifiees > 0 && !result.inclure_stock_modifie"
      role="status"
      class="flex items-start gap-2 rounded-lg bg-warning/10 p-3 text-xs font-medium text-warning"
      data-testid="stock-import-changed-notice"
    >
      <Icon name="ph:clock-counter-clockwise" size="14" class="mt-0.5 shrink-0" aria-hidden="true" />
      {{ t("products.stockImport.stockChanged.resultSkipped") }}
    </p>
    <ProductsStockImportRowsTable :lines="result.lignes" />
    <div class="flex justify-end gap-2">
      <Button v-if="result.echouees > 0" variant="outline" @click="$emit('download')">
        <Icon name="ph:download-simple" aria-hidden="true" />
        {{ t("products.stockImport.downloadErrors") }}
      </Button>
      <Button @click="$emit('done')">{{ t("products.stockImport.done") }}</Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ReponseImportStock } from "@/types/api/stock-import"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const props = defineProps<{ preview: ReponseImportStock }>()
defineEmits<{ back: []; download: []; apply: []; includeChanged: [value: boolean] }>()
const { t } = useI18n()
// A reception delta cannot undo a movement, so the backend never reports drift there.
const showChanged = computed(() => props.preview.mode === "count" && props.preview.stock_modifiees > 0)
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center gap-2">
      <Badge variant="outline">{{ t(`products.stockImport.modes.${preview.mode}`) }}</Badge>
      <Badge variant="success">{{ t("products.stockImport.preview.willApply", { count: preview.appliquees }) }}</Badge>
      <Badge variant="secondary">{{ t("products.stockImport.preview.unchanged", { count: preview.ignorees }) }}</Badge>
      <Badge variant="destructive">{{ t("products.stockImport.preview.willFail", { count: preview.echouees }) }}</Badge>
      <Badge v-if="showChanged" variant="warning" data-testid="stock-import-changed-badge">
        {{ t("products.stockImport.preview.changed", { count: preview.stock_modifiees }) }}
      </Badge>
    </div>
    <p v-if="preview.mode === 'count'" class="flex items-start gap-2 mt-2 mb-3 text-xs p-1 rounded bg-muted w-max">
      <Icon name="ph:info" size="14" class="mt-0.5 shrink-0" aria-hidden="true" />
      {{ t("products.stockImport.countWarning") }}
    </p>
    <ProductsStockImportChangedNotice
      v-if="showChanged"
      :checked="preview.inclure_stock_modifie"
      @update:checked="$emit('includeChanged', $event)"
    />
    <ProductsStockImportRowsTable :lines="preview.lignes" preview />
    <div class="flex flex-col gap-6! mt-4 text-xs text-muted-foreground">
      <p v-if="preview.echouees > 0" class="flex items-start gap-2">
        <Icon name="ph:warning" size="14" class="mt-0.5 shrink-0" aria-hidden="true" />
        {{ t("products.stockImport.preview.failNotice") }}
      </p>
      <p
        v-if="preview.appliquees === 0"
        role="status"
        class="flex items-start gap-2 rounded-lg bg-warning/10 p-3 font-medium text-warning"
      >
        <Icon name="ph:prohibit" size="14" class="mt-0.5 shrink-0" aria-hidden="true" />
        {{ t("products.stockImport.preview.nothingToApply") }}
      </p>
    </div>
    <div class="flex justify-end gap-2">
      <Button variant="outline" @click="$emit('back')">{{ t("products.stockImport.back") }}</Button>
      <Button v-if="preview.echouees > 0" variant="outline" @click="$emit('download')">
        <Icon name="ph:download-simple" aria-hidden="true" />
        {{ t("products.stockImport.downloadErrors") }}
      </Button>
      <Button v-if="preview.appliquees > 0" @click="$emit('apply')">
        {{ t("products.stockImport.preview.apply", preview.appliquees) }}
      </Button>
    </div>
  </div>
</template>

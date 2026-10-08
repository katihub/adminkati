<script setup lang="ts">
import type { StockImportMode } from "@/types/stock-import"
import { computed, ref, useId } from "vue"
import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { cn } from "@/lib/utils"
import { STOCK_IMPORT_MAX_ROWS } from "@/utils/stock-import-files"

const REASON_MAX = 200

const props = defineProps<{
  file: File | null
  errorMessage: string
  canSubmit: boolean
}>()
const mode = defineModel<StockImportMode>("mode", { required: true })
const motif = defineModel<string>("motif", { required: true })
const emit = defineEmits<{ submit: []; select: [file: File | undefined]; template: []; cancel: [] }>()
const { t } = useI18n()
const modeId = useId()
const reasonId = useId()
const fileId = useId()
const fileInput = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
const fileIcon = computed(() => (props.file?.name.toLowerCase().endsWith(".xlsx") ? "ph:file-xls" : "ph:file-csv"))

function upload(event: Event) {
  emit("select", (event.target as HTMLInputElement).files?.[0])
}
function drop(event: DragEvent) {
  dragging.value = false
  emit("select", event.dataTransfer?.files[0])
}
function clearFile() {
  if (fileInput.value) fileInput.value.value = ""
  emit("select", undefined)
}
function sizeLabel(file: File) {
  return file.size < 1024 * 1024
    ? `${Math.max(1, Math.round(file.size / 1024))} KB`
    : `${(file.size / 1024 / 1024).toFixed(1)} MB`
}
</script>

<template>
  <form class="flex flex-col gap-5" @submit.prevent="$emit('submit')">
    <div class="grid gap-4 sm:grid-cols-3">
      <div class="flex flex-col gap-1.5">
        <Label :for="modeId" class="text-xs text-muted-foreground">
          {{ t("products.stockImport.mode") }}
          <InfoTip :text="t(`products.stockImport.hints.${mode}`)" />
        </Label>
        <NativeSelect :id="modeId" v-model="mode">
          <NativeSelectOption value="reception">{{ t("products.stockImport.modes.reception") }}</NativeSelectOption>
          <NativeSelectOption value="count">{{ t("products.stockImport.modes.count") }}</NativeSelectOption>
        </NativeSelect>
      </div>
      <div class="flex flex-col gap-1.5 sm:col-span-2">
        <div class="flex items-center justify-between gap-2">
          <Label :for="reasonId" class="text-xs text-muted-foreground">
            {{ t("products.stockImport.reason") }}
            <InfoTip :text="t('products.stockImport.reasonHelp')" />
          </Label>
          <span class="text-xs text-muted-foreground tabular-nums" aria-hidden="true">
            {{ motif.length }}/{{ REASON_MAX }}
          </span>
        </div>
        <Input :id="reasonId" v-model="motif" :maxlength="REASON_MAX" required />
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <div class="flex items-center justify-between gap-2">
        <span class="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {{ t("products.stockImport.fileSection") }}
          <InfoTip :text="t('products.stockImport.fileHelp', { limit: STOCK_IMPORT_MAX_ROWS })" />
        </span>
        <Button type="button" variant="link" size="xs" class="h-auto p-0 text-xs" @click="$emit('template')">
          <Icon name="ph:download-simple" aria-hidden="true" />
          {{ t("products.stockImport.downloadTemplate") }}
        </Button>
      </div>
      <div
        v-if="props.file"
        class="flex items-center gap-3 rounded-md border bg-muted/40 px-3 py-2.5"
        data-testid="stock-import-selected-file"
      >
        <Icon :name="fileIcon" size="28" class="shrink-0 text-primary" aria-hidden="true" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium">{{ props.file.name }}</p>
          <p class="text-xs text-muted-foreground">{{ sizeLabel(props.file) }}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          :aria-label="t('products.stockImport.removeFile')"
          @click="clearFile"
        >
          <Icon name="ph:x" aria-hidden="true" />
        </Button>
      </div>
      <Label
        v-show="!props.file"
        :for="fileId"
        :class="
          cn(
            'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed px-4 py-6 text-center transition-colors hover:bg-muted/40',
            dragging && 'border-primary bg-muted/40',
          )
        "
        @dragover.prevent="dragging = true"
        @dragleave="dragging = false"
        @drop.prevent="drop"
      >
        <Icon name="ph:upload-simple" size="22" class="text-muted-foreground" aria-hidden="true" />
        <span class="text-sm">{{ t("products.stockImport.file") }}</span>
      </Label>
      <input :id="fileId" ref="fileInput" type="file" accept=".csv,.xlsx" class="sr-only" @change="upload" />
      <p class="text-xs text-muted-foreground">
        {{ t("products.stockImport.fileLimits", { limit: STOCK_IMPORT_MAX_ROWS }) }}
      </p>
      <p class="text-xs text-muted-foreground" data-testid="stock-import-empty-hint">
        {{ t("products.stockImport.emptyQuantityHint") }}
      </p>
    </div>

    <p v-if="errorMessage" role="alert" class="text-sm text-destructive">{{ errorMessage }}</p>
    <DialogFooter>
      <Button type="button" variant="outline" @click="$emit('cancel')">{{ t("products.stockImport.cancel") }}</Button>
      <Button type="submit" :disabled="!canSubmit">{{ t("products.stockImport.submit") }}</Button>
    </DialogFooter>
  </form>
</template>

<script setup lang="ts">
import type { ProductListQuery } from "@/types/api/produits"
import type { FormatExportStock } from "@/types/api/stock-export"
import type { StockImportMode } from "@/types/stock-import"
import { computed, ref, useId, watch } from "vue"
import { toast } from "vue-sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { useStockExport } from "@/composables/useStockExport"
import { formatNumber } from "@/utils/format"
import { STOCK_EXPORT_MAX_ROWS, exportVolume } from "@/utils/stock-export"
import { stockExportHeading } from "@/utils/stock-export-heading"
import { STOCK_IMPORT_MAX_ROWS } from "@/utils/stock-import-files"

const props = defineProps<{ filters: ProductListQuery; total: number | null }>()
const open = defineModel<boolean>("open", { default: false })
const { t, locale } = useI18n()
const session = useCachedSession()
const allowed = computed(() => session.value?.roles.includes("direction") ?? false)
const { pending, error, exporter } = useStockExport()
const heading = computed(() => {
  const base = stockExportHeading({ pending: pending.value, failed: Boolean(error.value), total: props.total })
  const params = {
    max: formatNumber(STOCK_EXPORT_MAX_ROWS, locale.value),
    limit: formatNumber(STOCK_IMPORT_MAX_ROWS, locale.value),
    count: formatNumber(props.total ?? 0, locale.value),
  }
  return { ...base, params }
})
const mode = ref<StockImportMode>("count")
const format = ref<FormatExportStock>("xlsx")
const modeId = useId()
const formatId = useId()
const visible = computed({
  get: () => open.value && allowed.value,
  set: value => {
    if (!pending.value) open.value = value
  },
})
// An empty result or a known over-ceiling count can never produce a useful file.
const canExport = computed(() => !pending.value && !["empty", "blocked"].includes(exportVolume(props.total)))

watch(visible, value => {
  if (!value) return
  mode.value = "count"
  format.value = "xlsx"
  error.value = ""
})
function blockWhilePending(event: { preventDefault: () => void }) {
  if (pending.value) event.preventDefault()
}
async function confirm() {
  if (!canExport.value) return
  if (await exporter({ filters: props.filters, mode: mode.value, format: format.value })) {
    open.value = false
    toast.success(t("products.stockExport.success"))
  }
}
</script>

<template>
  <Dialog v-if="allowed" v-model:open="visible">
    <DialogTrigger as-child>
      <slot name="trigger">
        <Button variant="outline">
          <Icon name="ph:download-simple" aria-hidden="true" />{{ t("products.stockExport.button") }}
        </Button>
      </slot>
    </DialogTrigger>
    <DialogContent
      class="max-h-[90vh] overflow-y-auto sm:max-w-lg"
      data-testid="stock-export-dialog"
      @open-auto-focus.prevent
      @escape-key-down="blockWhilePending"
      @interact-outside="blockWhilePending"
    >
      <DialogHeader>
        <DialogTitle>{{ t(`products.stockExport.headings.${heading.id}.title`) }}</DialogTitle>
        <DialogDescription>{{
          t(`products.stockExport.headings.${heading.id}.description`, heading.params)
        }}</DialogDescription>
      </DialogHeader>
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-1.5">
          <Label :for="modeId" class="text-xs text-muted-foreground">
            {{ t("products.stockExport.mode") }}
            <InfoTip :text="t(`products.stockExport.modeHints.${mode}`)" />
          </Label>
          <NativeSelect :id="modeId" v-model="mode" :disabled="pending" class="w-full" data-testid="stock-export-mode">
            <NativeSelectOption value="count">{{ t("products.stockImport.modes.count") }}</NativeSelectOption>
            <NativeSelectOption value="reception">{{ t("products.stockImport.modes.reception") }}</NativeSelectOption>
          </NativeSelect>
        </div>
        <div class="flex flex-col gap-1.5">
          <Label :for="formatId" class="text-xs text-muted-foreground">{{ t("products.stockExport.format") }}</Label>
          <NativeSelect
            :id="formatId"
            v-model="format"
            :disabled="pending"
            class="w-full"
            data-testid="stock-export-format"
          >
            <NativeSelectOption value="xlsx">{{ t("products.stockExport.formats.xlsx") }}</NativeSelectOption>
            <NativeSelectOption value="csv">{{ t("products.stockExport.formats.csv") }}</NativeSelectOption>
          </NativeSelect>
        </div>
      </div>
      <ProductsStockExportSkeleton v-if="pending" :label="t('products.stockExport.exporting')" />
      <ProductsStockExportSummary v-else :filters="filters" :total="total" :mode="mode" />
      <p v-if="error" role="alert" class="text-sm text-destructive" data-testid="stock-export-error">{{ error }}</p>
      <DialogFooter>
        <Button type="button" variant="outline" :disabled="pending" @click="visible = false">
          {{ t("products.stockExport.cancel") }}
        </Button>
        <Button
          type="button"
          data-testid="stock-export-confirm"
          :disabled="!canExport"
          :aria-busy="pending ? true : undefined"
          @click="confirm"
        >
          {{ t("products.stockExport.confirm") }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

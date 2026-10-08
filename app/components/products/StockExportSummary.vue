<script setup lang="ts">
import type { ProductListQuery } from "@/types/api/produits"
import type { StockImportMode } from "@/types/stock-import"
import { computed } from "vue"
import { useTaxonomie } from "@/composables/useTaxonomie"
import { cn } from "@/lib/utils"
import { formatNumber } from "@/utils/format"
import { STOCK_EXPORT_MAX_ROWS, describeExportFilters, exportVolume } from "@/utils/stock-export"
import { STOCK_IMPORT_MAX_ROWS } from "@/utils/stock-import-files"

const props = defineProps<{ filters: ProductListQuery; total: number | null; mode: StockImportMode }>()
const { t, locale } = useI18n()
const { data: taxonomy } = useTaxonomie()

const entries = computed(() => describeExportFilters(props.filters, taxonomy.value))
const volume = computed(() => exportVolume(props.total))
const includesWithdrawn = computed(() => props.filters.etat === "tous" || props.filters.etat === "retires")
interface Notice {
  id: string
  tone: "warning" | "destructive" | "muted"
  icon: string
  text: string
}
const volumeNotice = computed<Notice | null>(() => {
  const max = formatNumber(STOCK_EXPORT_MAX_ROWS, locale.value)
  const split = {
    count: formatNumber(props.total ?? 0, locale.value),
    limit: formatNumber(STOCK_IMPORT_MAX_ROWS, locale.value),
  }
  const byVolume: Partial<Record<typeof volume.value, Notice>> = {
    empty: { id: "empty", tone: "muted", icon: "ph:tray", text: t("products.stockExport.notices.empty") },
    blocked: {
      id: "blocked",
      tone: "destructive",
      icon: "ph:prohibit",
      text: t("products.stockExport.notices.tooMany", { max }),
    },
    split: { id: "split", tone: "warning", icon: "ph:scissors", text: t("products.stockExport.notices.split", split) },
  }
  return byVolume[volume.value] ?? null
})
// Nothing is exported at these volumes, so the advice about the file's contents would only be noise.
const exportable = computed(() => volume.value !== "empty" && volume.value !== "blocked")
const contextNotices = computed<Notice[]>(() => [
  ...(includesWithdrawn.value
    ? [
        {
          id: "withdrawn",
          tone: "muted",
          icon: "ph:archive",
          text: t("products.stockExport.notices.withdrawn"),
        } as const,
      ]
    : []),
  ...(props.mode === "count"
    ? [
        {
          id: "stale",
          tone: "warning",
          icon: "ph:clock-counter-clockwise",
          text: t("products.stockExport.notices.stale"),
        } as const,
      ]
    : []),
])
const notices = computed(() => [
  ...(volumeNotice.value ? [volumeNotice.value] : []),
  ...(exportable.value ? contextNotices.value : []),
])
const TONES = {
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground",
} as const
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-col gap-1.5 rounded-lg border bg-muted/40 p-3">
      <p class="text-xs font-medium text-muted-foreground">{{ t("products.stockExport.filtersLabel") }}</p>
      <ul class="flex flex-wrap gap-1.5" data-testid="stock-export-filters">
        <li v-if="entries.length === 0" class="text-sm">{{ t("products.stockExport.filtersNone") }}</li>
        <li v-for="entry in entries" :key="entry.key" class="rounded-md border bg-background px-2 py-0.5 text-sm">
          <span class="text-muted-foreground">{{ t(entry.labelKey) }}:</span>
          {{ entry.valueKey ? t(entry.valueKey) : entry.value }}
        </li>
      </ul>
      <p v-if="total !== null" class="text-sm font-semibold tabular-nums" data-testid="stock-export-count">
        {{ t("products.stockExport.matching", { count: formatNumber(total, locale) }, total) }}
      </p>
    </div>
    <p
      v-for="notice in notices"
      :key="notice.id"
      role="status"
      :class="cn('flex items-start gap-2 rounded-lg p-3 text-xs font-medium', TONES[notice.tone])"
      :data-testid="`stock-export-notice-${notice.id}`"
    >
      <Icon :name="notice.icon" size="14" class="mt-0.5 shrink-0" aria-hidden="true" />
      {{ notice.text }}
    </p>
  </div>
</template>

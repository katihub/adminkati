<script setup lang="ts">
import type { LigneResultatImport } from "@/types/api/stock-import"
import { Badge } from "@/components/ui/badge"
import { Table } from "@/components/vuzeno/table"
import { formatNumber } from "@/utils/format"
import { stockImportRowBadge, stockImportRowHeadlineKey } from "@/utils/stock-import-row"

const { line, preview = false } = defineProps<{ line: LigneResultatImport; preview?: boolean }>()

const { locale, t, te } = useI18n()

const statusKey = computed(() => (preview ? "preview.statuses" : "statuses"))
const badge = computed(() => stockImportRowBadge(line))
const headline = computed(() => {
  const key = stockImportRowHeadlineKey(line, statusKey.value)
  if (!key) return ""
  return te(`products.stockImport.${key}`)
    ? t(`products.stockImport.${key}`)
    : t("products.stockImport.rowCodes.echec_inattendu")
})
const variationClass = computed(() => {
  if (!line.variation) return "text-muted-foreground"
  return line.variation > 0 ? "text-success" : "text-destructive"
})
const hasBalance = computed(() => line.stock_avant !== null && line.stock_apres !== null)
</script>

<template>
  <Table.Row data-testid="stock-import-result-row">
    <Table.Cell class="rounded-l-lg px-2 py-3 whitespace-nowrap text-muted-foreground tabular-nums">
      {{ t("products.stockImport.rowLine", { line: line.ligne }) }}
    </Table.Cell>
    <Table.Cell class="max-w-64 min-w-40 px-2 py-3">
      <p class="line-clamp-2 text-sm" :title="line.produit_nom ?? line.produit_saisi">
        {{ line.produit_nom ?? line.produit_saisi }}
      </p>
    </Table.Cell>
    <Table.Cell class="px-2 py-3 whitespace-nowrap">
      <Badge :variant="badge.variant">{{ t(`products.stockImport.${statusKey}.${badge.status}`) }}</Badge>
    </Table.Cell>
    <Table.Cell class="px-2 py-3 whitespace-nowrap font-semibold" :class="variationClass">
      {{ line.variation === null ? "—" : formatNumber(line.variation, locale) }}
    </Table.Cell>
    <Table.Cell class="px-2 py-3 whitespace-nowrap text-muted-foreground">
      <span v-if="hasBalance" class="inline-flex items-center gap-2">
        {{ formatNumber(line.stock_avant!, locale) }}
        <Icon name="ph:arrow-right" aria-hidden="true" />
        <span class="font-bold text-success">{{ formatNumber(line.stock_apres!, locale) }}</span>
      </span>
      <span v-else>—</span>
    </Table.Cell>
    <Table.Cell class="max-w-56 min-w-36 rounded-r-lg px-2 py-3 text-xs">
      <p v-if="headline" :class="line.statut === 'echec' ? 'text-destructive' : 'text-muted-foreground'">
        {{ headline }}
      </p>
      <p v-if="line.message" class="line-clamp-3 text-muted-foreground" :title="line.message">{{ line.message }}</p>
      <p v-if="line.stock_modifie" class="mt-1 flex items-start gap-1.5 text-warning">
        <Icon name="ph:clock-counter-clockwise" size="14" class="mt-0.5 shrink-0" aria-hidden="true" />
        {{
          t("products.stockImport.stockChanged.row", {
            file: formatNumber(line.stock_fichier ?? 0, locale),
            live: formatNumber(line.stock_avant ?? 0, locale),
          })
        }}
      </p>
      <span v-if="!headline && !line.message && !line.stock_modifie" class="text-muted-foreground">—</span>
    </Table.Cell>
  </Table.Row>
</template>

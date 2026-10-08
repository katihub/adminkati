<script setup lang="ts">
import type { DevisLigne } from "@/types/api/devis"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const { lines } = defineProps<{
  lines: DevisLigne[]
}>()

const { t } = useI18n()
</script>

<template>
  <section class="flex flex-col rounded-2xl bg-card p-5" data-testid="quotes-lines-table">
    <div class="mb-4 flex items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon name="ph:shopping-bag" size="15" aria-hidden="true" />
        </div>
        <h3 class="font-heading text-sm font-semibold text-foreground">
          {{ t("quotes.detail.productInfoTitle") }}
        </h3>
        <span class="rounded-full bg-muted px-2.5 py-0.5 font-mono text-xs font-medium text-muted-foreground">
          {{ t("quotes.listPanel.itemCount", { count: lines.length }) }}
        </span>
      </div>
    </div>

    <div
      v-if="lines.length === 0"
      class="rounded-xl bg-muted/30 p-6 text-center text-sm text-muted-foreground"
      data-testid="quotes-detail-lines-empty"
    >
      {{ t("quotes.detail.noLines") }}
    </div>

    <div v-else class="min-w-0 w-full flex-1 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow class="hover:bg-transparent border-0">
            <TableHead class="w-14 px-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              {{ t("quotes.detail.sku") }}
            </TableHead>
            <TableHead class="px-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              {{ t("quotes.detail.product") }}
            </TableHead>
            <TableHead class="px-2 text-right text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              {{ t("quotes.detail.quantity") }}
            </TableHead>
            <TableHead class="px-2 text-right text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              {{ t("quotes.detail.unitPrice") }}
            </TableHead>
            <TableHead class="px-2 text-right text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              {{ t("quotes.detail.lineTotal") }}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <QuotesLineRow v-for="line in lines" :key="line.id" :line="line" />
        </TableBody>
      </Table>
    </div>
  </section>
</template>

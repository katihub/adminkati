<script setup lang="ts">
import type { CommandeLigneEquipe } from "@/types/api/commandes"
import { computed } from "vue"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const { lines } = defineProps<{
  lines: CommandeLigneEquipe[]
}>()

const { t } = useI18n()
const hasPrices = computed(() => lines.some(line => line.prixCapture !== undefined || line.prixFerme !== undefined))
</script>

<template>
  <section class="flex flex-col rounded-2xl bg-card p-5" data-testid="orders-lines-table">
    <div class="mb-4 flex items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon name="ph:shopping-bag" size="15" aria-hidden="true" />
        </div>
        <h3 class="font-heading text-sm font-semibold text-foreground">
          {{ t("orders.detail.productInfoTitle") }}
        </h3>
        <span class="rounded-full bg-muted px-2.5 py-0.5 font-mono text-xs font-medium text-muted-foreground">
          {{ t("orders.listPanel.itemCount", { count: lines.length }) }}
        </span>
      </div>
    </div>

    <div
      v-if="lines.length === 0"
      class="rounded-xl bg-muted/30 p-6 text-center text-sm text-muted-foreground"
      data-testid="orders-detail-lines-empty"
    >
      {{ t("orders.detail.noLines") }}
    </div>

    <div v-else class="min-w-0 w-full flex-1 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow class="hover:bg-transparent border-0">
            <TableHead class="w-14 px-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              {{ t("orders.detail.sku") }}
            </TableHead>
            <TableHead class="px-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              {{ t("orders.detail.product") }}
            </TableHead>
            <TableHead class="px-2 text-right text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              {{ t("orders.detail.quantity") }}
            </TableHead>
            <TableHead class="px-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              {{ t("orders.detail.lineStatus") }}
            </TableHead>
            <TableHead
              v-if="hasPrices"
              class="px-2 text-right text-xs uppercase tracking-wider text-muted-foreground font-semibold"
            >
              {{ t("orders.detail.unitPrice") }}
            </TableHead>
            <TableHead
              v-if="hasPrices"
              class="px-2 text-right text-xs uppercase tracking-wider text-muted-foreground font-semibold"
            >
              {{ t("orders.detail.lineTotal") }}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <OrdersLineRow v-for="line in lines" :key="line.id" :line="line" :show-total="hasPrices" />
        </TableBody>
      </Table>
    </div>
  </section>
</template>

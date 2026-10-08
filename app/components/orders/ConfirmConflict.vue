<script setup lang="ts">
import type { ConfirmConflict } from "@/utils/order-confirm-conflict"
import { formatMontant } from "@/utils/money"

const { conflict, productNames = {} } = defineProps<{
  conflict: ConfirmConflict
  /** The backend reports slugs only; names come from the order's own lines. */
  productNames?: Record<string, string>
}>()

const { t, te, locale } = useI18n()

function motifLabel(motif: string) {
  const key = `orders.actions.transitionDialog.conflictMotives.${motif}`
  return t(te(key) ? key : "orders.actions.transitionDialog.conflictMotives.autre")
}

function montant(value: number) {
  return formatMontant(value, locale.value).exact
}
</script>

<template>
  <div
    v-if="conflict.kind === 'stock'"
    role="alert"
    class="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm"
  >
    <p class="font-medium text-destructive">
      {{ t("orders.actions.transitionDialog.stockConflictTitle") }}
    </p>
    <ul data-testid="orders-transition-dialog-conflict-lines" class="list-disc space-y-1 pl-5">
      <li v-for="line in conflict.lignes" :key="line.slug">
        <span :class="!productNames[line.slug] && 'font-mono'">{{ productNames[line.slug] ?? line.slug }}</span> —
        {{ motifLabel(line.motif) }}
      </li>
    </ul>
  </div>

  <div
    v-else
    data-testid="orders-transition-dialog-drift"
    role="alert"
    class="space-y-1 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm"
  >
    <p class="font-medium">
      {{ t("orders.actions.transitionDialog.driftTitle") }}
    </p>
    <p>
      {{
        t("orders.actions.transitionDialog.driftBody", {
          previous: montant(conflict.totalPrecedent),
          proposed: montant(conflict.totalPropose),
        })
      }}
    </p>
  </div>
</template>

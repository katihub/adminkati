<script setup lang="ts">
import type { MouvementStock } from "@/types/api/inventaire"
import { computed } from "vue"
import { Badge } from "@/components/ui/badge"
import { Table } from "@/components/vuzeno/table"
import { formatDateCourte } from "@/utils/dates"
import { formatNumber } from "@/utils/format"
import { movementTypeVariant } from "@/utils/inventory-movement"

const { movement } = defineProps<{ movement: MouvementStock }>()

const { locale, t } = useI18n()

/** A zero variation (an opening balance of 0) is neither a gain nor a loss. */
const variationClass = computed(() => {
  if (movement.variation > 0) return "text-success"
  return movement.variation < 0 ? "text-destructive" : "text-muted-foreground"
})
</script>

<template>
  <Table.Row data-testid="product-inventory-movement">
    <Table.Cell class="rounded-l-lg px-2 py-3 whitespace-nowrap text-muted-foreground">
      {{ formatDateCourte(movement.cree_le, locale) }}
    </Table.Cell>
    <Table.Cell class="px-2 py-3 whitespace-nowrap">
      <Badge data-testid="product-inventory-type" :variant="movementTypeVariant(movement.type)">
        {{ t(`products.inventory.movementType.${movement.type}`) }}
      </Badge>
    </Table.Cell>
    <Table.Cell class="px-2 py-3 whitespace-nowrap font-semibold" :class="variationClass">
      {{ formatNumber(movement.variation, locale) }}
    </Table.Cell>
    <Table.Cell data-testid="product-inventory-balance" class="px-2 py-3 whitespace-nowrap text-muted-foreground">
      <span class="sr-only">{{
        t("products.inventory.balanceReading", {
          before: formatNumber(movement.quantite_avant, locale),
          after: formatNumber(movement.quantite_apres, locale),
        })
      }}</span>
      <span aria-hidden="true" class="inline-flex items-center gap-2">
        {{ formatNumber(movement.quantite_avant, locale) }}
        <Icon name="ph:arrow-right" aria-hidden="true" />
        <span
          class="font-bold"
          :class="[movement.quantite_apres >= 0 && 'text-success', movement.quantite_apres < 0 && 'text-error']"
        >
          {{ formatNumber(movement.quantite_apres, locale) }}
        </span>
      </span>
    </Table.Cell>
    <Table.Cell class="max-w-52 min-w-36 px-2 py-3 text-foreground">
      <p
        data-testid="product-inventory-reason"
        class="line-clamp-3 text-xs text-muted-foreground"
        :title="movement.motif || undefined"
      >
        {{ movement.motif || "—" }}
      </p>
    </Table.Cell>
    <Table.Cell class="px-2 py-3 whitespace-nowrap">
      <ProductsInventoryActorPill :acteur="movement.acteur" />
    </Table.Cell>
    <Table.Cell class="rounded-r-lg px-2 py-3 whitespace-nowrap font-mono text-muted-foreground">
      {{ movement.commande_reference || "—" }}
    </Table.Cell>
  </Table.Row>
</template>

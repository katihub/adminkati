<script setup lang="ts">
import type { CommandeDetail } from "@/types/api/commandes"
import { Badge } from "@/components/ui/badge"
import { ORDER_STATUS_TONE } from "@/utils/order-status"

const { order } = defineProps<{
  order: CommandeDetail
}>()

const { t } = useI18n()
</script>

<template>
  <header class="sticky top-0 z-10 flex flex-col gap-3 bg-card p-4 sm:p-5" data-testid="orders-detail-header">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex min-w-0 flex-wrap items-center gap-2.5">
        <h2
          class="truncate font-heading text-lg sm:text-xl font-bold font-mono tracking-tight text-foreground"
          data-testid="orders-detail-header-reference"
        >
          {{ order.reference }}
        </h2>
        <Badge
          data-testid="orders-detail-status"
          :data-status="order.statut"
          class="border-0! rounded-full px-2.5 py-0.5 text-xs font-semibold flex items-center gap-1.5"
          :class="ORDER_STATUS_TONE[order.statut]"
        >
          <span class="size-1.5 rounded-full bg-current" :class="order.statut === 'close' ? '' : 'animate-pulse'" />
          {{ t(`orders.status.${order.statut}`) }}
        </Badge>
        <span
          class="inline-flex items-center gap-1.5 rounded-full bg-muted/80 px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
        >
          <Icon
            :name="order.modeRemise === 'domicile' ? 'ph:house-line' : 'ph:storefront'"
            size="14"
            aria-hidden="true"
          />
          {{ t(`orders.deliveryModes.${order.modeRemise}`) }}
        </span>
      </div>

      <div v-if="$slots.actions" class="flex min-w-0 flex-wrap items-center justify-end gap-2">
        <slot name="actions" />
      </div>
    </div>

    <!-- Stepper Lifecycle progression -->
    <OrdersDetailStepper :order="order" />
  </header>
</template>

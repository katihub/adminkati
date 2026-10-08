<script setup lang="ts">
import { useId } from "vue"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"

/** The count on record and the switch that decides whether it governs the status. */
defineProps<{
  quantity: string
  isCounted: boolean
  isTracking: boolean
  disabled: boolean
  /** Set only for staff who may adjust stock; without it the count stays read-only. */
  productId?: number
}>()

const emit = defineEmits<{ track: [on: boolean] }>()

const { t } = useI18n()
const trackId = useId()
</script>

<template>
  <div class="space-y-2">
    <div class="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
      <p class="text-sm font-medium text-muted-foreground/80">
        {{ t("products.overview.stockIndicator.quantityLabel") }}
      </p>
      <Badge v-if="!isCounted" data-testid="products-detail-overview-not-counted">
        {{ t("products.overview.stockIndicator.notCounted") }}
      </Badge>
    </div>
    <div class="flex items-center gap-2.5">
      <div
        class="flex w-24 items-center justify-between rounded-md bg-muted/80 py-0.5 pl-3 pr-1"
        :class="isTracking ? undefined : 'opacity-60'"
      >
        <span
          data-testid="products-detail-overview-stock-quantity"
          role="status"
          :aria-label="t('products.overview.stockIndicator.quantity')"
          class="font-mono text-sm text-foreground"
          >{{ quantity }}</span
        >
        <ProductsInventoryAdjustmentDialog v-if="productId !== undefined" :product-id="productId">
          <template #trigger>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              data-testid="products-detail-overview-stock-edit"
              :aria-label="t('products.inventory.adjust')"
            >
              <Icon name="ph:pencil-simple" aria-hidden="true" />
            </Button>
          </template>
        </ProductsInventoryAdjustmentDialog>
      </div>
    </div>
    <div class="flex items-center gap-2.5">
      <Switch
        :id="trackId"
        data-testid="products-detail-overview-track-stock"
        :model-value="isTracking"
        :disabled="disabled"
        @update:model-value="(on: boolean) => emit('track', on)"
      />
      <label :for="trackId" class="text-sm font-medium text-muted-foreground">
        {{ t("products.overview.stockIndicator.track") }}
      </label>
      <InfoTip :text="t('products.overview.stockIndicator.hint')" />
    </div>
  </div>
</template>

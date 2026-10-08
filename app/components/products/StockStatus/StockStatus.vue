<script setup lang="ts">
import { computed, useId } from "vue"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"

/** The selling status and who controls it: the count, WooCommerce (until staff set it here) or the panel. */
const { isSelling, source } = defineProps<{
  isSelling: boolean
  source: "count" | "catalogue" | "panel"
  disabled: boolean
}>()

const emit = defineEmits<{ change: [selling: boolean] }>()

const { t } = useI18n()
const switchId = useId()

const sourceCopy = computed(() => {
  if (source === "count") return { icon: "ph:hash", text: t("products.overview.stockIndicator.followsCount") }
  if (source === "panel") {
    return { icon: "ph:pencil-simple-line", text: t("products.overview.stockIndicator.setInPanel") }
  }
  return { icon: "ph:cloud-arrow-down", text: t("products.overview.stockIndicator.fromCatalogue") }
})
</script>

<template>
  <div class="space-y-2">
    <div class="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
      <p class="text-sm font-medium text-muted-foreground/80">
        {{ t("products.overview.stockIndicator.statusLabel") }}
      </p>
      <!-- A panel decision overrides every import, so it is the one source worth a warning tone. -->
      <Badge data-testid="products-detail-overview-status-source" :variant="source === 'panel' ? 'warning' : 'outline'">
        <Icon :name="sourceCopy.icon" size="12" aria-hidden="true" />
        {{ sourceCopy.text }}
      </Badge>
    </div>
    <div class="flex items-center gap-2.5">
      <Switch
        :id="switchId"
        data-testid="products-detail-overview-en-stock"
        :model-value="isSelling"
        :disabled="disabled"
        @update:model-value="(next: boolean) => emit('change', next)"
      />
      <label :for="switchId" class="text-sm font-medium text-muted-foreground">
        {{ t(isSelling ? "products.overview.stockIndicator.label" : "products.overview.stockIndicator.outOfStock") }}
      </label>
    </div>
  </div>
</template>

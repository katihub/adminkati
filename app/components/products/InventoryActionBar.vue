<script setup lang="ts">
import { computed, ref } from "vue"
import { Button } from "@/components/ui/button"
import {
  useProductInventory,
  useSetProductAvailability,
  useSetProductStockStatus,
} from "@/composables/useProductInventory"
import { apiErrorText } from "@/utils/api-error"
import { toggledRestockingStatus } from "@/utils/inventory-movement"

const { productId } = defineProps<{ productId: number }>()

const { t } = useI18n()
const query = useProductInventory(() => productId)
const inventory = computed(() => query.data.value?.pages[0]?.inventaire)
const setStatus = useSetProductStockStatus(() => productId)
const setAvailability = useSetProductAvailability(() => productId)

const nextRestockingStatus = computed(() => toggledRestockingStatus(inventory.value))
const restockingLabel = computed(() =>
  t(
    nextRestockingStatus.value === "reapprovisionnement"
      ? "products.inventory.markRestocking"
      : "products.inventory.clearRestocking",
  ),
)
const failure = computed(() => setStatus.error.value ?? setAvailability.error.value)
const errorText = computed(() => (failure.value ? apiErrorText(failure.value, t) : ""))

/** A counted product hands its decision back with Track quantity; only an uncounted one needs the Follow button. */
const panelDecision = computed(() =>
  inventory.value?.modifie_le === null ? inventory.value.disponibilite_forcee : null,
)
const isFollowDialogOpen = ref(false)

function toggleRestocking() {
  if (nextRestockingStatus.value) setStatus.mutate({ statut: nextRestockingStatus.value })
}

function followCatalogue() {
  isFollowDialogOpen.value = false
  setAvailability.mutate({ disponibilite_forcee: null })
}
</script>

<template>
  <div data-testid="product-inventory-action-bar" class="flex flex-wrap items-center gap-3 border-t pt-3 mt-3">
    <h4 class="text-sm font-medium text-foreground">
      {{ t("products.inventory.movements") }}
    </h4>
    <div v-if="inventory" class="ml-auto flex flex-wrap items-center gap-3">
      <Button
        v-if="panelDecision"
        type="button"
        variant="outline"
        size="sm"
        data-testid="product-inventory-follow-catalogue"
        :disabled="setAvailability.isPending.value"
        @click="isFollowDialogOpen = true"
      >
        <Spinner v-if="setAvailability.isPending.value" data-icon="inline-start" />
        {{ t("products.inventory.followCatalogue.button") }}
      </Button>
      <Button
        v-if="nextRestockingStatus"
        type="button"
        variant="outline"
        size="sm"
        data-testid="product-inventory-restocking-toggle"
        :disabled="setStatus.isPending.value"
        @click="toggleRestocking"
      >
        <Spinner v-if="setStatus.isPending.value" data-icon="inline-start" />
        {{ restockingLabel }}
      </Button>
      <ProductsInventoryAdjustmentDialog :product-id="productId" />
    </div>
    <p
      v-if="errorText"
      data-testid="product-inventory-status-error"
      role="alert"
      class="basis-full text-sm text-destructive"
    >
      {{ errorText }}
    </p>
    <ProductsFollowCatalogueDialog
      v-if="panelDecision"
      v-model:open="isFollowDialogOpen"
      :current-status="panelDecision"
      @confirm="followCatalogue"
    />
  </div>
</template>

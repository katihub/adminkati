<script setup lang="ts">
import type { InventaireProduit, StatutForce } from "@/types/api/inventaire"
import type { AvailabilityConflict } from "@/utils/stock-availability"
import { computed, ref } from "vue"
import { useSetProductAvailability } from "@/composables/useProductInventory"
import { apiErrorText } from "@/utils/api-error"
import { availabilityConflict } from "@/utils/stock-availability"

/** `productId` is set only for staff who may change stock; without it every control stays read-only. */
const { inventory, productId } = defineProps<{ inventory?: InventaireProduit; productId?: number }>()

const { locale, t } = useI18n()

const setAvailability = useSetProductAvailability(() => inventory?.produit_id ?? 0)

const quantity = computed(() => new Intl.NumberFormat(locale.value).format(inventory?.quantite_stock ?? 0))
const isCounted = computed(() => (inventory?.modifie_le ?? null) !== null)
const isTracking = computed(() => isCounted.value && inventory?.disponibilite_forcee === null)
const isSelling = computed(() => inventory?.statut_stock === "en_stock")
const isDecided = computed(() => (inventory?.disponibilite_forcee ?? null) !== null)
const isReadOnly = computed(() => productId === undefined || setAvailability.isPending.value)
const errorText = computed(() => (setAvailability.error.value ? apiErrorText(setAvailability.error.value, t) : ""))

/** Where the status comes from: the count, or the panel once staff decided, or WooCommerce until then. */
const statusSource = computed(() => {
  if (isTracking.value) return "count"
  return isDecided.value ? "panel" : "catalogue"
})

const pendingChange = ref<{ target: StatutForce | null; conflict: AvailabilityConflict } | null>(null)
const isWarningOpen = computed({
  get: () => pendingChange.value !== null,
  set: open => {
    if (!open) pendingChange.value = null
  },
})

/** A status that contradicts the count waits for the operator's confirmation; anything else goes straight through. */
function request(target: StatutForce | null) {
  if (!inventory) return
  const conflict = availabilityConflict(inventory, target)
  if (conflict) pendingChange.value = { target, conflict }
  else setAvailability.mutate({ disponibilite_forcee: target })
}

/** Leaving the count keeps today's status as an explicit decision, so nothing changes for customers. */
function toggleTracking(on: boolean) {
  if (on) return request(null)
  request(isSelling.value ? "en_stock" : "rupture")
}

function confirmChange() {
  const change = pendingChange.value
  pendingChange.value = null
  if (change) setAvailability.mutate({ disponibilite_forcee: change.target })
}
</script>

<template>
  <div v-if="inventory" class="w-full space-y-3">
    <div class="grid items-center gap-x-10 gap-y-5 sm:grid-cols-2">
      <ProductsStockStatus
        :is-selling="isSelling"
        :source="statusSource"
        :disabled="isReadOnly || isTracking"
        @change="selling => request(selling ? 'en_stock' : 'rupture')"
      />
      <ProductsStockQuantity
        :quantity="quantity"
        :is-counted="isCounted"
        :is-tracking="isTracking"
        :disabled="isReadOnly || !isCounted"
        :product-id="productId"
        @track="toggleTracking"
      />
    </div>

    <p
      v-if="errorText"
      data-testid="products-detail-overview-availability-error"
      role="alert"
      class="text-sm text-destructive"
    >
      {{ errorText }}
    </p>

    <ProductsStockConflictDialog
      v-model:open="isWarningOpen"
      :conflict="pendingChange?.conflict ?? null"
      :quantity="inventory.quantite_stock"
      @confirm="confirmChange"
    />
  </div>
</template>

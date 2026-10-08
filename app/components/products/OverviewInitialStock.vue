<script setup lang="ts">
import type { StatutForce } from "@/types/api/inventaire"
import { computed, useId } from "vue"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

const { modelValue, inputId } = defineProps<{
  modelValue: string
  inputId: string
  disabled?: boolean
  /** Already translated; empty when the value is valid. */
  error?: string
}>()
const emit = defineEmits<{ "update:modelValue": [value: string] }>()
/** The status of a product that is not counted; a quantity decides it instead. */
const availability = defineModel<StatutForce>("availability", { default: "en_stock" })

const { t } = useI18n()
const availabilityId = useId()
const hasQuantity = computed(() => modelValue.trim() !== "")
</script>

<template>
  <div class="space-y-3">
    <div class="space-y-1.5">
      <Label :for="inputId" class="text-sm font-medium text-muted-foreground/80">
        {{ t("products.detailForm.initialStock.label") }}
      </Label>
      <Input
        :id="inputId"
        :model-value="modelValue"
        data-testid="products-detail-overview-initial-stock-input"
        type="number"
        min="0"
        step="1"
        :disabled="disabled"
        :aria-invalid="error ? true : undefined"
        :aria-describedby="error ? `${inputId}-error` : undefined"
        class="w-40"
        @update:model-value="value => emit('update:modelValue', String(value))"
      />
      <p
        v-if="error"
        :id="`${inputId}-error`"
        data-testid="products-detail-overview-initial-stock-error"
        role="alert"
        class="text-xs text-destructive"
      >
        {{ error }}
      </p>
      <p class="text-xs text-muted-foreground">
        {{ t("products.detailForm.initialStock.hint") }}
      </p>
    </div>

    <div class="space-y-1.5">
      <Label :for="availabilityId" class="text-sm font-medium text-muted-foreground/80">
        {{ t("products.detailForm.initialAvailability.label") }}
      </Label>
      <NativeSelect
        :id="availabilityId"
        v-model="availability"
        data-testid="products-detail-overview-initial-availability"
        class="w-40"
        :disabled="disabled || hasQuantity"
      >
        <NativeSelectOption value="en_stock">
          {{ t("products.detailForm.initialAvailability.inStock") }}
        </NativeSelectOption>
        <NativeSelectOption value="rupture">
          {{ t("products.detailForm.initialAvailability.outOfStock") }}
        </NativeSelectOption>
      </NativeSelect>
      <p class="text-xs text-muted-foreground">
        {{ t("products.detailForm.initialAvailability.hint") }}
      </p>
    </div>
  </div>
</template>

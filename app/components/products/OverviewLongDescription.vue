<script setup lang="ts">
import { computed } from "vue"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FICHE_TECHNIQUE_MAX_LENGTH } from "@/schemas/produit"

const props = defineProps<{
  modelValue: string
  inputId: string
  disabled?: boolean
  generating?: boolean
}>()
const emit = defineEmits<{ "update:modelValue": [value: string] }>()

const { t } = useI18n()

const remainingCount = computed(() => FICHE_TECHNIQUE_MAX_LENGTH - props.modelValue.length)

function updateValue(value: unknown) {
  emit("update:modelValue", String(value))
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <Label :for="props.inputId" class="text-sm font-medium text-muted-foreground/80">
        {{ t("products.overview.longDescriptionTitle") }}
      </Label>
      <span
        data-testid="products-detail-overview-long-description-counter"
        class="text-xs tabular-nums"
        :class="remainingCount < 0 ? 'text-destructive' : 'text-muted-foreground'"
      >
        {{
          t("products.detailForm.description.counter", {
            count: props.modelValue.length,
            max: FICHE_TECHNIQUE_MAX_LENGTH,
          })
        }}
      </span>
    </div>
    <div class="rounded-md" :class="props.generating && 'ai-generating'">
      <Textarea
        :id="props.inputId"
        :model-value="props.modelValue"
        :placeholder="t('products.detailForm.longDescription.placeholder')"
        :disabled="props.disabled"
        data-testid="products-detail-overview-long-description-input"
        class="min-h-40 border-0"
        @update:model-value="updateValue"
      />
    </div>
    <slot name="suggestion" />
  </div>
</template>

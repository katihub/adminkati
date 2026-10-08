<script setup lang="ts">
import type { PointVenteWizardStep } from "@/types/point-vente-wizard"
import { computed } from "vue"
import { Button } from "@/components/ui/button"

const { current, isCreate, isSaving, saveDisabled, submitLabel } = defineProps<{
  current: PointVenteWizardStep
  isCreate: boolean
  isSaving: boolean
  saveDisabled: boolean
  submitLabel: string
}>()

const emit = defineEmits<{ back: []; next: [] }>()

const { t } = useI18n()
const nextLabel = computed(() =>
  current === "identity" ? t("pointsOfSale.drawer.wizard.continue") : t("pointsOfSale.drawer.wizard.reviewDetails"),
)
</script>

<template>
  <div
    data-testid="points-of-sale-wizard-actions"
    class="flex items-center justify-between gap-3 border-t border-border pt-6"
  >
    <Button
      v-if="current !== 'identity'"
      type="button"
      variant="outline"
      data-testid="points-of-sale-wizard-back"
      :disabled="isSaving"
      @click="emit('back')"
    >
      {{ t("pointsOfSale.drawer.wizard.back") }}
    </Button>
    <span v-else />

    <Button v-if="current !== 'review'" type="button" data-testid="points-of-sale-wizard-next" @click="emit('next')">
      {{ nextLabel }}
    </Button>
    <Button
      v-else
      type="submit"
      data-testid="points-of-sale-wizard-submit"
      :disabled="saveDisabled"
      :aria-busy="isSaving || undefined"
    >
      <Spinner v-if="isSaving" data-icon="inline-start" />
      {{ isCreate ? t("pointsOfSale.drawer.create") : submitLabel }}
    </Button>
  </div>
</template>

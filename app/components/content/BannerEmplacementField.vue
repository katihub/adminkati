<script setup lang="ts">
import type { EmplacementBanniere } from "@/types/api/vitrine"
import { computed, useId } from "vue"
import { BANNIERE_EMPLACEMENTS } from "@/schemas/banniere"

/**
 * Which carousel of the home page's opening row shows the banner. Two native radios rather than
 * a select: both choices and what each one accepts stay visible, and the main carousel's rule —
 * wider than tall — is read before the artwork is chosen, not after it is refused. They are
 * dressed as a pill switch; the radios stay in the page, only hidden from sight.
 */
const { moving = false, disabled = false } = defineProps<{
  /** In edit, the saved placement differs from the chosen one: say where the banner will land. */
  moving?: boolean
  disabled?: boolean
}>()

const emplacement = defineModel<EmplacementBanniere>({ required: true })

const { t } = useI18n()
const name = useId()

const options = computed(() =>
  BANNIERE_EMPLACEMENTS.map(value => ({
    value,
    label: t(`content.banners.emplacement.${value}`),
    hint: t(`content.banners.emplacement.${value}Hint`),
  })),
)
</script>

<template>
  <fieldset data-testid="banner-form-emplacement" class="space-y-2" :disabled="disabled">
    <legend class="sr-only">
      {{ t("content.banners.form.emplacementLabel") }}
    </legend>
    <div class="inline-flex flex-wrap gap-1 rounded-full bg-muted p-1">
      <label
        v-for="option in options"
        :key="option.value"
        class="flex cursor-pointer items-center gap-1.5 rounded-full py-1.5 pr-2.5 pl-3.5 text-sm font-medium text-muted-foreground transition-colors has-[:checked]:bg-background has-[:checked]:text-foreground has-[:checked]:shadow-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring"
      >
        <input
          v-model="emplacement"
          type="radio"
          :name="name"
          :value="option.value"
          :data-testid="`banner-form-emplacement-${option.value}`"
          class="sr-only"
        />
        <span>{{ option.label }}</span>
        <InfoTip :data-testid="`banner-form-emplacement-info-${option.value}`" :text="option.hint" />
      </label>
    </div>
    <p v-if="moving" data-testid="banner-form-emplacement-moving" class="text-xs text-muted-foreground">
      {{ t("content.banners.form.emplacementMoveHint") }}
    </p>
  </fieldset>
</template>

<script setup lang="ts">
/**
 * The two other categories of a product, optional: the product also shows in them, the main one
 * keeps the rules. Neither can be the main category, nor the same as the other.
 */
const { options, main } = defineProps<{ options: Array<{ id: string; nom: string }>; main: string }>()
const others = defineModel<string[]>({ required: true })
const { t } = useI18n()

const available = (rank: number) =>
  options.filter(option => option.id !== main && !others.value.some((id, other) => other !== rank && id === option.id))
</script>

<template>
  <PointsOfSaleField
    v-for="rank in [0, 1]"
    :key="`other-${rank}`"
    v-slot="{ field }"
    :label="t('catalogue.otherCategory', { rank: rank + 1 })"
    :detail="rank === 0 ? t('catalogue.otherCategoryHelp') : undefined"
    ><select
      v-model="others[rank]"
      v-bind="field"
      :disabled="!main || (rank === 1 && !others[0])"
      class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      :data-testid="`catalogue-product-other-category-${rank + 1}`"
    >
      <option value="">{{ t("catalogue.otherCategoryNone") }}</option>
      <option v-for="option in available(rank)" :key="option.id" :value="option.id">{{ option.nom }}</option>
    </select></PointsOfSaleField
  >
</template>

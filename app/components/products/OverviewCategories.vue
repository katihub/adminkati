<script setup lang="ts">
import type { TaxonomieCategorie } from "@/types/api/produits"
import { computed } from "vue"

const {
  categories,
  selectedId,
  open,
  disabled = false,
  generating = false,
} = defineProps<{
  categories: TaxonomieCategorie[]
  selectedId: number | null
  open: boolean
  disabled?: boolean
  generating?: boolean
}>()
const emit = defineEmits<{
  "update:open": [value: boolean]
  select: [id: number]
}>()

const { t } = useI18n()

const options = computed(() => categories.map(category => ({ value: category.id, label: category.nom })))
</script>

<template>
  <div data-testid="products-detail-overview-colors" class="space-y-2">
    <label class="block text-sm font-medium text-muted-foreground/80">{{
      t("products.overview.availableCategories")
    }}</label>
    <ProductsOverviewPillPicker
      :options="options"
      :model-value="selectedId"
      :open="open"
      :disabled="disabled"
      :generating="generating"
      :placeholder="t('products.overview.categoryPlaceholder')"
      :search-placeholder="t('products.overview.categorySearchPlaceholder')"
      :empty-text="t('products.overview.noCategoryResults')"
      @update:open="value => emit('update:open', value)"
      @select="value => emit('select', Number(value))"
    />
  </div>
</template>

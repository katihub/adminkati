<script setup lang="ts">
import type { TaxonomieCategorie } from "@/types/api/produits"
import { computed, toRefs } from "vue"

const props = defineProps<{
  categories: TaxonomieCategorie[]
  selectedIds: number[]
  disabled?: boolean
  generating?: boolean
}>()
const emit = defineEmits<{ "update:selectedIds": [value: number[]] }>()
const { categories, selectedIds, disabled } = toRefs(props)

const { t } = useI18n()

const options = computed(() =>
  categories.value.map(category => ({
    id: String(category.id),
    label: category.nom,
  })),
)
const selectedValues = computed(() => selectedIds.value.map(String))
const testIds = {
  root: "products-detail-overview-secondary-categories",
  item: "products-detail-overview-secondary-category",
  remove: "products-detail-overview-secondary-category-remove",
  overflow: "products-detail-overview-secondary-category-overflow",
  add: "products-detail-overview-secondary-category-add",
}

function updateSelectedIds(value: string[]) {
  emit("update:selectedIds", value.map(Number))
}

function removeItemLabel(name: string) {
  return t("products.overview.removeSecondaryCategory", { name })
}

function moreItemsLabel(count: number) {
  return t("products.overview.moreSecondaryCategories", { count })
}
</script>

<template>
  <InlineTagSelector
    :options="options"
    :selected-ids="selectedValues"
    :disabled="disabled"
    :generating="generating"
    :label="t('products.overview.secondaryCategories')"
    label-class="text-muted-foreground/80"
    :search-placeholder="t('products.overview.secondaryCategorySearchPlaceholder')"
    :no-results-label="t('products.overview.noSecondaryCategoryResults')"
    :add-label="t('products.overview.addSecondaryCategory')"
    :add-selected-label="t('products.overview.addSecondaryCategories')"
    :remove-item-label="removeItemLabel"
    :more-items-label="moreItemsLabel"
    :test-ids="testIds"
    @update:selected-ids="updateSelectedIds"
  />
</template>

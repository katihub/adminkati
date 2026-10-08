<script setup lang="ts">
import type { TaxonomieRayon } from "@/types/api/produits"
import { computed } from "vue"

const {
  departments,
  activeValue,
  disabled = false,
  generating = false,
} = defineProps<{
  departments: TaxonomieRayon[]
  activeValue: string | null
  disabled?: boolean
  generating?: boolean
}>()
const emit = defineEmits<{ "update:activeValue": [value: string] }>()

const { t } = useI18n()

const options = computed(() => departments.map(department => ({ value: department.id, label: department.nom })))
const activeId = computed(
  () => departments.find(department => department.id === activeValue || department.slug === activeValue)?.id ?? null,
)
</script>

<template>
  <div data-testid="products-detail-overview-sizes" class="space-y-2">
    <label class="text-sm font-medium text-muted-foreground/80">{{
      t("products.overview.availableDepartments")
    }}</label>
    <div class="mt-2!">
      <ProductsOverviewPillPicker
        :options="options"
        :model-value="activeId"
        :disabled="disabled"
        :generating="generating"
        :placeholder="t('products.overview.departmentPlaceholder')"
        :search-placeholder="t('products.overview.departmentSearchPlaceholder')"
        :empty-text="t('products.overview.noDepartmentResults')"
        @select="value => emit('update:activeValue', String(value))"
      />
    </div>
  </div>
</template>

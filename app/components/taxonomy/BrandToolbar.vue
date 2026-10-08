<script setup lang="ts">
import type { Filter } from "@/components/vuzeno/filters"

defineProps<{ canWrite: boolean; hasActiveFilters: boolean }>()
const emit = defineEmits<{ clear: []; add: [] }>()
const filters = defineModel<Filter[]>("filters", { required: true })
</script>

<template>
  <TaxonomySearchToolbar
    v-model:filters="filters"
    :can-write="canWrite"
    :has-active-filters="hasActiveFilters"
    :search-label="$t('taxonomy.brands.searchLabel')"
    :search-operator="$t('taxonomy.brands.searchOperator')"
    :clear-label="$t('taxonomy.brands.clear')"
    test-id="brand-toolbar"
    @clear="emit('clear')"
    @add="emit('add')"
  >
    <template #actions>
      <slot name="actions" />
    </template>
  </TaxonomySearchToolbar>
</template>

<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import type { Filter, FilterFieldItem, FiltersSize, FiltersVariant } from "@/components/vuzeno/filters"
import { ref } from "vue"
import { Filters } from "@/components/vuzeno/filters"

const props = withDefaults(defineProps<{
  fields: FilterFieldItem[]
  hasActiveFilters: boolean
  label: string
  testId: string
  clearTestId: string
  class?: HTMLAttributes["class"]
}>(), {
  class: "gap-4",
})

const emit = defineEmits<{ clear: [] }>()
const filters = defineModel<Filter[]>("filters", { required: true })
const variant = ref<FiltersVariant>("outline")
const size = ref<FiltersSize>("sm")
</script>

<template>
  <Filters.Provider
    v-model:filters="filters"
    :fields="props.fields"
    :variant="variant"
    :size="size"
    :class="props.class"
    :data-testid="props.testId"
  >
    <FiltersChipList :filters="filters" />
    <FilterResetButton
      :data-testid="props.clearTestId"
      :has-active-filters="props.hasActiveFilters"
      :label="props.label"
      @clear="emit('clear')"
    />
  </Filters.Provider>
</template>

<script setup lang="ts">
import type { Filter, FiltersSize, FiltersVariant } from "@/components/vuzeno/filters"
import { PhMagnifyingGlass, PhPlus } from "@phosphor-icons/vue"
import { computed, h, ref } from "vue"
import { Button } from "@/components/ui/button"
import { Field, Filters, Operator } from "@/components/vuzeno/filters"

const props = defineProps<{
  canWrite: boolean
  hasActiveFilters: boolean
  searchLabel: string
  searchOperator: string
  clearLabel: string
  addLabel?: string
  testId: string
}>()

const emit = defineEmits<{
  clear: []
  add: []
}>()

const filters = defineModel<Filter[]>("filters", { required: true })
const variant = ref<FiltersVariant>("outline")
const size = ref<FiltersSize>("sm")
const fields = computed(() => [
  Field.TextField({
    key: "q",
    label: props.searchLabel,
    icon: () => h(PhMagnifyingGlass),
    operators: [Operator.Contain({ label: props.searchOperator, default: true })],
  }),
])
</script>

<template>
  <section class="flex flex-wrap items-center gap-3 py-4" :data-testid="testId">
    <Filters.Provider v-model:filters="filters" :fields="fields" :variant="variant" :size="size">
      <FiltersChipList :filters="filters" />
      <FilterResetButton
        :data-testid="`${testId}-clear`"
        :has-active-filters="hasActiveFilters"
        :label="clearLabel"
        @clear="emit('clear')"
      />
    </Filters.Provider>
    <div v-if="canWrite" class="ml-auto flex items-center gap-3">
      <slot name="actions" />
      <Button v-if="addLabel" size="sm" :data-testid="`${testId}-add`" @click="emit('add')">
        <PhPlus :size="16" aria-hidden="true" />
        {{ addLabel }}
      </Button>
    </div>
  </section>
</template>

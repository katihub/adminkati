<script setup lang="ts">
import type { Filter } from "@/components/vuzeno/filters"
import { computed } from "vue"
import { Filters } from "@/components/vuzeno/filters"

const { filters } = defineProps<{ filters: Filter[] }>()

/** The search chip (`field: "q"`) stays permanently inline and non-removable across every
 *  toolbar that has one — `filter.field !== "q"` is the one rule every caller shares. */
const visibleFilters = computed(() => filters.filter(filter => !filter.hidden))
</script>

<template>
  <Filters.Menu>
    <Filters.MenuTrigger />
    <Filters.MenuContent />
  </Filters.Menu>

  <Filters.Group filter-style="long">
    <Filters.Item
      v-for="filter in visibleFilters"
      :key="`${filter.field}:${filter.operator}`"
      :filter="filter"
      :removable="filter.field !== 'q'"
    />
  </Filters.Group>
</template>

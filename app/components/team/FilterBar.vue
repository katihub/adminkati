<script setup lang="ts">
import type { Filter } from "@/components/vuzeno/filters"

const props = defineProps<{
  hasActiveFilters: boolean
}>()

const emit = defineEmits<{ clear: [] }>()
const filters = defineModel<Filter[]>("filters", { required: true })
</script>

<template>
  <PeopleFilterBar
    v-model:filters="filters"
    resource="team"
    :has-active-filters="props.hasActiveFilters"
    @clear="emit('clear')"
  />
</template>

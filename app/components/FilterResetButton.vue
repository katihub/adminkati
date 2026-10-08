<script setup lang="ts">
import { Button } from "@/components/ui/button"

defineProps<{
  hasActiveFilters: boolean
  label: string
}>()

const emit = defineEmits<{ clear: [] }>()
</script>

<template>
  <!-- Not `Filters.Clear` — it empties the filters array, and these chips are meant to reset
       to their page's neutral defaults, not disappear. -->
  <Button v-if="hasActiveFilters" variant="outline" size="icon-sm" :aria-label="label" @click="emit('clear')">
    <Icon name="ph:funnel-x" aria-hidden="true" />
  </Button>
</template>

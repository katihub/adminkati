<script setup lang="ts">
const { label, trait = "solide" } = defineProps<{
  label: string
  /** Shape, not hue, is what tells the two series apart on the slab. */
  trait?: "solide" | "tirets"
}>()
</script>

<template>
  <span class="inline-flex items-center gap-2 text-xs font-medium" data-testid="stats-legend-chip">
    <span
      class="h-0 w-3 shrink-0 border-t-2 border-current"
      :class="trait === 'tirets' ? 'border-dashed' : 'border-solid'"
      aria-hidden="true"
    />
    {{ label }}
  </span>
</template>

<script setup lang="ts">
/**
 * Product images stay out of IPX even when their host is also trusted for banner
 * transforms. The `none` provider also preserves browser-local blob/data previews;
 * the default provider treats blob URLs as site paths and sends them to IPX.
 */
const props = defineProps<{
  src: string | null | undefined
  alt?: string | null
  /** Kept as an attribute rather than hardcoded: the hero loads eagerly. */
  loading?: "lazy" | "eager"
}>()

const emit = defineEmits<{ load: []; error: [] }>()
</script>

<template>
  <NuxtImg
    provider="none"
    :src="src ?? undefined"
    :alt="alt ?? ''"
    :loading="loading ?? 'lazy'"
    v-bind="$attrs"
    @load="emit('load')"
    @error="emit('error')"
  />
</template>

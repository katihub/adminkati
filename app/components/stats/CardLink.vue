<script setup lang="ts">
const { to, label } = defineProps<{
  to: string
  label: string
}>()
</script>

<template>
  <NuxtLinkLocale
    :to="to"
    class="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
  >
    <span>{{ label }}</span>
    <Icon name="ph:arrow-up-right" size="14" aria-hidden="true" />
  </NuxtLinkLocale>
</template>

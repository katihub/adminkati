<script setup lang="ts">
defineProps<{
  icon: string
  text: string
}>()
</script>

<template>
  <div class="flex items-center justify-center gap-1.5 px-4 py-10 text-center text-sm text-muted-foreground">
    <Icon :name="icon" size="16" class="shrink-0" aria-hidden="true" />
    <span>{{ text }}</span>
  </div>
</template>

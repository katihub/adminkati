<script setup lang="ts">
import { brand } from "~~/brand.config"

const { size = "md" } = defineProps<{ size?: "sm" | "md" }>()

const compact = computed(() => size === "sm")
</script>

<template>
  <span class="inline-flex items-center" :class="compact ? 'gap-1.5' : 'gap-2'">
    <span
      class="inline-flex shrink-0 items-center justify-center rounded-lg bg-primary font-black leading-none text-white"
      :class="compact ? 'size-6 text-xs' : 'size-8 text-sm'"
      aria-hidden="true"
    >
      K
    </span>

    <span class="font-bold tracking-tight" :class="compact ? 'text-lg' : 'text-2xl'">
      <span class="text-foreground">{{ brand.wordmark.leading }}</span
      ><span class="text-primary">{{ brand.wordmark.accent }}</span>
    </span>
  </span>
</template>

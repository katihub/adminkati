<script setup lang="ts">
import { brand } from "~~/brand.config"

const { size = "md" } = defineProps<{ size?: "sm" | "md" }>()

const compact = computed(() => size === "sm")
</script>

<template>
  <span class="inline-flex items-center" :class="compact ? 'gap-1.5' : 'gap-2'">
    <span
      class="relative block shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-border"
      :class="compact ? 'size-6' : 'size-8'"
      aria-hidden="true"
    >
      <NuxtImg
        :src="brand.logoPath"
        alt=""
        width="48"
        height="48"
        class="absolute left-1/2 top-0 max-w-none -translate-x-1/2 object-cover"
        :class="compact ? 'size-9' : 'size-12'"
      />
    </span>

    <span class="font-bold tracking-tight" :class="compact ? 'text-lg' : 'text-2xl'">
      <span class="text-foreground">{{ brand.wordmark.leading }}</span
      ><span class="text-primary">{{ brand.wordmark.accent }}</span>
    </span>
  </span>
</template>

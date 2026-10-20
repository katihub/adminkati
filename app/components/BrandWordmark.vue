<script setup lang="ts">
import { brand } from "~~/brand.config"

const { size = "md" } = defineProps<{ size?: "sm" | "md" }>()

const compact = computed(() => size === "sm")
</script>

<template>
  <span class="inline-flex items-center" :class="compact ? 'gap-1.5' : 'gap-2'">
    <NuxtImg
      :src="brand.logoPath"
      alt=""
      :width="compact ? 28 : 36"
      :height="compact ? 28 : 36"
      sizes="36px"
      class="shrink-0 rounded-full bg-white object-contain"
    />

    <span class="font-bold tracking-tight" :class="compact ? 'text-lg' : 'text-2xl'">
      <span class="text-foreground">{{ brand.wordmark.leading }}</span
      ><span class="text-primary">{{ brand.wordmark.accent }}</span>
    </span>
  </span>
</template>

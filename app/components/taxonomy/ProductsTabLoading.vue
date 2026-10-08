<script setup lang="ts">
import CategoryProductCardSkeleton from "@/components/taxonomy/CategoryProductCardSkeleton.vue"
</script>

<template>
  <div class="flex flex-col gap-3" aria-busy="true">
    <div class="h-3 w-28 animate-pulse rounded-md bg-foreground/10" aria-hidden="true" />
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <CategoryProductCardSkeleton v-for="index in 4" :key="index" />
    </div>
  </div>
</template>

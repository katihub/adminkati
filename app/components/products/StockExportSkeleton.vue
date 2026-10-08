<script setup lang="ts">
import { Skeleton } from "@/components/ui/skeleton"

defineProps<{ label: string }>()
</script>

<template>
  <div class="flex flex-col gap-3" data-testid="stock-export-skeleton">
    <p role="status" class="sr-only">{{ label }}</p>
    <div aria-hidden="true" class="flex flex-col gap-3">
      <Skeleton class="bg-muted-foreground/15 h-3 w-24" />
      <div class="flex flex-wrap gap-2">
        <Skeleton v-for="n in 3" :key="n" class="bg-muted-foreground/15 h-6 w-28 rounded-full" />
      </div>
      <Skeleton class="bg-muted-foreground/15 h-4 w-48" />
    </div>
  </div>
</template>

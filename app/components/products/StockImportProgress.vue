<script setup lang="ts">
import { Skeleton } from "@/components/ui/skeleton"

defineProps<{ label: string }>()
const ROWS = 5
const COLUMN_WIDTHS = ["w-14", "w-full", "w-16", "w-12", "w-20", "w-24"] as const
const TONE = "bg-muted-foreground/15"
</script>

<template>
  <div class="flex flex-col gap-4" data-testid="stock-import-skeleton">
    <p role="status" class="sr-only">{{ label }}</p>
    <div aria-hidden="true" class="flex flex-col gap-4">
      <div class="flex gap-2">
        <Skeleton v-for="n in 3" :key="n" :class="[TONE, 'h-5 w-24 rounded-full']" />
      </div>
      <div class="flex flex-col gap-1 rounded-xl bg-accent p-1 dark:bg-card">
        <div class="flex items-center gap-4 px-2 py-3">
          <Skeleton v-for="(width, i) in COLUMN_WIDTHS" :key="i" :class="[TONE, 'h-3', width]" />
        </div>
        <div v-for="row in ROWS" :key="row" class="flex items-center gap-4 rounded-lg bg-background px-2 py-4">
          <Skeleton v-for="(width, i) in COLUMN_WIDTHS" :key="i" :class="[TONE, 'h-3.5', width]" />
        </div>
      </div>
      <div class="flex justify-end gap-2">
        <Skeleton :class="[TONE, 'h-8 w-20 rounded-lg']" />
        <Skeleton :class="[TONE, 'h-8 w-36 rounded-lg']" />
      </div>
    </div>
  </div>
</template>

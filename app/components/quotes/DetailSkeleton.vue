<script setup lang="ts">
import { Skeleton } from "@/components/ui/skeleton"

defineProps<{
  label: string
}>()

const BASIC_DETAILS_COUNT = 4
const LINE_ITEMS_COUNT = 3
</script>

<template>
  <div role="status" aria-busy="true" :aria-label="label" data-testid="quotes-detail-loading" class="flex flex-col">
    <p class="sr-only">{{ label }}</p>

    <!-- Header Skeleton -->
    <header data-testid="quotes-detail-skeleton-header" class="sticky top-0 z-10 bg-card px-5 py-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2.5">
          <Skeleton class="h-6 w-36 rounded-lg" />
          <Skeleton class="h-5 w-24 rounded-full" />
        </div>
        <div class="flex items-center gap-2">
          <Skeleton data-testid="quotes-detail-skeleton-refresh" class="h-8 w-28 rounded-lg" />
          <Skeleton class="h-8 w-20 rounded-lg" />
        </div>
      </div>
    </header>

    <!-- Main Content 2-Column Split -->
    <div class="grid w-full min-w-0 grid-cols-1 gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <!-- Left Column: Basic Details & Lines Table -->
      <div class="flex min-w-0 flex-col gap-5">
        <!-- Basic Details Card -->
        <section data-testid="quotes-detail-skeleton-basic" class="bg-card rounded-2xl p-5">
          <Skeleton class="mb-4 h-4 w-32 rounded-md" />
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div v-for="index in BASIC_DETAILS_COUNT" :key="index" class="space-y-2">
              <Skeleton class="h-3 w-16 rounded-md" />
              <Skeleton class="h-4 w-28 rounded-md" />
            </div>
          </div>
        </section>

        <!-- Lines Table Card -->
        <section data-testid="quotes-detail-skeleton-lines" class="flex flex-1 flex-col bg-card rounded-2xl p-5">
          <div class="mb-4 flex items-center justify-between">
            <Skeleton class="h-4 w-28 rounded-md" />
            <Skeleton class="h-5 w-16 rounded-full" />
          </div>
          <div class="divide-y divide-muted/30">
            <div v-for="index in LINE_ITEMS_COUNT" :key="index" class="flex items-center gap-4 py-3.5">
              <Skeleton class="size-9 shrink-0 rounded-xl" />
              <div class="min-w-0 flex-1 space-y-1.5">
                <Skeleton class="h-4 w-44 rounded-md" />
                <Skeleton class="h-3 w-20 rounded-md" />
              </div>
              <Skeleton class="h-4 w-12 rounded-md" />
              <Skeleton class="h-4 w-16 rounded-md" />
              <Skeleton class="h-4 w-20 rounded-md" />
            </div>
          </div>
        </section>
      </div>

      <!-- Right Column: Operational Sidebar -->
      <div class="flex min-w-0 flex-col gap-5">
        <!-- Amount Summary Card -->
        <section data-testid="quotes-detail-skeleton-amount" class="bg-card rounded-2xl p-5">
          <div class="flex items-center justify-between">
            <Skeleton class="h-4 w-28 rounded-md" />
            <Skeleton class="h-5 w-20 rounded-full" />
          </div>

          <!-- Total callout block -->
          <div class="mt-4 rounded-xl bg-muted/40 p-4 space-y-2">
            <Skeleton class="h-3 w-24 rounded-md" />
            <Skeleton class="h-7 w-36 rounded-md" />
          </div>

          <!-- Breakdown items -->
          <div class="mt-4 space-y-2.5">
            <div class="flex items-center justify-between">
              <Skeleton class="h-3.5 w-24 rounded-md" />
              <Skeleton class="h-3.5 w-20 rounded-md" />
            </div>
            <div class="flex items-center justify-between">
              <Skeleton class="h-3.5 w-20 rounded-md" />
              <Skeleton class="h-3.5 w-20 rounded-md" />
            </div>
            <div class="flex items-center justify-between pt-1">
              <Skeleton class="h-4 w-16 rounded-md" />
              <Skeleton class="h-4 w-24 rounded-md" />
            </div>
          </div>
        </section>

        <!-- Customer Info Card -->
        <section data-testid="quotes-detail-skeleton-customer" class="bg-card rounded-2xl p-5">
          <Skeleton class="mb-4 h-4 w-28 rounded-md" />
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div class="space-y-1.5">
                <Skeleton class="h-4 w-32 rounded-md" />
                <Skeleton class="h-3 w-24 rounded-md" />
              </div>
              <Skeleton class="size-8 rounded-lg" />
            </div>
            <Skeleton class="h-10 w-full rounded-xl" />
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

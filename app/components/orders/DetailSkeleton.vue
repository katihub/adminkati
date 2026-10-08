<script setup lang="ts">
import { Skeleton } from "@/components/ui/skeleton"

defineProps<{
  label: string
}>()

const STEPPER_COUNT = 5
const BASIC_DETAILS_COUNT = 4
const LINE_ITEMS_COUNT = 3
</script>

<template>
  <div role="status" aria-busy="true" :aria-label="label" data-testid="orders-detail-loading" class="flex flex-col">
    <p class="sr-only">{{ label }}</p>

    <!-- Header Skeleton -->
    <header data-testid="orders-detail-skeleton-header" class="sticky top-0 z-10 bg-card px-5 py-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2.5">
          <Skeleton class="h-6 w-36 rounded-lg" />
          <Skeleton class="h-5 w-24 rounded-full" />
          <Skeleton class="h-5 w-20 rounded-full" />
        </div>
        <div class="flex items-center gap-2">
          <Skeleton class="h-8 w-24 rounded-xl" />
          <Skeleton class="h-8 w-28 rounded-xl" />
        </div>
      </div>

      <!-- Stepper Skeleton -->
      <div data-testid="orders-detail-skeleton-stepper" class="mt-4 pt-3">
        <div class="flex items-center justify-between gap-2">
          <template v-for="index in STEPPER_COUNT" :key="index">
            <div class="flex items-center gap-2">
              <Skeleton class="size-7 shrink-0 rounded-full" />
              <Skeleton class="hidden h-3 w-16 rounded-md sm:block" />
            </div>
            <Skeleton v-if="index < STEPPER_COUNT" class="h-1 flex-1 rounded-full" />
          </template>
        </div>
      </div>
    </header>

    <!-- Main Content 2-Column Split -->
    <div class="grid w-full min-w-0 grid-cols-1 gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <!-- Left Column: Basic Details & Lines Table -->
      <div class="flex min-w-0 flex-col gap-5">
        <!-- Basic Details Card -->
        <section data-testid="orders-detail-skeleton-basic" class="bg-card rounded-2xl p-5">
          <Skeleton class="mb-4 h-4 w-32 rounded-md" />
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div v-for="index in BASIC_DETAILS_COUNT" :key="index" class="space-y-2">
              <Skeleton class="h-3 w-16 rounded-md" />
              <Skeleton class="h-4 w-28 rounded-md" />
            </div>
          </div>
        </section>

        <!-- Lines Table Card -->
        <section data-testid="orders-detail-skeleton-lines" class="flex flex-1 flex-col bg-card rounded-2xl p-5">
          <div class="mb-4 flex items-center justify-between">
            <Skeleton class="h-4 w-28 rounded-md" />
            <Skeleton class="h-5 w-16 rounded-full" />
          </div>
          <div class="divide-y divide-muted/30">
            <div v-for="index in LINE_ITEMS_COUNT" :key="index" class="flex items-center gap-4 py-3.5">
              <Skeleton class="size-12 shrink-0 rounded-xl" />
              <div class="min-w-0 flex-1 space-y-1.5">
                <Skeleton class="h-4 w-44 rounded-md" />
                <Skeleton class="h-3 w-20 rounded-md" />
              </div>
              <Skeleton class="h-6 w-12 rounded-full" />
              <Skeleton class="h-4 w-16 rounded-md" />
              <Skeleton class="h-4 w-20 rounded-md" />
            </div>
          </div>
        </section>
      </div>

      <!-- Right Column: Operational Sidebar -->
      <div class="flex min-w-0 flex-col gap-5">
        <!-- Payment Status Card -->
        <section data-testid="orders-detail-skeleton-payment" class="bg-card rounded-2xl p-5">
          <div class="flex items-center justify-between">
            <Skeleton class="h-4 w-28 rounded-md" />
            <Skeleton class="h-5 w-20 rounded-full" />
          </div>

          <!-- Reste à payer callout block -->
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

          <Skeleton class="mt-4 h-9 w-full rounded-xl" />
        </section>

        <!-- Customer Info Card -->
        <section data-testid="orders-detail-skeleton-customer" class="bg-card rounded-2xl p-5">
          <Skeleton class="mb-4 h-4 w-28 rounded-md" />
          <div class="flex items-center justify-between">
            <div class="space-y-1.5">
              <Skeleton class="h-4 w-32 rounded-md" />
              <Skeleton class="h-3 w-24 rounded-md" />
            </div>
            <Skeleton class="size-8 rounded-full" />
          </div>
        </section>

        <!-- Delivery Info Card -->
        <section data-testid="orders-detail-skeleton-delivery" class="bg-card rounded-2xl p-5">
          <Skeleton class="mb-4 h-4 w-28 rounded-md" />
          <div class="space-y-1.5">
            <Skeleton class="h-3.5 w-48 rounded-md" />
            <Skeleton class="h-3.5 w-32 rounded-md" />
          </div>

          <!-- Physical landmark callout -->
          <div class="mt-4 rounded-xl bg-muted/30 p-3 space-y-1.5">
            <Skeleton class="h-2.5 w-20 rounded-md" />
            <Skeleton class="h-3.5 w-40 rounded-md" />
          </div>

          <!-- Courier block -->
          <div class="mt-4 space-y-2">
            <Skeleton class="h-3 w-24 rounded-md" />
            <div class="flex items-center gap-3">
              <Skeleton class="size-8 rounded-full" />
              <div class="space-y-1">
                <Skeleton class="h-3.5 w-28 rounded-md" />
                <Skeleton class="h-3 w-16 rounded-md" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

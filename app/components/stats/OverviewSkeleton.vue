<script setup lang="ts">
import { Skeleton } from "@/components/ui/skeleton"

const { label } = defineProps<{
  label: string
}>()

const KPI_COUNT = 4
const CATALOGUE_COUNT = 3
const TABLE_ROW_COUNT = 4
</script>

<template>
  <section data-testid="overview-loading-skeleton" aria-busy="true" :aria-label="label" class="flex flex-col gap-6">
    <div data-testid="overview-loading-kpis" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <article
        v-for="index in KPI_COUNT"
        :key="index"
        class="flex min-h-40 flex-col justify-between rounded-2xl bg-card p-5 text-card-foreground"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex flex-1 items-center gap-3">
            <Skeleton class="size-10 shrink-0 rounded-full" />
            <div class="flex flex-1 flex-col gap-2">
              <Skeleton class="h-3 w-24" />
              <Skeleton class="h-2.5 w-16" />
            </div>
          </div>
          <Skeleton class="size-7 shrink-0 rounded-lg" />
        </div>
        <Skeleton class="my-4 h-9 w-28 rounded-lg" />
        <div class="flex items-center justify-between border-t border-border/30 pt-3">
          <Skeleton class="h-2.5 w-20" />
          <Skeleton class="h-5 w-14 rounded-full" />
        </div>
      </article>
    </div>

    <div data-testid="overview-loading-analytics" class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
      <article class="flex min-h-[30rem] flex-col rounded-2xl bg-card p-5 text-card-foreground">
        <div class="flex items-center justify-between">
          <Skeleton class="h-5 w-36" />
          <Skeleton class="h-8 w-24 rounded-lg" />
        </div>
        <div class="mt-4 flex items-center justify-between gap-4">
          <Skeleton class="h-9 w-32 rounded-lg" />
          <div class="flex items-center gap-4">
            <Skeleton class="h-3 w-16" />
            <Skeleton class="h-3 w-16" />
          </div>
        </div>
        <div class="mt-3 flex items-center gap-1 self-start rounded-2xl bg-muted/60 p-1">
          <Skeleton v-for="index in 3" :key="index" class="h-8 w-20 rounded-xl" />
        </div>
        <Skeleton class="mt-4 h-64 w-full rounded-xl" />
      </article>

      <div class="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
        <div class="grid min-w-0 grid-cols-1 gap-4">
          <article class="flex min-h-[30rem] flex-col rounded-2xl bg-card p-5 text-card-foreground">
            <div class="flex items-center justify-between">
              <Skeleton class="h-5 w-28" />
              <Skeleton class="h-8 w-24 rounded-lg" />
            </div>
            <Skeleton class="mt-4 h-9 w-32 rounded-lg" />
            <div class="mt-3 flex items-center gap-3">
              <Skeleton class="size-2.5 rounded-full" />
              <Skeleton class="h-3 w-20" />
              <Skeleton class="size-2.5 rounded-full" />
              <Skeleton class="h-3 w-20" />
            </div>
            <Skeleton class="mt-4 h-48 w-full rounded-xl" />
          </article>

          <article class="flex min-h-32 flex-col justify-between rounded-2xl bg-card p-5 text-card-foreground">
            <div class="flex items-center gap-2">
              <Skeleton class="size-5 rounded-md" />
              <Skeleton class="h-3 w-28" />
            </div>
            <Skeleton class="mt-3 h-8 w-24 rounded-lg" />
          </article>
        </div>

        <div class="grid min-w-0 grid-cols-1 gap-4">
          <article
            v-for="index in CATALOGUE_COUNT"
            :key="index"
            class="flex min-h-32 flex-col justify-between rounded-2xl bg-card p-5 text-card-foreground"
          >
            <div class="flex items-center gap-2">
              <Skeleton class="size-5 rounded-md" />
              <Skeleton class="h-3 w-28" />
            </div>
            <Skeleton class="mt-3 h-8 w-24 rounded-lg" />
          </article>
        </div>
      </div>
    </div>

    <div data-testid="overview-loading-activity" class="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <article class="flex min-h-72 flex-col rounded-2xl bg-card p-5 text-card-foreground lg:col-span-7">
        <div class="flex items-start justify-between gap-4">
          <div class="flex flex-col gap-2">
            <Skeleton class="h-6 w-40" />
            <Skeleton class="h-3 w-52" />
          </div>
          <Skeleton class="h-8 w-24 rounded-lg" />
        </div>
        <div class="mt-5 flex flex-col gap-4">
          <div v-for="index in TABLE_ROW_COUNT" :key="index" class="flex items-center gap-3">
            <Skeleton class="size-9 shrink-0 rounded-xl" />
            <div class="flex flex-1 flex-col gap-2">
              <Skeleton class="h-3 w-44 max-w-full" />
              <Skeleton class="h-2.5 w-24" />
            </div>
            <Skeleton class="h-3 w-20" />
            <Skeleton class="h-5 w-16 rounded-full" />
          </div>
        </div>
      </article>

      <article class="flex min-h-72 flex-col rounded-2xl bg-card p-5 text-card-foreground lg:col-span-5">
        <div class="flex items-center justify-between">
          <Skeleton class="h-5 w-36" />
          <Skeleton class="h-8 w-24 rounded-lg" />
        </div>
        <div class="mt-5 flex flex-col gap-4">
          <div v-for="index in TABLE_ROW_COUNT" :key="index" class="flex items-center gap-3">
            <Skeleton class="size-11 shrink-0 rounded-xl" />
            <Skeleton class="h-3 flex-1" />
            <Skeleton class="h-3 w-12" />
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

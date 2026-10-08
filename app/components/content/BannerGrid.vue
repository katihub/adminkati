<script setup lang="ts">
import type { BanniereAdmin, ReordonnerBannieresInput } from "@/types/api/vitrine"
import { computed } from "vue"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { BANNIERE_EMPLACEMENTS } from "@/schemas/banniere"
import { bannerEmplacement } from "@/utils/banner-artwork"

const { banners, isPending, error, canWrite, selectedId, hasActiveFilters, isReordering } = defineProps<{
  banners: BanniereAdmin[]
  isPending: boolean
  error: unknown
  canWrite: boolean
  selectedId: number | null
  hasActiveFilters: boolean
  isReordering: boolean
}>()

const emit = defineEmits<{
  select: [id: number]
  retry: []
  clearFilters: []
  add: []
  reorder: [order: ReordonnerBannieresInput]
}>()

const SKELETON_COUNT = 4

const { t } = useI18n()

/**
 * One group per carousel, in the order of the home page's row, each keeping the order the
 * backend returned. Both groups show even when one is empty: an operator looking for the promo
 * carousel should find it, and read that it has nothing yet.
 */
const groups = computed(() =>
  BANNIERE_EMPLACEMENTS.map(emplacement => ({
    emplacement,
    banners: banners.filter(banner => bannerEmplacement(banner) === emplacement),
  })),
)
</script>

<template>
  <div class="p-6">
    <div
      v-if="isPending"
      data-testid="banner-grid-loading"
      class="grid grid-cols-1 h-[calc(100vh-250px)] gap-4 sm:grid-cols-2"
    >
      <Skeleton v-for="n in SKELETON_COUNT" :key="n" class="aspect-[21/9] w-full rounded-2xl" />
    </div>

    <div v-else-if="error" data-testid="banner-grid-error" class="h-[calc(100vh-250px)]">
      <ApiErrorCard :error="error" @retry="emit('retry')" />
    </div>

    <Empty
      v-else-if="banners.length === 0 && hasActiveFilters"
      data-testid="banner-grid-no-results"
      class="h-[calc(100vh-250px)]"
    >
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon name="ph:magnifying-glass" size="24" aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{{ t("content.banners.grid.noResults") }}</EmptyTitle>
      </EmptyHeader>
      <EmptyContent>
        <Button data-testid="banner-grid-clear-filters" variant="outline" size="sm" @click="emit('clearFilters')">
          {{ t("content.banners.grid.clearFilters") }}
        </Button>
      </EmptyContent>
    </Empty>

    <Empty v-else-if="banners.length === 0" data-testid="banner-grid-empty" class="h-[calc(100vh-250px)]">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon name="ph:flag-banner" size="24" aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{{ t("content.banners.grid.empty") }}</EmptyTitle>
      </EmptyHeader>
      <EmptyContent v-if="canWrite">
        <Button data-testid="banner-grid-add-button" size="sm" @click="emit('add')">
          {{ t("content.banners.addBanner") }}
        </Button>
      </EmptyContent>
    </Empty>

    <div v-else data-testid="banner-grid-content" class="space-y-10">
      <ContentBannerGroup
        v-for="group in groups"
        :key="group.emplacement"
        :emplacement="group.emplacement"
        :banners="group.banners"
        :can-write="canWrite"
        :selected-id="selectedId"
        :has-active-filters="hasActiveFilters"
        :is-reordering="isReordering"
        @select="emit('select', $event)"
        @reorder="emit('reorder', $event)"
      />
    </div>
  </div>
</template>

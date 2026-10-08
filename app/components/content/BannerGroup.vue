<script setup lang="ts">
import type { BanniereAdmin, EmplacementBanniere, ReordonnerBannieresInput } from "@/types/api/vitrine"
import { computed, useId } from "vue"

/**
 * One carousel of the home page's opening row, with its own order. The backend orders each
 * placement on its own and refuses a list that mixes them, so a banner is dragged within its
 * group only, and the group sends its placement with every id it holds.
 */
const { emplacement, banners, canWrite, selectedId, hasActiveFilters, isReordering } = defineProps<{
  emplacement: EmplacementBanniere
  banners: BanniereAdmin[]
  canWrite: boolean
  selectedId: number | null
  hasActiveFilters: boolean
  isReordering: boolean
}>()

const emit = defineEmits<{
  select: [id: number]
  reorder: [order: ReordonnerBannieresInput]
}>()

const { t } = useI18n()
const headingId = useId()

const emptyText = computed(() =>
  t(hasActiveFilters ? "content.banners.grid.groupNoResults" : "content.banners.grid.groupEmpty"),
)
</script>

<template>
  <section
    :data-testid="`banner-group-${emplacement}`"
    :data-emplacement="emplacement"
    :aria-labelledby="headingId"
    class="space-y-3"
  >
    <header class="space-y-1">
      <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div class="flex items-center gap-1.5">
          <h2 :id="headingId" data-testid="banner-group-title" class="text-base font-semibold text-foreground">
            {{ t(`content.banners.emplacement.${emplacement}`) }}
          </h2>
          <InfoTip data-testid="banner-group-info" :text="t(`content.banners.emplacement.${emplacement}Hint`)" />
        </div>
        <p data-testid="banner-group-count" class="text-sm text-muted-foreground">
          {{ t("content.banners.filterBar.resultCount", { count: banners.length }, banners.length) }}
        </p>
      </div>
    </header>

    <p
      v-if="banners.length === 0"
      data-testid="banner-group-empty"
      class="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground"
    >
      {{ emptyText }}
    </p>

    <ContentBannerDraggableGrid
      v-else-if="canWrite"
      :banners="banners"
      :selected-id="selectedId"
      :has-active-filters="hasActiveFilters"
      :is-reordering="isReordering"
      @select="emit('select', $event)"
      @reorder="ids => emit('reorder', { emplacement, ids })"
    />

    <ContentBannerStaticGrid
      v-else
      :banners="banners"
      :selected-id="selectedId"
      :can-write="false"
      @select="emit('select', $event)"
    />
  </section>
</template>

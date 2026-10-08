<script setup lang="ts">
import type { BanniereAdmin } from "@/types/api/vitrine"
import { ref, watch } from "vue"
import { VueDraggable } from "vue-draggable-plus"

const { banners, selectedId, hasActiveFilters, isReordering } = defineProps<{
  banners: BanniereAdmin[]
  selectedId: number | null
  hasActiveFilters: boolean
  isReordering: boolean
}>()

const emit = defineEmits<{
  select: [id: number]
  reorder: [ids: number[]]
}>()

const draggableBanners = ref<BanniereAdmin[]>([])

watch(
  () => banners,
  nextBanners => {
    draggableBanners.value = [...nextBanners]
  },
  { immediate: true },
)

function reorderBanners() {
  emit(
    "reorder",
    draggableBanners.value.map(banner => banner.id),
  )
}
</script>

<template>
  <ClientOnly>
    <VueDraggable
      v-model="draggableBanners"
      class="grid grid-cols-1 gap-4 sm:grid-cols-2"
      handle=".banner-drag-handle"
      :disabled="hasActiveFilters || isReordering"
      @end="reorderBanners"
    >
      <div
        v-for="banner in draggableBanners"
        :key="banner.id"
        :class="banner.id === selectedId ? 'rounded-2xl ring-2 ring-primary' : ''"
      >
        <ContentBannerCard :banner="banner" :can-write="!hasActiveFilters" @select="emit('select', $event)" />
      </div>
    </VueDraggable>

    <template #fallback>
      <ContentBannerStaticGrid
        :banners="banners"
        :selected-id="selectedId"
        :can-write="!hasActiveFilters"
        @select="emit('select', $event)"
      />
    </template>
  </ClientOnly>
</template>

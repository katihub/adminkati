<script setup lang="ts">
import type { BanniereAdmin } from "@/types/api/vitrine"

const { banners, selectedId, canWrite } = defineProps<{
  banners: BanniereAdmin[]
  selectedId: number | null
  canWrite: boolean
}>()

const emit = defineEmits<{
  select: [id: number]
}>()
</script>

<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <div
      v-for="banner in banners"
      :key="banner.id"
      :class="banner.id === selectedId ? 'rounded-2xl ring-2 ring-primary' : ''"
    >
      <ContentBannerCard :banner="banner" :can-write="canWrite" @select="emit('select', $event)" />
    </div>
  </div>
</template>

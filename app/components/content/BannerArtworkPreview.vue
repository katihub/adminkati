<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { Skeleton } from "@/components/ui/skeleton"

const props = defineProps<{
  src: string | null
  alt: string | undefined
  aspectClass: string
  testid: string
  /** Horizontal crop position, 0–100 (`BanniereAdmin.focus`) — defaults to a centered
   *  crop when the caller doesn't have one. */
  focus?: number
}>()

/** Resets on every source change so a stale "loaded" flag never survives
 *  switching to a different banner's artwork. */
const loaded = ref(false)
watch(
  () => props.src,
  () => {
    loaded.value = false
  },
)

const objectPosition = computed(() => `${props.focus ?? 50}% center`)
</script>

<template>
  <div :data-testid="testid" class="relative overflow-hidden rounded-2xl" :class="aspectClass">
    <Skeleton v-if="!loaded" class="absolute inset-0 rounded-2xl" />
    <!-- Fixed IPX modifiers, no `sizes` — `BannerCard.vue`'s grid thumbnail and this
         panel preview must request the exact same URL so the browser's HTTP cache
         serves the second one instead of downloading the artwork twice. A responsive
         `sizes` string would let the two instances pick different srcset candidates
         depending on their own rendered width, defeating that. GOTCHA: `width` only,
         never pair it with `height` — @nuxt/image's ipx provider collapses a width+height
         combo into a single forced `s_<w>x<h>` crop, done server-side with a fixed
         center gravity, before `object-position` below ever runs. -->
    <NuxtImg
      :src="src ?? undefined"
      :alt="alt"
      loading="lazy"
      format="webp"
      :quality="60"
      width="400"
      class="size-full object-cover transition-opacity duration-200"
      :class="loaded ? 'opacity-100' : 'opacity-0'"
      :style="{ objectPosition }"
      @load="loaded = true"
      @error="loaded = true"
    />
  </div>
</template>

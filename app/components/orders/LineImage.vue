<script setup lang="ts">
import { PhCube } from "@phosphor-icons/vue"
import { onMounted, ref, watch } from "vue"
import ProductsPicture from "@/components/products/Picture.vue"
import { Skeleton } from "@/components/ui/skeleton"

const props = defineProps<{
  src: string | null | undefined
  alt: string
}>()

const imageLoaded = ref(false)
const imageReady = ref(false)

watch(
  () => props.src,
  () => {
    imageLoaded.value = false
  },
)

onMounted(() => {
  imageReady.value = true
})
</script>

<template>
  <div
    class="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground"
  >
    <template v-if="imageReady && src">
      <Skeleton v-if="!imageLoaded" class="absolute inset-0" />
      <ProductsPicture
        :src="src"
        :alt="alt"
        width="36"
        height="36"
        loading="lazy"
        data-testid="orders-detail-line-image"
        class="size-full object-cover transition-opacity duration-200"
        :class="imageLoaded ? 'opacity-100' : 'opacity-0'"
        @load="imageLoaded = true"
        @error="imageLoaded = true"
      />
    </template>
    <PhCube v-else :size="18" aria-hidden="true" />
  </div>
</template>

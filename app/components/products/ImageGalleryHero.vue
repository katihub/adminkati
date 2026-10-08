<script setup lang="ts">
import type { ProductImage } from "@/types/api/produits"
import { toRefs } from "vue"
import { Skeleton } from "@/components/ui/skeleton"

const props = defineProps<{
  image: ProductImage | null
  url: string | null
  loaded: boolean
}>()
const emit = defineEmits<{ load: []; error: []; expand: [] }>()
const { image, url, loaded } = toRefs(props)

const { t } = useI18n()
</script>

<template>
  <div
    data-testid="products-image-gallery-hero"
    class="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl"
    :class="image ? 'bg-muted' : 'bg-card'"
  >
    <template v-if="image">
      <Skeleton v-if="!loaded" class="absolute inset-0 rounded-2xl" />
      <button
        type="button"
        data-testid="products-image-gallery-hero-expand"
        :aria-label="t('products.imageGallery.expand')"
        class="block size-full cursor-zoom-in"
        @click="emit('expand')"
      >
        <ProductsPicture
          :src="url ?? undefined"
          :alt="image.alt ?? ''"
          loading="lazy"
          class="size-full object-cover transition-opacity duration-200"
          :class="loaded ? 'opacity-100' : 'opacity-0'"
          @load="emit('load')"
          @error="emit('error')"
        />
      </button>
    </template>
    <Icon v-else name="ph:image" size="48" class="text-muted-foreground" aria-hidden="true" />
  </div>
</template>

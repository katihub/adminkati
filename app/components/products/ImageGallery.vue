<script setup lang="ts">
import type { ProductImage } from "@/types/api/produits"
import { computed, ref } from "vue"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useDeleteProduitImage } from "@/composables/useProduitMutations"
import { apiErrorText } from "@/utils/api-error"
import { productImageUrl } from "@/utils/product-image-url"

const {
  modelValue,
  productId,
  disabled = false,
} = defineProps<{
  modelValue: ProductImage[]
  /** `null` in add mode, before a product exists to upload against. */
  productId: number | null
  disabled?: boolean
}>()

const emit = defineEmits<{
  "update:modelValue": [images: ProductImage[]]
  /** Un fichier choisi avant que le produit n'existe : le formulaire le retient. */
  stageLocal: [file: File]
}>()

/** Mirrors `produitSchema.images`'s cap — the add-tile disables once it's reached. */
const IMAGE_CAP = 20

const { t } = useI18n()
const runtimeConfig = useRuntimeConfig()

function displayImageUrl(image: ProductImage): string {
  return productImageUrl(image.url, runtimeConfig.public.catalogueImageOrigin) ?? image.url
}

/** Keyed by resolved URL rather than index so a thumbnail already loaded stays loaded
 *  through reordering or removal elsewhere in the array. */
const loadedImageUrls = ref(new Set<string>())
function markImageLoaded(url: string) {
  loadedImageUrls.value.add(url)
}
function isImageLoaded(url: string) {
  return loadedImageUrls.value.has(url)
}

/**
 * Which thumbnail is previewed, tracked by URL rather than index — a `removeImage` or an
 * `applyProduct` reset in the parent replaces the whole array, and an index would then
 * point at the wrong image (or nothing). A stale URL just falls back to the first image.
 */
const selectedUrl = ref<string | null>(null)
const selectedIndex = computed(() => {
  const index = selectedUrl.value === null ? -1 : modelValue.findIndex(image => image.url === selectedUrl.value)
  return index === -1 ? 0 : index
})
const hero = computed(() => modelValue[selectedIndex.value] ?? null)
const heroUrl = computed(() => (hero.value ? displayImageUrl(hero.value) : null))
const heroLoaded = computed(() => heroUrl.value !== null && isImageLoaded(heroUrl.value))
function onHeroLoad() {
  if (heroUrl.value) markImageLoaded(heroUrl.value)
}

const fullscreenOpen = ref(false)
const removeError = ref("")
const removingIndex = ref<number | null>(null)

const deleteMutation = useDeleteProduitImage(() => productId ?? 0)

/**
 * A stored image's `rang` is the backend's real, zero-based position
 * (`administration.service.ts:490-544`) — the JSON `PATCH` replace path ignores whatever
 * `rang` the client sends, but the delete-by-`rang` call needs the real one, so only
 * local, never-persisted (`chemin_local === null`) entries get relabeled here.
 */
function renumber(images: ProductImage[]): ProductImage[] {
  let nextLocalRang = 1
  return images.map(image => {
    if (image.chemin_local !== null) return image
    const numbered = { ...image, rang: nextLocalRang }
    nextLocalRang += 1
    return numbered
  })
}

/** The backend response only knows about persisted images — an in-progress, unsaved local
 *  URL entry isn't in it, so it's kept ahead of the refreshed stored set. */
function mergeStoredImages(serverImages: ProductImage[]): ProductImage[] {
  return [...modelValue.filter(image => image.chemin_local === null), ...serverImages]
}

function selectImage(index: number) {
  selectedUrl.value = modelValue[index]?.url ?? null
}

function onAddUrl(image: ProductImage) {
  emit("update:modelValue", renumber([...modelValue, image]))
}

function onUploadSuccess(images: ProductImage[]) {
  emit("update:modelValue", mergeStoredImages(images))
}

async function removeImage(index: number) {
  const image = modelValue[index]
  if (!image) return

  if (productId && image.chemin_local !== null) {
    removeError.value = ""
    removingIndex.value = index
    try {
      const updated = await deleteMutation.mutateAsync(image.rang)
      emit("update:modelValue", mergeStoredImages(updated.images))
    } catch (error) {
      removeError.value = apiErrorText(error, t)
    } finally {
      removingIndex.value = null
    }
    return
  }

  emit("update:modelValue", renumber(modelValue.filter((_, i) => i !== index)))
}
</script>

<template>
  <div class="space-y-3">
    <ProductsImageGalleryHero
      :image="hero"
      :url="heroUrl"
      :loaded="heroLoaded"
      @load="onHeroLoad"
      @error="onHeroLoad"
      @expand="fullscreenOpen = true"
    />

    <Dialog v-model:open="fullscreenOpen">
      <DialogContent
        data-testid="products-image-gallery-fullscreen"
        class="max-w-[calc(100%-2rem)] rounded-2xl bg-transparent p-0 ring-0 sm:max-w-3xl"
      >
        <DialogTitle class="sr-only">
          {{ t("products.imageGallery.previewTitle") }}
        </DialogTitle>
        <ProductsPicture
          v-if="heroUrl"
          data-testid="products-image-gallery-fullscreen-image"
          :src="heroUrl"
          :alt="hero?.alt ?? ''"
          class="max-h-[85vh] w-full rounded-2xl object-contain"
        />
      </DialogContent>
    </Dialog>

    <div class="flex flex-wrap gap-2">
      <div
        v-for="(image, index) in modelValue"
        :key="`${image.url}-${index}`"
        data-testid="products-image-gallery-thumbnail"
        :data-active="index === selectedIndex"
        role="button"
        tabindex="0"
        :aria-label="t('products.imageGallery.select', { index: index + 1 })"
        class="relative size-20 shrink-0 cursor-pointer overflow-hidden rounded-xl border-2"
        :class="index === selectedIndex ? 'border-primary' : 'border-transparent'"
        @click="selectImage(index)"
        @keydown.enter.prevent="selectImage(index)"
        @keydown.space.prevent="selectImage(index)"
      >
        <Skeleton v-if="!isImageLoaded(displayImageUrl(image))" class="absolute inset-0 rounded-xl" />
        <ProductsPicture
          :src="displayImageUrl(image)"
          :alt="image.alt ?? ''"
          loading="lazy"
          class="size-full object-cover transition-opacity duration-200"
          :class="isImageLoaded(displayImageUrl(image)) ? 'opacity-100' : 'opacity-0'"
          @load="markImageLoaded(displayImageUrl(image))"
          @error="markImageLoaded(displayImageUrl(image))"
        />
        <button
          type="button"
          data-testid="products-image-gallery-thumbnail-remove"
          :disabled="disabled || removingIndex === index"
          :aria-label="t('products.imageGallery.remove')"
          class="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-background/90 text-foreground"
          @click.stop="removeImage(index)"
        >
          <Spinner v-if="removingIndex === index" size="xs" />
          <Icon v-else name="ph:x" size="12" aria-hidden="true" />
        </button>
      </div>

      <ProductsAddImageDialog
        :product-id="productId"
        :disabled="disabled"
        :trigger-disabled="modelValue.length >= IMAGE_CAP"
        @add-url="onAddUrl"
        @upload-success="onUploadSuccess"
        @stage-local="file => emit('stageLocal', file)"
      />
    </div>

    <p
      v-if="removeError"
      data-testid="products-image-gallery-remove-error"
      role="alert"
      class="text-sm text-destructive"
    >
      {{ removeError }}
    </p>
  </div>
</template>

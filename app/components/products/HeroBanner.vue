<script setup lang="ts">
import type { ProductDetail } from "@/types/api/produits"
import { computed, ref, watch } from "vue"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDateCourte } from "@/utils/dates"
import { productImageUrl } from "@/utils/product-image-url"
import { deriveProductStatus } from "@/utils/product-status"

const { product, isNewMode = false } = defineProps<{
  product: ProductDetail | null
  isNewMode?: boolean
}>()

const { locale, t } = useI18n()
const runtimeConfig = useRuntimeConfig()

const status = computed(() => {
  if (!product) return null
  return deriveProductStatus(product.statut_stock, product.retire_le)
})

const heroImage = computed(() => productImageUrl(product?.images?.[0]?.url, runtimeConfig.public.catalogueImageOrigin))

const heroImageLoaded = ref(false)
watch(heroImage, () => {
  heroImageLoaded.value = false
})

function extractProductDate(item: ProductDetail | null): string | null {
  if (!item) return null
  return item.ajoute_le ?? item.retire_le ?? null
}

const dateLabel = computed(() => {
  const date = extractProductDate(product)
  return date ? formatDateCourte(date, locale.value) : "—"
})
</script>

<template>
  <div class="space-y-4" data-testid="products-hero-banner">
    <!-- Center Top Title -->
    <h2 class="text-2xl font-bold tracking-tight text-foreground">
      <!-- fallow-ignore-next-line complexity -->
      {{ isNewMode ? t("products.page.newProductTitle") : product?.nom || t("products.page.heading") }}
    </h2>

    <!-- Banner Card with Exact Geometric Pattern & Floating Circular Avatar -->
    <div class="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-xs">
      <!-- KatiHub navy geometric pattern header -->
      <div class="relative h-28 w-full overflow-hidden bg-brand-navy sm:h-32">
        <svg class="h-full w-full opacity-60" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <defs>
            <pattern id="mint-polygon-pattern" width="60" height="40" patternUnits="userSpaceOnUse">
              <!-- 3D Isometric Tile Shapes from Mockup -->
              <path d="M 10 8 L 30 2 L 50 8 L 30 14 Z" fill="#b4debe" />
              <path d="M 10 8 L 30 14 L 30 26 L 10 20 Z" fill="#9ecfa9" />
              <path d="M 30 14 L 50 8 L 50 20 L 30 26 Z" fill="#88c295" />
              <!-- Alternating offset tile -->
              <path d="M 40 28 L 60 22 L 80 28 L 60 34 Z" fill="#b4debe" />
              <path d="M 40 28 L 60 34 L 60 46 L 40 40 Z" fill="#9ecfa9" />
              <path d="M 60 34 L 80 28 L 80 40 L 60 46 Z" fill="#88c295" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#mint-polygon-pattern)" />
        </svg>
      </div>

      <!-- Card Body with Floating Avatar & Metadata -->
      <div class="relative px-6 pb-6 pt-0">
        <!-- Floating Circular Avatar -->
        <div class="relative -mt-10 mb-3 flex items-end justify-between sm:-mt-12">
          <div
            class="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-card bg-muted/70 text-muted-foreground shadow-md sm:size-24"
          >
            <template v-if="heroImage">
              <Skeleton v-if="!heroImageLoaded" class="absolute inset-0 rounded-full" />
              <ProductsPicture
                :src="heroImage"
                :alt="product?.nom ?? ''"
                width="96"
                height="96"
                loading="lazy"
                class="size-full object-cover transition-opacity duration-200"
                :class="heroImageLoaded ? 'opacity-100' : 'opacity-0'"
                @load="heroImageLoaded = true"
                @error="heroImageLoaded = true"
              />
            </template>
            <template v-else>
              <Icon name="ph:plus-bold" size="32" aria-hidden="true" />
            </template>
          </div>
        </div>

        <!-- Identity & Metadata Rows -->
        <div class="space-y-2">
          <div class="flex flex-wrap items-center gap-2.5">
            <span class="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {{ isNewMode ? t("products.page.newProductTitle") : product?.nom || t("products.page.heading") }}
            </span>

            <!-- Role / Status Badge with icon -->
            <Badge
              v-if="!isNewMode && product"
              variant="outline"
              class="flex items-center gap-1.5 rounded-full border-border/80 bg-muted/40 px-3 py-1 text-xs font-medium text-foreground"
            >
              <Icon name="ph:shopping-bag" size="14" class="text-muted-foreground" aria-hidden="true" />
              <span>{{
                product.marque || product.categorie_nom || (status ? t(`products.listItem.status.${status}`) : "—")
              }}</span>
            </Badge>
          </div>

          <!-- Metadata Chips Row -->
          <div
            v-if="!isNewMode && product"
            class="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground"
          >
            <span class="flex items-center gap-1.5 font-mono">
              <Icon name="ph:device-mobile" size="15" class="text-muted-foreground/70" aria-hidden="true" />
              <span>#{{ product.id }}</span>
            </span>

            <span class="flex items-center gap-1.5">
              <Icon name="ph:globe" size="15" class="text-muted-foreground/70" aria-hidden="true" />
              <span>{{ product.rayon || product.categorie_nom || t("products.kpis.general") }}</span>
            </span>

            <span class="flex items-center gap-1.5">
              <Icon name="ph:calendar-blank" size="15" class="text-muted-foreground/70" aria-hidden="true" />
              <span>{{ dateLabel }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProductListItem } from "@/types/api/produits"
import { computed } from "vue"
import { Badge } from "@/components/ui/badge"
import { formatMontant } from "@/utils/money"
import { productImageUrl } from "@/utils/product-image-url"
import { deriveProductStatus } from "@/utils/product-status"

const { product } = defineProps<{ product: ProductListItem }>()
const { locale, t } = useI18n()
const runtimeConfig = useRuntimeConfig()
const imageUrl = computed(() => productImageUrl(product.image, runtimeConfig.public.catalogueImageOrigin))
const price = computed(() => formatMontant(product.prix, locale.value))
const status = computed(() => deriveProductStatus(product.statut_stock, product.retire_le))
</script>

<template>
  <NuxtLinkLocale :to="{ path: '/products', query: { id: String(product.id) } }" class="block h-full">
    <article
      data-testid="category-product-card"
      class="flex h-full flex-col overflow-hidden rounded-2xl bg-muted text-foreground"
    >
      <ProductsPicture
        v-if="imageUrl"
        :src="imageUrl"
        :alt="product.nom"
        width="320"
        height="180"
        loading="lazy"
        data-testid="category-product-image"
        class="aspect-video w-full object-cover"
      />
      <div v-else data-testid="category-product-image" class="aspect-video bg-foreground/5" aria-hidden="true" />
      <div class="flex flex-1 flex-col gap-3 p-4">
        <h3 class="line-clamp-2 font-medium" :title="product.nom">
          {{ product.nom }}
        </h3>
        <div class="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-background px-2.5 py-2">
          <p data-testid="category-product-price" class="text-sm whitespace-nowrap text-muted-foreground">
            {{ price.affiche }}
          </p>
          <Badge data-testid="category-product-stock" variant="secondary" class="ml-auto px-2">
            {{ t(`products.listItem.status.${status}`) }}
          </Badge>
        </div>
      </div>
    </article>
  </NuxtLinkLocale>
</template>

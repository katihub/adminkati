<script setup lang="ts">
import type { ProductListItem } from "@/types/api/produits"
import { computed, ref, watch } from "vue"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatMontant } from "@/utils/money"
import { productImageUrl } from "@/utils/product-image-url"
import { deriveProductStatus, PRODUCT_STATUS_TONE } from "@/utils/product-status"

const { product, selected = false } = defineProps<{
  product: ProductListItem
  selected?: boolean
}>()

const emit = defineEmits<{
  select: [id: number]
}>()

const { locale, t } = useI18n()
const runtimeConfig = useRuntimeConfig()

const status = computed(() => deriveProductStatus(product.statut_stock, product.retire_le))
const formattedPrice = computed(() => formatMontant(product.prix, locale.value))
const imageUrl = computed(() => productImageUrl(product.image, runtimeConfig.public.catalogueImageOrigin))

const imageLoaded = ref(false)
watch(imageUrl, () => {
  imageLoaded.value = false
})
</script>

<template>
  <button
    type="button"
    data-testid="products-list-item"
    :aria-pressed="selected ? 'true' : 'false'"
    class="group relative flex w-full items-center gap-3 py-3 px-4 text-left transition-all"
    :class="
      selected
        ? 'border-l-4 border-l-primary bg-muted border-t border-b'
        : 'hover:bg-muted/50 hover:border-l-4 hover:border-l-muted'
    "
    @click="emit('select', product.id)"
  >
    <!-- Left circular product visual -->
    <div
      data-testid="products-list-item-thumbnail"
      class="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted/70 text-muted-foreground shadow-2xs"
    >
      <template v-if="imageUrl">
        <Skeleton v-if="!imageLoaded" class="absolute inset-0 rounded-full" />
        <ProductsPicture
          :src="imageUrl"
          :alt="product.nom"
          width="40"
          height="40"
          loading="lazy"
          class="size-full object-cover transition-opacity duration-200"
          :class="imageLoaded ? 'opacity-100' : 'opacity-0'"
          @load="imageLoaded = true"
          @error="imageLoaded = true"
        />
      </template>
      <template v-else>
        <Icon name="ph:plus-bold" size="18" aria-hidden="true" />
      </template>
    </div>

    <!-- Product Title & Subtitle -->
    <div class="min-w-0 flex-1 space-y-0.5">
      <div class="flex items-center justify-between gap-1.5">
        <span data-testid="products-list-item-name" class="truncate font-medium text-sm text-foreground">
          {{ product.nom }}
        </span>
      </div>
      <p class="text-muted-foreground text-xs mb-2 font-medium" :title="formattedPrice.exact">
        {{ formattedPrice.affiche }}
      </p>
      <div class="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
        <Badge
          data-testid="products-list-item-status"
          :data-status="status"
          class="shrink-0 border-0! rounded-full px-2 py-0 text-[10px] font-medium"
          :class="PRODUCT_STATUS_TONE[status]"
        >
          {{ t(`products.listItem.status.${status}`) }}
        </Badge>

        <p
          v-if="product.categorie"
          data-testid="products-list-item-category"
          class="flex items-center line-clamp-1! capitalize gap-x-2 text-xs!"
        >
          <Icon name="ph:circles-three-plus-duotone" /> {{ product.categorie }}
        </p>
      </div>
    </div>
  </button>
</template>

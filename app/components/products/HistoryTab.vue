<script setup lang="ts">
import type { ProductDetail } from "@/types/api/produits"

const { product, canWrite } = defineProps<{
  product: ProductDetail | null
  canWrite: boolean
}>()
</script>

<template>
  <div class="grid grid-cols-1 items-start gap-6" :class="{ 'lg:grid-cols-2': product && canWrite }">
    <ProductsHistoryPanel :historique="product?.historique ?? []" />
    <!-- `lg:top-24` clears the sticky DetailHeader (~69px) so the cost card parks just under it. -->
    <ProductsCostHistoryPanel v-if="product && canWrite" :product-id="product.id" class="lg:sticky lg:top-24" />
  </div>
</template>

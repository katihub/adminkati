<script setup lang="ts">
import type { AdminMarketplaceProduct, MarketplaceProductCorrection } from "@/types/api/catalogue-products"
import type { MarketplaceCategory } from "@/types/api/marketplace-categories"
import { Skeleton } from "@/components/ui/skeleton"
defineProps<{
  product: AdminMarketplaceProduct | null
  categories: MarketplaceCategory[]
  loading: boolean
  error: unknown
  saveError: unknown
  saving: boolean
}>()
const emit = defineEmits<{
  retry: []
  save: [body: MarketplaceProductCorrection & { slug?: string }]
  dirty: [value: boolean]
  cancel: []
}>()
</script>
<template>
  <ApiErrorCard v-if="error" :error="error" @retry="emit('retry')" />
  <Skeleton v-else-if="loading" class="h-96 rounded-2xl" />
  <CatalogueProductForm
    v-else
    :product="product"
    :categories="categories"
    :saving="saving"
    :error="saveError"
    @dirty="emit('dirty', $event)"
    @save="emit('save', $event)"
    @cancel="emit('cancel')"
  />
</template>

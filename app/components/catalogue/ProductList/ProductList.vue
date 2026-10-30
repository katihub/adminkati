<script setup lang="ts">
import type { AdminMarketplaceProductSummary, CataloguePagination } from "@/types/api/catalogue-products"
import { Skeleton } from "@/components/ui/skeleton"
const { products, loading, error, pagination } = defineProps<{
  products: AdminMarketplaceProductSummary[]
  loading: boolean
  error: unknown
  pagination?: CataloguePagination
}>()
const emit = defineEmits<{ select: [id: string]; page: [page: number]; retry: [] }>()
const { t } = useI18n()
</script>
<template>
  <section class="flex min-w-0 flex-col gap-3" data-testid="marketplace-products-list">
    <ApiErrorCard v-if="error" :error="error" @retry="emit('retry')" />
    <div v-else-if="loading" class="flex flex-col gap-3">
      <Skeleton v-for="n in 5" :key="n" class="h-24 rounded-xl" />
    </div>
    <EmptyStateCard v-else-if="!products.length" icon="ph:package" :text="t('catalogue.empty')" />
    <ul v-else class="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      <li v-for="product in products" :key="product.id">
        <CatalogueProductRow :product="product" @select="emit('select', $event)" />
      </li>
    </ul>
    <CatalogueProductPager
      v-if="pagination && pagination.pages > 1"
      :pagination="pagination"
      :loading="loading"
      @page="emit('page', $event)"
    />
  </section>
</template>

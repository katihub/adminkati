<script setup lang="ts">
import type { ProductListItem } from "@/types/api/produits"
import { computed } from "vue"
import CategoryProductCard from "@/components/taxonomy/CategoryProductCard.vue"
import CategoryProductCardSkeleton from "@/components/taxonomy/CategoryProductCardSkeleton.vue"
import { stateBlockClass } from "@/utils/state-block"

const { products, total, hasNextPage, kind } = defineProps<{
  products: ProductListItem[]
  total: number | null
  isPending: boolean
  error: unknown
  hasNextPage: boolean
  isFetchingNextPage: boolean
  emptyTitle: string
  emptyHint: string
  /** Prefix of the `data-testid`s: `category`, `department` or `brand`. */
  kind: "category" | "department" | "brand"
}>()

const emit = defineEmits<{
  loadMore: []
  retry: []
}>()

const { t } = useI18n()

const countLabel = computed(() => {
  if (total === null) return ""
  return hasNextPage
    ? t("taxonomy.productsTab.countOf", { loaded: products.length, total })
    : t("taxonomy.productsTab.count", { count: total }, total)
})
</script>

<template>
  <section :data-testid="`${kind}-panel-products`">
    <TaxonomyProductsTabLoading v-if="isPending && products.length === 0" :data-testid="`${kind}-products-loading`" />
    <ApiErrorCard
      v-else-if="error && products.length === 0"
      :error="error"
      :class="stateBlockClass"
      @retry="emit('retry')"
    />
    <TaxonomyProductsTabEmpty
      v-else-if="products.length === 0"
      :title="emptyTitle"
      :hint="emptyHint"
      :add-test-id="`${kind}-products-add`"
      :data-testid="`${kind}-products-empty`"
    />
    <template v-else>
      <p v-if="countLabel" :data-testid="`${kind}-products-count`" class="mb-3 text-sm text-muted-foreground">
        {{ countLabel }}
      </p>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <CategoryProductCard v-for="product in products" :key="product.id" :product="product" />
      </div>
      <InfiniteListFooter
        :has-next-page="hasNextPage"
        :is-fetching-next-page="isFetchingNextPage"
        :error="error"
        :loading-label="t('taxonomy.productsTab.loadingMore')"
        :failed-label="t('taxonomy.productsTab.loadFailed')"
        :sentinel-test-id="`${kind}-products-sentinel`"
        :failed-test-id="`${kind}-products-load-failed`"
        @load-more="emit('loadMore')"
      >
        <template #loading>
          <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CategoryProductCardSkeleton v-for="index in 2" :key="index" />
          </div>
        </template>
      </InfiniteListFooter>
    </template>
  </section>
</template>

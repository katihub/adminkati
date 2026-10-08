<script setup lang="ts">
import { computed } from "vue"
import TaxonomyFlatTableState from "@/components/taxonomy/TaxonomyFlatTableState.vue"
import { useProductInventory } from "@/composables/useProductInventory"

const { productId } = defineProps<{ productId: number }>()

const { t } = useI18n()

const query = useProductInventory(() => productId)
const firstPage = computed(() => query.data.value?.pages[0])
/** A movement written between two page loads shifts the pages, so the same row can arrive twice. */
const movements = computed(() => {
  const seen = new Set<string>()
  return (query.data.value?.pages ?? [])
    .flatMap(page => page.mouvements)
    .filter(movement => {
      if (seen.has(movement.id)) return false
      seen.add(movement.id)
      return true
    })
})
</script>

<template>
  <section data-testid="product-inventory-panel">
    <TaxonomyFlatTableState
      :loading="!firstPage && !query.isError.value"
      :error="firstPage ? undefined : query.error.value"
      :empty="!!firstPage && movements.length === 0"
      :empty-title="t('products.inventory.empty')"
      empty-icon="ph:clock-counter-clockwise"
      @retry="query.refetch()"
    >
      <ProductsInventoryHistory
        v-if="firstPage"
        :movements="movements"
        :total="firstPage.total"
        :has-more="query.hasNextPage.value"
        :is-loading-more="query.isFetchingNextPage.value"
        :load-more-failed="query.isFetchNextPageError.value"
        @load-more="query.fetchNextPage()"
      />
    </TaxonomyFlatTableState>
  </section>
</template>

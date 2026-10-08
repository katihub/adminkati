<script setup lang="ts">
import type { ProductListItem } from "@/types/api/produits"
import { computed } from "vue"
import { useProduits } from "@/composables/useProduits"

const props = defineProps<{ categoryId: number }>()
const { t } = useI18n()
const filters = computed(() => ({ categorie: props.categoryId, etat: "tous" as const, taille: 24 }))
const query = useProduits(filters)
const products = computed<ProductListItem[]>(() => query.data.value?.pages.flatMap(page => page.produits) ?? [])

function loadMore() {
  query.fetchNextPage()
}
</script>

<template>
  <TaxonomyProductsTabContent
    :products="products"
    :total="query.data.value?.pages[0]?.total ?? null"
    :is-pending="query.isPending.value"
    :error="query.error.value"
    :has-next-page="query.hasNextPage.value"
    :is-fetching-next-page="query.isFetchingNextPage.value"
    :empty-title="t('taxonomy.products.empty')"
    :empty-hint="t('taxonomy.products.emptyHint')"
    kind="category"
    @load-more="loadMore"
    @retry="() => query.refetch()"
  />
</template>

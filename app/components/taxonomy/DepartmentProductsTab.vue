<script setup lang="ts">
import type { ProductListItem } from "@/types/api/produits"
import { computed } from "vue"
import { useProduits } from "@/composables/useProduits"

const props = defineProps<{ departmentId: string }>()
const { t } = useI18n()
const filters = computed(() => ({ rayon: props.departmentId, etat: "tous" as const, taille: 24 }))
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
    :empty-title="t('taxonomy.departments.productsEmpty')"
    :empty-hint="t('taxonomy.departments.productsEmptyHint')"
    kind="department"
    @load-more="loadMore"
    @retry="() => query.refetch()"
  />
</template>

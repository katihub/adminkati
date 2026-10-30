<script setup lang="ts">
import type { Filter } from "@/components/vuzeno/filters"
import type { ProductDetail, ProductListResponse, Taxonomie } from "@/types/api/produits"
import { PhDownloadSimple, PhPlus, PhUploadSimple } from "@phosphor-icons/vue"
import { computed } from "vue"
import { toast } from "vue-sonner"
import { Button } from "@/components/ui/button"
import { prefetchApi } from "@/composables/useApi"
import { useProduit } from "@/composables/useProduit"
import { prefetchProduits, useProduits } from "@/composables/useProduits"
import { useProductListStore } from "@/stores/product-list"
import { apiQueryKeys } from "@/utils/api-query-keys"

definePageMeta({ layout: "admin", roles: ["direction", "comptoir"] })

defineI18nRoute({
  paths: {
    en: "/legacy-products",
    fr: "/catalogue-historique",
  },
})

const { t } = useI18n()
const route = useRoute()
const session = useCachedSession()
/** The backend restricts product creation to `direction`; `comptoir` can only read. */
const canCreate = computed(() => session.value?.roles.includes("direction") ?? false)

const productList = useProductListStore()
const filters = computed({
  get: () => productList.filters,
  set: value => productList.replaceFilters(value),
})

/**
 * A derived view onto `filters`, not its own source of truth — `filters` is also written by
 * `ProductsListQuickFilters`' pill row inside `ProductsListPanel`, so an independently-owned
 * `ref<Filter[]>` here would drift out of sync with the pills. Reading straight off `filters`
 * on every `get()` keeps both controls showing the same state; writing back through the store's
 * individual setters preserves the status state owned by the list quick filters.
 */
const toolbarFilters = computed<Filter[]>({
  get: () => {
    const next: Filter[] = [
      { field: "q", operator: "contains", value: filters.value.q ?? null },
      {
        field: "categorie",
        operator: "eq",
        value: filters.value.categorie != null ? String(filters.value.categorie) : null,
      },
      { field: "tri", operator: "eq", value: filters.value.tri ?? "recent" },
    ]

    if (filters.value.rayon) next.splice(1, 0, { field: "rayon", operator: "eq", value: filters.value.rayon })
    if (filters.value.marque) next.splice(-1, 0, { field: "marque", operator: "eq", value: filters.value.marque })

    return next
  },
  set: next => {
    const chip = (field: string) => next.find(candidate => candidate.field === field)?.value
    const searchValue = chip("q")
    const rayonValue = chip("rayon")
    const categorieValue = chip("categorie")
    const marqueValue = chip("marque")
    const triValue = chip("tri")

    productList.setSearchTerm(typeof searchValue === "string" ? searchValue : "")
    productList.setRayon(typeof rayonValue === "string" ? rayonValue : "")
    productList.setCategory(typeof categorieValue === "string" ? Number(categorieValue) : undefined)
    productList.setBrand(typeof marqueValue === "string" ? marqueValue : "")
    productList.setSort(
      triValue === "nom" || triValue === "prix-croissant" || triValue === "prix-decroissant" ? triValue : "recent",
    )
  },
})

const hasActiveToolbarFilters = computed(
  () =>
    Boolean(filters.value.q) ||
    Boolean(filters.value.rayon) ||
    filters.value.categorie !== undefined ||
    Boolean(filters.value.marque) ||
    (filters.value.tri !== undefined && filters.value.tri !== "recent"),
)

function clearToolbarFilters() {
  productList.setSearchTerm("")
  productList.setRayon("")
  productList.setCategory(undefined)
  productList.setBrand("")
  productList.setSort("recent")
}

function parseId(raw: string | (string | null)[] | null | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (typeof value !== "string") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const explicitId = computed(() => parseId(route.query.id))
const isNewMode = computed(() => explicitId.value === null && route.query.new !== undefined)

const queryClient = useNuxtApp().$queryClient
const listFilters = computed(() => filters.value)

if (import.meta.server) {
  await Promise.allSettled([
    prefetchProduits(queryClient, listFilters.value),
    prefetchApi<Taxonomie>(queryClient, apiQueryKeys.taxonomy.all, "/catalogue/administration/taxonomie"),
  ])

  if (!isNewMode.value) {
    const listData = queryClient.getQueryData<{ pages: ProductListResponse[] }>(
      apiQueryKeys.products.list(listFilters.value),
    )
    const detailId = explicitId.value ?? listData?.pages[0]?.produits[0]?.id

    if (detailId !== undefined && detailId !== null) {
      await prefetchApi<ProductDetail>(
        queryClient,
        apiQueryKeys.products.detail(detailId),
        `/catalogue/administration/produits/${detailId}`,
      ).catch(() => undefined)
    }
  }
}

const { data: listData, error: listError, refetch: refetchProducts } = useProduits(listFilters)
const autoSelectedId = computed(() => listData.value?.pages[0]?.produits[0]?.id ?? null)

const effectiveId = computed(() => {
  if (explicitId.value !== null) return explicitId.value
  if (isNewMode.value) return null
  return autoSelectedId.value
})

const {
  data: selectedProduct,
  isPending: isProductPending,
  error: productError,
  refetch: refetchProduct,
} = useProduit(computed(() => effectiveId.value))

/** The header title is a section label, not a breadcrumb — it must never switch to the
 *  selected product's name. `ProductsHeroBanner` already shows the product's own name. */
const pageTitle = computed(() => (isNewMode.value ? t("products.page.newProductTitle") : t("products.page.heading")))

function selectProduct(id: number) {
  void navigateTo({ path: route.path, query: { id: String(id) } })
}

function addProduct() {
  void navigateTo({ path: route.path, query: { new: "1" } })
}

function onProductSaved(saved: ProductDetail) {
  toast.success(
    t(isNewMode.value ? "products.toast.saveSuccessAdd" : "products.toast.saveSuccessEdit", { name: saved.nom }),
  )
  if (isNewMode.value) selectProduct(saved.id)
}

function onFormCancel() {
  if (isNewMode.value) void navigateTo({ path: route.path })
}

useSeoMeta({
  title: () => t("products.page.seo.title"),
  description: () => t("products.page.seo.description"),
  ogTitle: () => t("products.page.seo.title"),
  ogDescription: () => t("products.page.seo.description"),
  ogType: "website",
})

useHead({
  titleTemplate: "%s",
})
</script>

<template>
  <div class="flex min-h-[calc(100dvh-4rem)] flex-col gap-4 py-4 lg:h-workspace lg:min-h-0 lg:overflow-hidden">
    <div class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted p-3 text-sm">
      <p>{{ t("catalogue.legacyHelp") }}</p>
      <NuxtLinkLocale to="/products" class="font-medium text-primary hover:underline">{{
        t("catalogue.title")
      }}</NuxtLinkLocale>
    </div>
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap items-center justify-between gap-3" data-testid="products-title-actions-row">
        <AdminPageHeader :title="pageTitle" class="min-w-0 flex-1">
          {{ t("products.page.subtitle") }}
        </AdminPageHeader>
        <div v-if="canCreate" class="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:flex-nowrap">
          <ProductsProductImportDialog>
            <template #trigger>
              <Button variant="outline" data-testid="products-product-import-button">
                <PhUploadSimple data-icon="inline-start" aria-hidden="true" />
                {{ t("products.productImport.button") }}
              </Button>
            </template>
          </ProductsProductImportDialog>
          <ProductsStockExportDialog :filters="filters" :total="listData?.pages[0]?.total ?? null">
            <template #trigger>
              <Button variant="outline" data-testid="products-export-button">
                <PhDownloadSimple data-icon="inline-start" aria-hidden="true" />
                {{ t("products.stockExport.button") }}
              </Button>
            </template>
          </ProductsStockExportDialog>
          <ProductsStockImportDialog>
            <template #trigger>
              <Button variant="outline" data-testid="products-import-button">
                <PhUploadSimple data-icon="inline-start" aria-hidden="true" />
                {{ t("products.stockImport.button") }}
              </Button>
            </template>
          </ProductsStockImportDialog>
          <Button
            class="shrink-0 bg-primary text-primary-foreground hover:bg-primary"
            data-testid="products-add-button"
            :disabled="isNewMode"
            @click="addProduct"
          >
            <PhPlus :size="16" aria-hidden="true" />
            {{ t("products.page.newProduct") }}
          </Button>
        </div>
      </div>
      <div data-testid="products-filter-row">
        <ProductsFilterBar
          v-model:filters="toolbarFilters"
          class="min-w-0 w-full"
          :has-active-filters="hasActiveToolbarFilters"
          @clear="clearToolbarFilters"
        />
      </div>
    </div>

    <div
      class="grid min-h-0 w-full flex-1 grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card shadow-xs lg:grid-cols-[320px_1fr]"
    >
      <!--  Products List Rail -->
      <div
        class="h-[26rem] overflow-hidden border-b border-border bg-card lg:h-full lg:border-r lg:border-b-0"
        data-testid="products-workspace-sidebar"
      >
        <ProductsListPanel
          :filters="filters"
          :selected-id="effectiveId"
          @select="selectProduct"
          @update:filters="filters = $event"
        />
      </div>

      <!-- Center Workspace  -->
      <div class="min-h-[38rem] overflow-y-auto bg-muted/35 lg:h-full lg:min-h-0" data-testid="products-detail-panel">
        <div
          v-if="listError && !isNewMode && effectiveId === null"
          class="flex h-full items-center justify-center p-6 text-center"
        >
          <ApiErrorCard :error="listError" @retry="() => void refetchProducts()" />
        </div>

        <div v-else-if="productError" class="flex h-full items-center justify-center p-6 text-center">
          <ApiErrorCard :error="productError" @retry="() => void refetchProduct()" />
        </div>

        <div
          v-else-if="!isNewMode && effectiveId === null"
          data-testid="products-detail-empty"
          class="flex h-full items-center justify-center p-6"
        >
          <EmptyStateCard icon="ph:cursor-click" :text="t('products.page.empty')" />
        </div>

        <div v-else-if="!isNewMode && isProductPending" class="flex h-full items-center justify-center p-6 text-center">
          <p data-testid="products-detail-loading" class="text-sm text-muted-foreground">
            {{ t("products.page.loading") }}
          </p>
        </div>

        <div v-else>
          <ProductsDetailForm
            :product="isNewMode ? null : (selectedProduct ?? null)"
            @cancel="onFormCancel"
            @saved="onProductSaved"
          />
        </div>
      </div>
    </div>
  </div>
</template>

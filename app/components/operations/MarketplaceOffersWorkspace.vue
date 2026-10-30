<script setup lang="ts">
// fallow-ignore-file complexity -- one declarative screen: the filters, the table and its pages
import type {
  MarketplaceAdminOffer,
  MarketplaceOfferSort,
  MarketplaceOfferStatus,
  MarketplaceOfferStockLevel,
} from "@/types/api/marketplace-catalogue-admin"
import { refDebounced } from "@vueuse/core"
import { computed, ref, watch } from "vue"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useMarketplaceAdminOffers } from "@/composables/useMarketplaceCatalogueAdmin"
import { useMarketplaceCategories } from "@/composables/useMarketplaceCategories"
import { formatDayMonthYear } from "@/utils/dates"
import { formatMontant } from "@/utils/money"
import { routeQueryId, routeQueryString, routeQueryUuid } from "@/utils/route-query"
import { storefrontMarketplaceProductUrl } from "@/utils/storefront"

/* EVERY OFFER OF EVERY SHOP, FOR THE DIRECTION. The storefront shows what is
   published and buyable, moderation what awaits a decision, a seller only their
   own shop. This screen shows all of it, whatever the status, to steer the
   platform shop by shop. Read-only: decisions stay in their moderation screens. */
const { t, locale } = useI18n()
const { storefrontUrl } = useRuntimeConfig().public

const STATUSES: MarketplaceOfferStatus[] = ["publiee", "brouillon", "suspendue", "archivee"]
const SORTS: MarketplaceOfferSort[] = ["recent", "boutique", "nom", "prix_asc", "prix_desc", "stock_asc", "stock_desc"]
const STOCK_LEVELS: MarketplaceOfferStockLevel[] = ["rupture", "faible", "disponible"]
const PAGE_SIZE = 50

const route = useRouter().currentRoute
const search = ref(routeQueryString(route.value.query.q) ?? "")
const productId = computed(() => routeQueryUuid(route.value.query.produit))
const selectedOfferId = computed(() => routeQueryUuid(route.value.query.offre))
function openOffer(id: string) {
  changeQuery({ offre: id })
}
function closeOffer() {
  changeQuery({ offre: undefined })
}
let navigation: Promise<unknown> = Promise.resolve()
function changeQuery(changes: Record<string, string | undefined>) {
  const apply = async () => {
    await navigateTo({ path: route.value.path, query: { ...route.value.query, ...changes } })
  }
  navigation = navigation.then(apply, apply)
}
function choice<T extends string>(key: string, values: readonly T[], fallback: T) {
  return computed({
    get: () => {
      const value = routeQueryString(route.value.query[key]) as T
      return values.includes(value) ? value : fallback
    },
    set: (value: T) => changeQuery({ [key]: value || undefined, page: undefined }),
  })
}
const shopId = computed({
  get: () => routeQueryUuid(route.value.query.boutique) ?? "",
  set: value => changeQuery({ boutique: value || undefined, page: undefined }),
})
const status = choice<MarketplaceOfferStatus | "">("statut", ["", ...STATUSES], "")
const categoryId = computed({
  get: () => routeQueryUuid(route.value.query.categorie) ?? "",
  set: value => changeQuery({ categorie: value || undefined, page: undefined }),
})
const stockLevel = choice<MarketplaceOfferStockLevel | "">("stock", ["", ...STOCK_LEVELS], "")
const sort = choice<MarketplaceOfferSort>("tri", SORTS, "recent")
const page = computed({
  get: () => Math.min(10000, routeQueryId(route.value.query.page) ?? 1),
  set: value => changeQuery({ page: value === 1 ? undefined : String(value) }),
})
const debouncedSearch = refDebounced(search, 300)
watch(
  () => route.value.query.q,
  value => {
    search.value = routeQueryString(value) ?? ""
  },
)
watch(debouncedSearch, value => changeQuery({ q: value.trim() || undefined, page: undefined }))

const filters = computed(() => ({
  ...(routeQueryString(route.value.query.q) ? { recherche: routeQueryString(route.value.query.q) } : {}),
  ...(shopId.value ? { boutiqueId: shopId.value } : {}),
  ...(productId.value ? { produitId: productId.value } : {}),
  ...(status.value ? { statut: status.value } : {}),
  ...(categoryId.value ? { categorieId: categoryId.value } : {}),
  ...(stockLevel.value ? { stock: stockLevel.value } : {}),
  ...(sort.value !== "recent" ? { tri: sort.value } : {}),
  page: page.value,
  taille: PAGE_SIZE,
}))

const query = useMarketplaceAdminOffers(filters)
const categoriesQuery = useMarketplaceCategories()
const offers = computed(() => query.data.value?.elements ?? [])
const pagination = computed(() => query.data.value?.pagination)
const shops = computed(() => query.data.value?.boutiques ?? [])
const counters = computed(() => query.data.value?.compteurs ?? {})
const categoryOptions = computed(() =>
  (categoriesQuery.data.value ?? []).flatMap(root => [
    { id: root.id, label: root.nom },
    ...root.sousCategories.map(child => ({ id: child.id, label: `— ${child.nom}` })),
  ]),
)
const hasFilters = computed(
  () =>
    Boolean(search.value || shopId.value || status.value || categoryId.value || stockLevel.value) ||
    sort.value !== "recent",
)

const count = computed(() => new Intl.NumberFormat(locale.value))

function title(offer: MarketplaceAdminOffer) {
  const name = offer.titre ?? offer.produit.nom
  return offer.libelleVariante ? `${name} — ${offer.libelleVariante}` : name
}

function statusVariant(value: MarketplaceOfferStatus) {
  if (value === "publiee") return "success"
  if (value === "suspendue") return "destructive"
  if (value === "brouillon") return "warning"
  return "secondary"
}

function stockLabel(offer: MarketplaceAdminOffer) {
  if (offer.stock.disponible === null) return t("operations.marketplaceOffers.stockNotTracked")
  return count.value.format(offer.stock.disponible)
}

function stockClass(offer: MarketplaceAdminOffer) {
  const available = offer.stock.disponible
  if (available === null) return "text-muted-foreground"
  if (available === 0) return "font-semibold text-destructive"
  if (available <= 5) return "font-semibold text-warning"
  return ""
}

function productUrl(offer: MarketplaceAdminOffer) {
  return offer.statut === "publiee" ? storefrontMarketplaceProductUrl(storefrontUrl, offer.produit.slug) : null
}

function clearFilters() {
  search.value = ""
  const apply = async () => {
    await navigateTo({ path: route.value.path, query: { tab: "marketplace-offers" } })
  }
  navigation = navigation.then(apply, apply)
}

function goTo(next: number) {
  page.value = next
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col" data-testid="marketplace-offers-workspace">
    <div class="flex shrink-0 flex-col gap-3 border-t border-border bg-background px-4 py-3 sm:px-6 lg:px-10">
      <p class="text-sm text-muted-foreground">{{ t("catalogue.offersHelp") }}</p>
      <NuxtLinkLocale
        v-if="productId"
        :to="{ path: '/products', query: { id: productId } }"
        class="text-sm font-medium text-primary"
        >{{ t("catalogue.product") }}</NuxtLinkLocale
      >
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label class="relative min-w-0 flex-1 sm:max-w-md">
          <Icon
            name="ph:magnifying-glass"
            class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            v-model="search"
            class="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
            :placeholder="t('operations.marketplaceOffers.search')"
            :aria-label="t('operations.marketplaceOffers.search')"
            data-testid="marketplace-offers-search"
          />
        </label>
        <Button
          v-if="hasFilters"
          size="sm"
          variant="ghost"
          data-testid="marketplace-offers-clear"
          @click="clearFilters"
        >
          <Icon name="ph:x" /> {{ t("operations.marketplaceOffers.clear") }}
        </Button>
      </div>
      <div class="grid grid-cols-2 gap-2 lg:grid-cols-5">
        <NativeSelect
          class="w-full"
          v-model="shopId"
          :aria-label="t('operations.marketplaceOffers.shop')"
          data-testid="marketplace-offers-shop"
        >
          <NativeSelectOption value="">{{ t("operations.marketplaceOffers.allShops") }}</NativeSelectOption>
          <NativeSelectOption v-for="shop in shops" :key="shop.id" :value="shop.id"
            >{{ shop.nom }} ({{ count.format(shop.offres) }})</NativeSelectOption
          >
        </NativeSelect>
        <NativeSelect
          class="w-full"
          v-model="status"
          :aria-label="t('operations.marketplaceOffers.status')"
          data-testid="marketplace-offers-status"
        >
          <NativeSelectOption value="">{{ t("operations.marketplaceOffers.allStatuses") }}</NativeSelectOption>
          <NativeSelectOption v-for="value in STATUSES" :key="value" :value="value">{{
            t(`operations.marketplaceOffers.statuses.${value}`)
          }}</NativeSelectOption>
        </NativeSelect>
        <NativeSelect
          class="w-full"
          v-model="categoryId"
          :aria-label="t('operations.marketplaceOffers.category')"
          data-testid="marketplace-offers-category"
        >
          <NativeSelectOption value="">{{ t("operations.marketplaceOffers.allCategories") }}</NativeSelectOption>
          <NativeSelectOption v-for="option in categoryOptions" :key="option.id" :value="option.id">{{
            option.label
          }}</NativeSelectOption>
        </NativeSelect>
        <NativeSelect
          class="w-full"
          v-model="stockLevel"
          :aria-label="t('operations.marketplaceOffers.stock')"
          data-testid="marketplace-offers-stock"
        >
          <NativeSelectOption value="">{{ t("operations.marketplaceOffers.allStock") }}</NativeSelectOption>
          <NativeSelectOption v-for="value in STOCK_LEVELS" :key="value" :value="value">{{
            t(`operations.marketplaceOffers.stockLevels.${value}`)
          }}</NativeSelectOption>
        </NativeSelect>
        <NativeSelect
          class="w-full"
          v-model="sort"
          :aria-label="t('operations.marketplaceOffers.sort')"
          data-testid="marketplace-offers-sort"
        >
          <NativeSelectOption v-for="value in SORTS" :key="value" :value="value">{{
            t(`operations.marketplaceOffers.sorts.${value}`)
          }}</NativeSelectOption>
        </NativeSelect>
      </div>
      <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
        <span data-testid="marketplace-offers-total">{{
          t("operations.marketplaceOffers.resultCount", { count: pagination?.total ?? 0 })
        }}</span>
        <span aria-hidden="true">·</span>
        <button
          v-for="value in STATUSES"
          :key="value"
          type="button"
          class="rounded-full border border-border px-2 py-0.5 hover:bg-muted"
          :class="status === value ? 'border-primary text-primary' : ''"
          :data-testid="`marketplace-offers-counter-${value}`"
          @click="status = status === value ? '' : value"
        >
          {{ t(`operations.marketplaceOffers.statuses.${value}`) }} · {{ count.format(counters[value] ?? 0) }}
        </button>
      </div>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto border-t border-border bg-muted/60 p-4 sm:p-6 lg:px-10">
      <div v-if="selectedOfferId" class="mb-5">
        <ClientOnly
          ><CatalogueOfferPanel :key="selectedOfferId" :id="selectedOfferId" @close="closeOffer"
        /></ClientOnly>
      </div>
      <div v-if="query.isPending.value" class="space-y-2">
        <div v-for="n in 6" :key="n" class="h-14 animate-pulse rounded-lg bg-muted" />
      </div>
      <ApiErrorCard v-else-if="query.error.value" :error="query.error.value" @retry="query.refetch()" />
      <EmptyStateCard v-else-if="!offers.length" icon="ph:package" :text="t('operations.marketplaceOffers.empty')" />
      <template v-else>
        <div
          class="overflow-x-auto rounded-lg border border-border bg-card"
          :class="query.isPlaceholderData.value ? 'opacity-60' : ''"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{{ t("operations.marketplaceOffers.columns.product") }}</TableHead>
                <TableHead>{{ t("operations.marketplaceOffers.columns.shop") }}</TableHead>
                <TableHead>{{ t("operations.marketplaceOffers.columns.status") }}</TableHead>
                <TableHead class="text-right">{{ t("operations.marketplaceOffers.columns.price") }}</TableHead>
                <TableHead class="text-right">{{ t("operations.marketplaceOffers.columns.stock") }}</TableHead>
                <TableHead>{{ t("operations.marketplaceOffers.columns.published") }}</TableHead>
                <TableHead class="w-10"
                  ><span class="sr-only">{{ t("operations.marketplaceOffers.open") }}</span></TableHead
                >
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="offer in offers" :key="offer.id" :data-testid="`marketplace-offer-${offer.id}`">
                <TableCell class="min-w-72">
                  <div class="flex items-center gap-3">
                    <img
                      v-if="offer.produit.image"
                      :src="offer.produit.image"
                      alt=""
                      loading="lazy"
                      class="size-10 shrink-0 rounded-md border border-border bg-white object-contain"
                    />
                    <div
                      v-else
                      class="grid size-10 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground"
                    >
                      <Icon name="ph:image" />
                    </div>
                    <div class="min-w-0">
                      <button
                        type="button"
                        class="line-clamp-2 text-left text-sm font-medium text-primary hover:underline"
                        :title="title(offer)"
                        :data-testid="`catalogue-offer-open-${offer.id}`"
                        @click="openOffer(offer.id)"
                      >
                        {{ title(offer) }}
                      </button>
                      <NuxtLinkLocale
                        :to="{ path: '/products', query: { id: offer.produit.id } }"
                        class="text-xs text-muted-foreground hover:text-primary"
                        >{{ t("catalogue.product") }}</NuxtLinkLocale
                      >
                      <p class="truncate text-xs text-muted-foreground">
                        {{ offer.referenceVendeur }}
                        <template v-if="offer.produit.marque"> · {{ offer.produit.marque }}</template>
                        <template v-if="offer.produit.categorie"> · {{ offer.produit.categorie }}</template>
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell class="min-w-40">
                  <NuxtLinkLocale
                    :to="{
                      path: '/operations',
                      query: { tab: 'seller-onboarding', candidature: offer.boutique.vendeurId },
                    }"
                    class="text-sm font-medium hover:text-primary"
                    >{{ offer.boutique.nom }}</NuxtLinkLocale
                  >
                  <p class="truncate text-xs text-muted-foreground">{{ offer.boutique.vendeur.nomLegal }}</p>
                </TableCell>
                <TableCell>
                  <Badge :variant="statusVariant(offer.statut)" :data-testid="`marketplace-offer-status-${offer.id}`">{{
                    t(`operations.marketplaceOffers.statuses.${offer.statut}`)
                  }}</Badge>
                  <Badge v-if="offer.verifieParKatiLe" variant="outline" class="ml-1">
                    <Icon name="ph:seal-check" /><span class="sr-only">{{
                      t("operations.marketplaceOffers.verified")
                    }}</span>
                  </Badge>
                </TableCell>
                <TableCell class="whitespace-nowrap text-right text-sm">
                  {{ offer.prixFcfa === null ? "—" : formatMontant(offer.prixFcfa, locale).exact }}
                  <p v-if="offer.prixReferenceFcfa" class="text-xs text-muted-foreground line-through">
                    {{ formatMontant(offer.prixReferenceFcfa, locale).exact }}
                  </p>
                </TableCell>
                <TableCell
                  class="whitespace-nowrap text-right text-sm"
                  :class="stockClass(offer)"
                  :data-testid="`marketplace-offer-stock-${offer.id}`"
                >
                  <CatalogueAvailabilityBadge
                    v-if="offer.statutStock && offer.statutStock !== 'en_stock'"
                    :status="offer.statutStock"
                  />
                  <template v-else>{{ stockLabel(offer) }}</template>
                </TableCell>
                <TableCell class="whitespace-nowrap text-xs text-muted-foreground">
                  {{ offer.publieLe ? formatDayMonthYear(offer.publieLe, locale) : "—" }}
                </TableCell>
                <TableCell>
                  <a
                    v-if="productUrl(offer)"
                    :href="productUrl(offer)!"
                    target="_blank"
                    rel="noopener"
                    class="inline-grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    :aria-label="t('operations.marketplaceOffers.openOnStorefront', { offer: title(offer) })"
                  >
                    <Icon name="ph:arrow-square-out" />
                  </a>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <nav
          v-if="pagination && pagination.pages > 1"
          class="mt-4 flex items-center justify-between gap-3 text-sm"
          :aria-label="t('operations.marketplaceOffers.pages')"
        >
          <Button
            size="sm"
            variant="outline"
            :disabled="pagination.page <= 1 || query.isFetching.value"
            data-testid="marketplace-offers-previous"
            @click="goTo(pagination.page - 1)"
          >
            <Icon name="ph:caret-left" /> {{ t("operations.marketplaceOffers.previous") }}
          </Button>
          <span class="text-muted-foreground" data-testid="marketplace-offers-page">{{
            t("operations.marketplaceOffers.pageOf", { page: pagination.page, pages: pagination.pages })
          }}</span>
          <Button
            size="sm"
            variant="outline"
            :disabled="pagination.page >= pagination.pages || query.isFetching.value"
            data-testid="marketplace-offers-next"
            @click="goTo(pagination.page + 1)"
          >
            {{ t("operations.marketplaceOffers.next") }} <Icon name="ph:caret-right" />
          </Button>
        </nav>
      </template>
    </div>
  </div>
</template>

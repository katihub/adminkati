<script setup lang="ts">
// fallow-ignore-file complexity -- declarative moderation workspace with product and offer state branches
import type {
  MarketplaceContentReview,
  MarketplaceOfferReview,
  MarketplaceProductReview,
} from "@/types/api/marketplace-moderation"
import { computed, ref, watch } from "vue"
import { toast } from "vue-sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  useMarketplaceCatalogueModerationMutations,
  useMarketplaceContentReviews,
  useMarketplaceOfferReviews,
  useMarketplaceProductReviews,
} from "@/composables/useMarketplaceModeration"
import { apiErrorText } from "@/utils/api-error"
import { formatMontant } from "@/utils/money"
import { routeQueryUuid } from "@/utils/route-query"

type Queue = "products" | "offers" | "contents"
const { t, locale } = useI18n()
const route = useRoute()
const queue = ref<Queue>(route.query.file === "offers" ? "offers" : "products")
const productFilter = computed(() => routeQueryUuid(route.query.produit))
const offerFilter = computed(() => routeQueryUuid(route.query.offre))
const search = ref("")
const selectedId = ref<string | null>(productFilter.value)
const reason = ref("")
const productsQuery = useMarketplaceProductReviews()
const offersQuery = useMarketplaceOfferReviews()
const contentsQuery = useMarketplaceContentReviews()
const mutations = useMarketplaceCatalogueModerationMutations()
const queries = { products: productsQuery, offers: offersQuery, contents: contentsQuery }
function amount(value: number) {
  return formatMontant(value, locale.value).exact
}
const date = computed(() => new Intl.DateTimeFormat(locale.value, { day: "2-digit", month: "short", year: "numeric" }))
const products = computed(() =>
  (productsQuery.data.value ?? []).filter(
    item =>
      (!productFilter.value || item.id === productFilter.value) &&
      (!search.value.trim() ||
        `${item.nom} ${item.marque ?? ""} ${item.proposeParBoutique?.nom ?? ""}`
          .toLowerCase()
          .includes(search.value.trim().toLowerCase())),
  ),
)
const offers = computed(() =>
  (offersQuery.data.value ?? []).filter(
    item =>
      (!offerFilter.value || item.offre.id === offerFilter.value) &&
      (!productFilter.value || item.offre.produit.id === productFilter.value) &&
      (!search.value.trim() ||
        `${item.titre} ${item.offre.produit.nom} ${item.offre.boutique.nom}`
          .toLowerCase()
          .includes(search.value.trim().toLowerCase())),
  ),
)
const selectedProduct = computed(
  () => products.value.find(item => item.id === selectedId.value) ?? products.value[0] ?? null,
)
const selectedOffer = computed(() => offers.value.find(item => item.id === selectedId.value) ?? offers.value[0] ?? null)
const contents = computed(() =>
  (contentsQuery.data.value ?? []).filter(
    item =>
      (!productFilter.value || item.produit.id === productFilter.value) &&
      (!search.value.trim() ||
        `${item.produit.nom} ${item.boutique?.nom ?? ""}`.toLowerCase().includes(search.value.trim().toLowerCase())),
  ),
)
const selectedContent = computed(
  () => contents.value.find(item => item.id === selectedId.value) ?? contents.value[0] ?? null,
)
const current = computed<MarketplaceProductReview | MarketplaceOfferReview | MarketplaceContentReview | null>(() =>
  queue.value === "products"
    ? selectedProduct.value
    : queue.value === "offers"
      ? selectedOffer.value
      : selectedContent.value,
)
const queueLength = computed(
  () =>
    ({ products: products.value.length, offers: offers.value.length, contents: contents.value.length })[queue.value],
)
const loading = computed(() => queries[queue.value].isPending.value)
const error = computed(() => queries[queue.value].error.value)
const pending = computed(() => Object.values(mutations).some(mutation => mutation.isPending.value))
const title = computed(() =>
  queue.value === "products"
    ? selectedProduct.value?.nom
    : queue.value === "offers"
      ? selectedOffer.value?.titre
      : selectedContent.value?.produit.nom,
)
const subtitle = computed(() => {
  if (queue.value === "products")
    return selectedProduct.value?.proposeParBoutique?.nom ?? t("operations.catalogue.katihubCatalogue")
  if (queue.value === "offers")
    return `${selectedOffer.value?.offre.boutique.nom} · ${selectedOffer.value?.offre.produit.nom}`
  const content = selectedContent.value
  return content
    ? `${content.boutique?.nom ?? t("operations.catalogue.katihubCatalogue")} · ${t("operations.catalogue.revisionNumber", { number: content.numero })}`
    : ""
})
const searchPlaceholder = computed(() =>
  t(
    queue.value === "products"
      ? "operations.catalogue.productSearch"
      : queue.value === "offers"
        ? "operations.catalogue.offerSearch"
        : "operations.catalogue.contentSearch",
  ),
)
const seoRows = computed(() => {
  const content = selectedContent.value
  if (!content) return []
  return [
    {
      key: "metaTitle",
      label: t("operations.catalogue.metaTitle"),
      before: content.produit.metaTitre,
      after: content.metaTitre,
      max: 70,
    },
    {
      key: "metaDescription",
      label: t("operations.catalogue.metaDescription"),
      before: content.produit.metaDescription,
      after: content.metaDescription,
      max: 170,
    },
  ]
})
/** The short description, the technical sheet and its PDF: current value against the proposal. */
const textRows = computed(() => {
  const content = selectedContent.value
  if (!content) return []
  return [
    {
      key: "shortDescription",
      label: t("operations.catalogue.shortDescription"),
      before: content.produit.descriptionCourte ?? null,
      after: content.descriptionCourte ?? null,
    },
    {
      key: "technicalSheet",
      label: t("operations.catalogue.technicalSheet"),
      before: content.produit.ficheTechnique ?? null,
      after: content.ficheTechnique ?? null,
    },
  ]
})
const size = (bytes: number) =>
  `${new Intl.NumberFormat(locale.value, { maximumFractionDigits: 1 }).format(bytes / 1024)} Kio`

watch(queue, () => {
  selectedId.value = null
  reason.value = ""
})
watch(current, () => {
  reason.value = ""
})

function select(id: string) {
  selectedId.value = id
}

async function run(action: () => Promise<unknown>, success: string) {
  try {
    await action()
    reason.value = ""
    selectedId.value = null
    toast.success(success)
  } catch (cause) {
    toast.error(apiErrorText(cause, t))
  }
}

async function claim() {
  if (!current.value) return
  const id = current.value.id
  if (queue.value === "products")
    await run(() => mutations.claimProduct.mutateAsync(id), t("operations.catalogue.productClaimed"))
  else if (queue.value === "offers")
    await run(() => mutations.claimOffer.mutateAsync(id), t("operations.catalogue.offerClaimed"))
  else await run(() => mutations.claimContent.mutateAsync(id), t("operations.catalogue.contentClaimed"))
}

async function decide(decision: "approve" | "changes" | "refuse") {
  const item = current.value
  const motif = reason.value.trim()
  if (!item || (decision !== "approve" && motif.length < 5)) return
  if (queue.value === "products") {
    const backendDecision =
      decision === "approve" ? "actif" : decision === "changes" ? "modification_demandee" : "refuse"
    await run(
      () =>
        mutations.decideProduct.mutateAsync({ id: item.id, decision: backendDecision, ...(motif ? { motif } : {}) }),
      t("operations.catalogue.productDecisionSaved"),
    )
  } else {
    const backendDecision =
      decision === "approve" ? "approuvee" : decision === "changes" ? "modification_demandee" : "refusee"
    const body = { id: item.id, decision: backendDecision, ...(motif ? { motif } : {}) } as const
    if (queue.value === "offers")
      await run(() => mutations.decideOffer.mutateAsync(body), t("operations.catalogue.offerDecisionSaved"))
    else await run(() => mutations.decideContent.mutateAsync(body), t("operations.catalogue.contentDecisionSaved"))
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col" data-testid="marketplace-catalogue-moderation-workspace">
    <div
      v-if="productFilter || offerFilter"
      class="flex flex-wrap items-center gap-4 border-t border-border px-4 py-3 text-sm sm:px-6 lg:px-10"
    >
      <NuxtLinkLocale
        v-if="productFilter"
        :to="{ path: '/products', query: { id: productFilter } }"
        class="font-medium text-primary"
        >{{ t("catalogue.product") }}</NuxtLinkLocale
      >
      <Button
        variant="outline"
        size="sm"
        @click="navigateTo({ path: route.path, query: { tab: 'marketplace-catalogue' } })"
        >{{ t("operations.marketplaceOffers.clear") }}</Button
      >
    </div>
    <div
      class="flex shrink-0 flex-col gap-3 border-t border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:px-6 lg:px-10"
    >
      <div class="flex rounded-md border border-border bg-muted p-1">
        <button
          type="button"
          class="rounded px-3 py-1.5 text-sm font-medium"
          :class="queue === 'products' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'"
          data-testid="catalogue-queue-products"
          @click="queue = 'products'"
        >
          {{ t("operations.catalogue.products") }}
          <span class="ml-1 text-xs">{{ productsQuery.data.value?.length ?? 0 }}</span>
        </button>
        <button
          type="button"
          class="rounded px-3 py-1.5 text-sm font-medium"
          :class="queue === 'offers' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'"
          data-testid="catalogue-queue-offers"
          @click="queue = 'offers'"
        >
          {{ t("operations.catalogue.offers") }}
          <span class="ml-1 text-xs">{{ offersQuery.data.value?.length ?? 0 }}</span>
        </button>
        <button
          type="button"
          class="rounded px-3 py-1.5 text-sm font-medium"
          :class="queue === 'contents' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'"
          data-testid="catalogue-queue-contents"
          @click="queue = 'contents'"
        >
          {{ t("operations.catalogue.contents") }}
          <span class="ml-1 text-xs">{{ contentsQuery.data.value?.length ?? 0 }}</span>
        </button>
      </div>
      <label class="relative min-w-0 flex-1 sm:max-w-md">
        <Icon
          name="ph:magnifying-glass"
          class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          v-model="search"
          class="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
          :placeholder="searchPlaceholder"
        />
      </label>
    </div>

    <div class="grid min-h-0 flex-1 grid-cols-1 border-t border-border bg-card lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside
        class="h-full overflow-hidden border-r border-border bg-card"
        :class="selectedId ? 'hidden lg:block' : 'block'"
      >
        <div class="border-b border-border px-4 py-3">
          <h2 class="font-heading text-sm font-semibold">{{ t("operations.catalogue.queue") }}</h2>
          <p class="mt-0.5 text-xs text-muted-foreground">
            {{ t("operations.catalogue.count", { count: queueLength }) }}
          </p>
        </div>
        <ScrollArea class="h-[calc(100%-61px)]">
          <div v-if="loading" class="space-y-2 p-3">
            <div v-for="n in 7" :key="n" class="h-20 animate-pulse rounded-md bg-muted" />
          </div>
          <ApiErrorCard v-else-if="error" class="m-3" :error="error" @retry="queries[queue].refetch()" />
          <div v-else-if="!queueLength" class="p-8 text-center text-sm text-muted-foreground">
            {{ t("operations.catalogue.empty") }}
          </div>
          <template v-else>
            <button
              v-for="product in queue === 'products' ? products : []"
              :key="product.id"
              type="button"
              class="flex w-full flex-col gap-1 border-b border-border px-4 py-3 text-left hover:bg-muted/50"
              :class="
                product.id === selectedProduct?.id
                  ? 'border-l-4 border-l-primary bg-muted'
                  : 'border-l-4 border-l-transparent'
              "
              @click="select(product.id)"
            >
              <span class="flex w-full items-start justify-between gap-2"
                ><strong class="truncate text-sm">{{ product.nom }}</strong
                ><Badge variant="outline" class="shrink-0 text-[10px]">{{ product.statut }}</Badge></span
              ><span class="truncate text-xs text-muted-foreground">{{
                product.proposeParBoutique?.nom ?? t("operations.catalogue.katihubCatalogue")
              }}</span
              ><span class="text-[11px] text-muted-foreground">{{ date.format(new Date(product.creeLe)) }}</span>
            </button>
            <button
              v-for="offer in queue === 'offers' ? offers : []"
              :key="offer.id"
              type="button"
              class="flex w-full flex-col gap-1 border-b border-border px-4 py-3 text-left hover:bg-muted/50"
              :class="
                offer.id === selectedOffer?.id
                  ? 'border-l-4 border-l-primary bg-muted'
                  : 'border-l-4 border-l-transparent'
              "
              @click="select(offer.id)"
            >
              <span class="flex w-full items-start justify-between gap-2"
                ><strong class="truncate text-sm">{{ offer.titre }}</strong
                ><Badge variant="outline" class="shrink-0 text-[10px]">{{ offer.statut }}</Badge></span
              ><span class="truncate text-xs text-muted-foreground"
                >{{ offer.offre.boutique.nom }} · {{ offer.offre.produit.nom }}</span
              ><span class="text-[11px] text-muted-foreground"
                >{{ amount(offer.prixFcfa) }}{{ offer.libelleVariante ? ` · ${offer.libelleVariante}` : "" }}</span
              >
            </button>
            <button
              v-for="content in queue === 'contents' ? contents : []"
              :key="content.id"
              type="button"
              class="flex w-full flex-col gap-1 border-b border-border px-4 py-3 text-left hover:bg-muted/50"
              :class="
                content.id === selectedContent?.id
                  ? 'border-l-4 border-l-primary bg-muted'
                  : 'border-l-4 border-l-transparent'
              "
              @click="select(content.id)"
            >
              <span class="flex w-full items-start justify-between gap-2"
                ><strong class="truncate text-sm">{{ content.produit.nom }}</strong
                ><Badge variant="outline" class="shrink-0 text-[10px]">{{ content.statut }}</Badge></span
              ><span class="truncate text-xs text-muted-foreground">{{
                content.boutique?.nom ?? t("operations.catalogue.katihubCatalogue")
              }}</span
              ><span class="text-[11px] text-muted-foreground"
                >{{ date.format(new Date(content.soumisLe)) }} ·
                {{ t("operations.catalogue.revisionNumber", { number: content.numero }) }}</span
              >
            </button>
          </template>
        </ScrollArea>
      </aside>

      <section class="h-full overflow-y-auto bg-muted/60" :class="selectedId ? 'block' : 'hidden lg:block'">
        <EmptyStateCard v-if="!current" class="m-6" icon="ph:cursor-click" :text="t('operations.catalogue.select')" />
        <div v-else class="min-h-full">
          <header
            class="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background p-4 sm:p-5"
          >
            <div class="min-w-0">
              <button
                type="button"
                class="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground lg:hidden"
                @click="selectedId = null"
              >
                <Icon name="ph:arrow-left" /> {{ t("operations.common.back") }}
              </button>
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="font-heading text-lg font-semibold">{{ title }}</h2>
                <Badge>{{ current.statut }}</Badge>
              </div>
              <p class="mt-1 text-sm text-muted-foreground">{{ subtitle }}</p>
            </div>
            <Button
              v-if="current.statut === 'soumis' || current.statut === 'soumise'"
              size="sm"
              :disabled="pending"
              data-testid="catalogue-claim"
              @click="claim"
              ><Icon name="ph:hand" /> {{ t("operations.catalogue.claim") }}</Button
            >
          </header>

          <div class="grid gap-4 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_310px]">
            <div class="space-y-4">
              <section
                v-if="selectedProduct && queue === 'products'"
                class="rounded-lg border border-border bg-card p-5"
              >
                <h3 class="font-heading font-semibold">{{ t("operations.catalogue.proposedProduct") }}</h3>
                <dl class="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt class="text-muted-foreground">{{ t("operations.catalogue.name") }}</dt>
                    <dd class="font-medium">{{ selectedProduct.nom }}</dd>
                  </div>
                  <div>
                    <dt class="text-muted-foreground">{{ t("operations.catalogue.slug") }}</dt>
                    <dd class="font-medium">{{ selectedProduct.slug }}</dd>
                  </div>
                  <div>
                    <dt class="text-muted-foreground">{{ t("operations.catalogue.brand") }}</dt>
                    <dd class="font-medium">{{ selectedProduct.marque ?? "—" }}</dd>
                  </div>
                  <div>
                    <dt class="text-muted-foreground">{{ t("operations.catalogue.category") }}</dt>
                    <dd class="font-medium">{{ selectedProduct.categorie ?? "—" }}</dd>
                  </div>
                </dl>
                <div class="mt-5 border-t border-border pt-4">
                  <h4 class="text-sm font-medium">{{ t("operations.catalogue.description") }}</h4>
                  <p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {{ selectedProduct.description ?? t("operations.catalogue.noDescription") }}
                  </p>
                </div>
                <div class="mt-5 border-t border-border pt-4" data-testid="product-review-texts">
                  <h4 class="text-sm font-medium">{{ t("operations.catalogue.shortDescription") }}</h4>
                  <p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {{ selectedProduct.descriptionCourte ?? t("operations.catalogue.notSet") }}
                  </p>
                  <h4 class="mt-4 text-sm font-medium">{{ t("operations.catalogue.technicalSheet") }}</h4>
                  <p class="mt-2 whitespace-pre-wrap font-mono text-xs leading-6 text-muted-foreground">
                    {{ selectedProduct.ficheTechnique ?? t("operations.catalogue.notSet") }}
                  </p>
                  <a
                    v-if="selectedProduct.ficheTechniquePdfUrl"
                    :href="selectedProduct.ficheTechniquePdfUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary underline"
                    ><Icon name="ph:file-pdf" /> {{ t("operations.catalogue.technicalSheetPdf") }}</a
                  >
                </div>
              </section>
              <section v-if="selectedOffer && queue === 'offers'" class="rounded-lg border border-border bg-card p-5">
                <h3 class="font-heading font-semibold">{{ t("operations.catalogue.proposedTerms") }}</h3>
                <dl class="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <dt class="text-muted-foreground">{{ t("operations.catalogue.price") }}</dt>
                    <dd class="text-lg font-semibold">{{ amount(selectedOffer.prixFcfa) }}</dd>
                  </div>
                  <div>
                    <dt class="text-muted-foreground">{{ t("operations.catalogue.referencePrice") }}</dt>
                    <dd class="font-medium">
                      {{ selectedOffer.prixReferenceFcfa ? amount(selectedOffer.prixReferenceFcfa) : "—" }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-muted-foreground">{{ t("operations.catalogue.condition") }}</dt>
                    <dd class="font-medium">{{ selectedOffer.etat }}</dd>
                  </div>
                  <div>
                    <dt class="text-muted-foreground">{{ t("operations.catalogue.warranty") }}</dt>
                    <dd class="font-medium">
                      {{ t("operations.catalogue.monthCount", { count: selectedOffer.garantieMois }) }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-muted-foreground">{{ t("operations.catalogue.maximumDelay") }}</dt>
                    <dd class="font-medium">
                      {{ t("operations.catalogue.dayCount", { count: selectedOffer.delaiMaxJours }) }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-muted-foreground">{{ t("operations.catalogue.sellerReference") }}</dt>
                    <dd class="font-medium">{{ selectedOffer.offre.referenceVendeur }}</dd>
                  </div>
                  <div>
                    <dt class="text-muted-foreground">{{ t("operations.catalogue.minimumOrder") }}</dt>
                    <dd class="font-medium" data-testid="offer-review-moq">
                      {{ t("operations.catalogue.unitCount", { count: selectedOffer.quantiteMinimale ?? 1 }) }}
                    </dd>
                  </div>
                  <div v-if="selectedOffer.libelleVariante">
                    <dt class="text-muted-foreground">{{ t("operations.catalogue.variant") }}</dt>
                    <dd class="font-medium">{{ selectedOffer.libelleVariante }}</dd>
                  </div>
                  <div v-if="selectedOffer.attributsVariante" class="sm:col-span-2">
                    <dt class="text-muted-foreground">{{ t("operations.catalogue.variantAttributes") }}</dt>
                    <dd class="mt-1 flex flex-wrap gap-1.5">
                      <Badge v-for="(value, name) in selectedOffer.attributsVariante" :key="name" variant="outline"
                        >{{ name }} : {{ value }}</Badge
                      >
                    </dd>
                  </div>
                </dl>
                <div class="mt-5 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
                  <div>
                    <h4 class="text-sm font-medium">{{ t("operations.catalogue.cities") }}</h4>
                    <p class="mt-1 text-sm text-muted-foreground">{{ selectedOffer.villesLivraison.join(", ") }}</p>
                  </div>
                  <div>
                    <h4 class="text-sm font-medium">{{ t("operations.catalogue.deliveryMethods") }}</h4>
                    <p class="mt-1 text-sm text-muted-foreground">{{ selectedOffer.modesLivraison.join(", ") }}</p>
                  </div>
                </div>
                <div class="mt-5 border-t border-border pt-4">
                  <h4 class="text-sm font-medium">{{ t("operations.catalogue.description") }}</h4>
                  <p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {{ selectedOffer.description ?? t("operations.catalogue.noDescription") }}
                  </p>
                </div>
              </section>
              <template v-if="selectedContent && queue === 'contents'">
                <section class="rounded-lg border border-border bg-card p-5" data-testid="content-review-seo">
                  <h3 class="font-heading font-semibold">{{ t("operations.catalogue.seo") }}</h3>
                  <div v-for="row in seoRows" :key="row.key" class="mt-4 border-t border-border pt-4 first:border-0">
                    <h4 class="text-sm font-medium">{{ row.label }}</h4>
                    <dl class="mt-2 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt class="text-xs text-muted-foreground">{{ t("operations.catalogue.currentValue") }}</dt>
                        <dd class="mt-1 text-muted-foreground">{{ row.before ?? t("operations.catalogue.notSet") }}</dd>
                      </div>
                      <div>
                        <dt class="text-xs text-muted-foreground">
                          {{ t("operations.catalogue.proposedValue") }}
                          <span v-if="row.after">· {{ row.after.length }}/{{ row.max }}</span>
                        </dt>
                        <dd class="mt-1 font-medium">{{ row.after ?? t("operations.catalogue.notSet") }}</dd>
                      </div>
                    </dl>
                  </div>
                </section>
                <section class="rounded-lg border border-border bg-card p-5" data-testid="content-review-texts">
                  <h3 class="font-heading font-semibold">{{ t("operations.catalogue.sheetTexts") }}</h3>
                  <div v-for="row in textRows" :key="row.key" class="mt-4 border-t border-border pt-4 first:border-0">
                    <h4 class="text-sm font-medium">{{ row.label }}</h4>
                    <dl class="mt-2 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt class="text-xs text-muted-foreground">{{ t("operations.catalogue.currentValue") }}</dt>
                        <dd class="mt-1 whitespace-pre-wrap text-muted-foreground">
                          {{ row.before ?? t("operations.catalogue.notSet") }}
                        </dd>
                      </div>
                      <div>
                        <dt class="text-xs text-muted-foreground">{{ t("operations.catalogue.proposedValue") }}</dt>
                        <dd class="mt-1 whitespace-pre-wrap font-medium">
                          {{ row.after ?? t("operations.catalogue.notSet") }}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <div class="mt-4 border-t border-border pt-4">
                    <h4 class="text-sm font-medium">{{ t("operations.catalogue.technicalSheetPdf") }}</h4>
                    <dl class="mt-2 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt class="text-xs text-muted-foreground">{{ t("operations.catalogue.currentValue") }}</dt>
                        <dd class="mt-1">
                          <a
                            v-if="selectedContent.produit.ficheTechniquePdfUrl"
                            :href="selectedContent.produit.ficheTechniquePdfUrl"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-primary underline"
                            >{{ t("operations.catalogue.openPdf") }}</a
                          >
                          <span v-else class="text-muted-foreground">{{ t("operations.catalogue.notSet") }}</span>
                        </dd>
                      </div>
                      <div>
                        <dt class="text-xs text-muted-foreground">{{ t("operations.catalogue.proposedValue") }}</dt>
                        <dd class="mt-1">
                          <a
                            v-if="selectedContent.ficheTechniquePdfUrl"
                            :href="selectedContent.ficheTechniquePdfUrl"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="font-medium text-primary underline"
                            data-testid="content-review-pdf"
                            >{{ t("operations.catalogue.openPdf") }}</a
                          >
                          <span v-else class="text-muted-foreground">{{ t("operations.catalogue.notSet") }}</span>
                        </dd>
                      </div>
                    </dl>
                  </div>
                </section>
                <section class="rounded-lg border border-border bg-card p-5" data-testid="content-review-gallery">
                  <h3 class="font-heading font-semibold">{{ t("operations.catalogue.gallery") }}</h3>
                  <p class="mt-1 text-xs text-muted-foreground">{{ t("operations.catalogue.galleryHelp") }}</p>
                  <p v-if="!selectedContent.images.length" class="mt-4 text-sm text-muted-foreground">
                    {{ t("operations.catalogue.emptyGallery") }}
                  </p>
                  <ol v-else class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <li
                      v-for="(entry, index) in selectedContent.images"
                      :key="entry.imageId"
                      class="overflow-hidden rounded-md border border-border"
                    >
                      <a
                        v-if="entry.image"
                        :href="entry.image.url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="block bg-muted"
                      >
                        <img
                          :src="entry.image.url"
                          :alt="entry.texteAlternatif ?? ''"
                          class="aspect-square w-full object-contain"
                          loading="lazy"
                        />
                      </a>
                      <div v-else class="grid aspect-square place-items-center bg-muted text-xs text-destructive">
                        {{ t("operations.catalogue.missingImage") }}
                      </div>
                      <div class="space-y-1 p-3 text-xs">
                        <p class="font-medium">
                          {{
                            index === 0
                              ? t("operations.catalogue.mainImage")
                              : t("operations.catalogue.position", { number: index + 1 })
                          }}
                          <span v-if="entry.image" class="font-normal text-muted-foreground">
                            · {{ entry.image.typeMime }} · {{ size(entry.image.tailleOctets) }}</span
                          >
                        </p>
                        <p :class="entry.texteAlternatif ? '' : 'italic text-muted-foreground'">
                          {{ t("operations.catalogue.altText") }} :
                          {{ entry.texteAlternatif ?? t("operations.catalogue.noAltText") }}
                        </p>
                      </div>
                    </li>
                  </ol>
                </section>
              </template>
            </div>

            <section class="h-fit rounded-lg border border-border bg-card p-4 xl:sticky xl:top-24">
              <h3 class="font-heading font-semibold">{{ t("operations.catalogue.moderationDecision") }}</h3>
              <p class="mt-2 text-xs text-muted-foreground">{{ t("operations.catalogue.moderationHelp") }}</p>
              <label class="mt-4 block text-sm font-medium" for="marketplace-moderation-reason">{{
                t("operations.catalogue.reason")
              }}</label>
              <textarea
                id="marketplace-moderation-reason"
                v-model="reason"
                rows="6"
                class="mt-2 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <Button
                class="mt-3 w-full"
                :disabled="pending || current.statut !== 'en_verification'"
                data-testid="catalogue-approve"
                @click="decide('approve')"
                ><Icon name="ph:check-circle" /> {{ t("operations.catalogue.approve") }}</Button
              >
              <Button
                class="mt-2 w-full"
                variant="outline"
                :disabled="pending || current.statut !== 'en_verification' || reason.trim().length < 5"
                @click="decide('changes')"
                >{{ t("operations.catalogue.requestChanges") }}</Button
              >
              <Button
                class="mt-2 w-full"
                variant="destructive"
                :disabled="pending || current.statut !== 'en_verification' || reason.trim().length < 5"
                @click="decide('refuse')"
                >{{ t("operations.catalogue.refuse") }}</Button
              >
            </section>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

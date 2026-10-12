<script setup lang="ts">
// fallow-ignore-file complexity -- declarative moderation workspace with product and offer state branches
import type { MarketplaceOfferReview, MarketplaceProductReview } from "@/types/api/marketplace-moderation"
import { computed, ref, watch } from "vue"
import { toast } from "vue-sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  useMarketplaceCatalogueModerationMutations,
  useMarketplaceOfferReviews,
  useMarketplaceProductReviews,
} from "@/composables/useMarketplaceModeration"
import { apiErrorText } from "@/utils/api-error"

type Queue = "products" | "offers"
const { t, locale } = useI18n()
const queue = ref<Queue>("products")
const search = ref("")
const selectedId = ref<string | null>(null)
const reason = ref("")
const productsQuery = useMarketplaceProductReviews()
const offersQuery = useMarketplaceOfferReviews()
const mutations = useMarketplaceCatalogueModerationMutations()
const money = computed(
  () => new Intl.NumberFormat(locale.value, { style: "currency", currency: "XAF", maximumFractionDigits: 0 }),
)
const date = computed(() => new Intl.DateTimeFormat(locale.value, { day: "2-digit", month: "short", year: "numeric" }))
const products = computed(() =>
  (productsQuery.data.value ?? []).filter(
    item =>
      !search.value.trim() ||
      `${item.nom} ${item.marque ?? ""} ${item.proposeParBoutique?.nom ?? ""}`
        .toLowerCase()
        .includes(search.value.trim().toLowerCase()),
  ),
)
const offers = computed(() =>
  (offersQuery.data.value ?? []).filter(
    item =>
      !search.value.trim() ||
      `${item.titre} ${item.offre.produit.nom} ${item.offre.boutique.nom}`
        .toLowerCase()
        .includes(search.value.trim().toLowerCase()),
  ),
)
const selectedProduct = computed(
  () => products.value.find(item => item.id === selectedId.value) ?? products.value[0] ?? null,
)
const selectedOffer = computed(() => offers.value.find(item => item.id === selectedId.value) ?? offers.value[0] ?? null)
const current = computed<MarketplaceProductReview | MarketplaceOfferReview | null>(() =>
  queue.value === "products" ? selectedProduct.value : selectedOffer.value,
)
const loading = computed(() =>
  queue.value === "products" ? productsQuery.isPending.value : offersQuery.isPending.value,
)
const error = computed(() => (queue.value === "products" ? productsQuery.error.value : offersQuery.error.value))
const pending = computed(() => Object.values(mutations).some(mutation => mutation.isPending.value))
const isProductQueue = computed(() => queue.value === "products")

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
  if (queue.value === "products")
    await run(() => mutations.claimProduct.mutateAsync(current.value!.id), t("operations.catalogue.productClaimed"))
  else await run(() => mutations.claimOffer.mutateAsync(current.value!.id), t("operations.catalogue.offerClaimed"))
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
    await run(
      () => mutations.decideOffer.mutateAsync({ id: item.id, decision: backendDecision, ...(motif ? { motif } : {}) }),
      t("operations.catalogue.offerDecisionSaved"),
    )
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col" data-testid="marketplace-catalogue-moderation-workspace">
    <div
      class="flex shrink-0 flex-col gap-3 border-t border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:px-6 lg:px-10"
    >
      <div class="flex rounded-md border border-border bg-muted p-1">
        <button
          type="button"
          class="rounded px-3 py-1.5 text-sm font-medium"
          :class="queue === 'products' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'"
          @click="queue = 'products'"
        >
          {{ t("operations.catalogue.products") }}
          <span class="ml-1 text-xs">{{ productsQuery.data.value?.length ?? 0 }}</span>
        </button>
        <button
          type="button"
          class="rounded px-3 py-1.5 text-sm font-medium"
          :class="queue === 'offers' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'"
          @click="queue = 'offers'"
        >
          {{ t("operations.catalogue.offers") }}
          <span class="ml-1 text-xs">{{ offersQuery.data.value?.length ?? 0 }}</span>
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
          :placeholder="
            isProductQueue ? t('operations.catalogue.productSearch') : t('operations.catalogue.offerSearch')
          "
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
            {{ t("operations.catalogue.count", { count: queue === "products" ? products.length : offers.length }) }}
          </p>
        </div>
        <ScrollArea class="h-[calc(100%-61px)]">
          <div v-if="loading" class="space-y-2 p-3">
            <div v-for="n in 7" :key="n" class="h-20 animate-pulse rounded-md bg-muted" />
          </div>
          <ApiErrorCard
            v-else-if="error"
            class="m-3"
            :error="error"
            @retry="queue === 'products' ? productsQuery.refetch() : offersQuery.refetch()"
          />
          <div
            v-else-if="(queue === 'products' && !products.length) || (queue === 'offers' && !offers.length)"
            class="p-8 text-center text-sm text-muted-foreground"
          >
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
              ><span class="text-[11px] text-muted-foreground">{{ money.format(offer.prixFcfa) }}</span>
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
                <h2 class="font-heading text-lg font-semibold">
                  {{ isProductQueue ? selectedProduct?.nom : selectedOffer?.titre }}
                </h2>
                <Badge>{{ current.statut }}</Badge>
              </div>
              <p class="mt-1 text-sm text-muted-foreground">
                {{
                  isProductQueue
                    ? (selectedProduct?.proposeParBoutique?.nom ?? t("operations.catalogue.katihubCatalogue"))
                    : `${selectedOffer?.offre.boutique.nom} · ${selectedOffer?.offre.produit.nom}`
                }}
              </p>
            </div>
            <Button
              v-if="current.statut === 'soumis' || current.statut === 'soumise'"
              size="sm"
              :disabled="pending"
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
              </section>
              <section v-if="selectedOffer && queue === 'offers'" class="rounded-lg border border-border bg-card p-5">
                <h3 class="font-heading font-semibold">{{ t("operations.catalogue.proposedTerms") }}</h3>
                <dl class="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <dt class="text-muted-foreground">{{ t("operations.catalogue.price") }}</dt>
                    <dd class="text-lg font-semibold">{{ money.format(selectedOffer.prixFcfa) }}</dd>
                  </div>
                  <div>
                    <dt class="text-muted-foreground">{{ t("operations.catalogue.referencePrice") }}</dt>
                    <dd class="font-medium">
                      {{ selectedOffer.prixReferenceFcfa ? money.format(selectedOffer.prixReferenceFcfa) : "—" }}
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

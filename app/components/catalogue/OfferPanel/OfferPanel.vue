<script setup lang="ts">
import type { AdminMarketplaceOfferDetail, MarketplaceOfferCorrection } from "@/types/api/catalogue-products"
import { useQuery } from "@tanstack/vue-query"
import { toast } from "vue-sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { apiErrorText } from "@/utils/api-error"
const { id } = defineProps<{ id: string }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
const api = useApiFetch()
const query = useQuery<AdminMarketplaceOfferDetail>({
  queryKey: computed(() => ["v1", "marketplace", "administration", "offres", id]),
  queryFn: () => api(`/marketplace/administration/offres/${encodeURIComponent(id)}`),
})
const editing = ref(false)
const dirty = ref(false)
const locked = ref(false)
const corrections = useCatalogueCorrections()
const saving = computed(() => locked.value || corrections.offer.isPending.value)
const guard = useCatalogueDraftGuard(dirty, saving)
const editable = computed(
  () =>
    query.data.value &&
    !["brouillon", "archivee"].includes(query.data.value.offre.statut) &&
    !query.data.value.offre.revisions.some(revision => ["soumise", "en_verification"].includes(revision.statut)),
)
function close() {
  guard.request(() => emit("close"))
}
async function save(body: MarketplaceOfferCorrection) {
  if (saving.value) return
  locked.value = true
  try {
    await corrections.offer.mutateAsync({ id, body })
    dirty.value = false
    editing.value = false
    toast.success(t("catalogue.saved"))
  } catch (error) {
    toast.error(apiErrorText(error, t))
  } finally {
    locked.value = false
  }
}
</script>
<template>
  <section
    class="flex min-w-0 flex-col gap-5 rounded-2xl border border-border bg-card p-4 sm:p-6"
    data-testid="catalogue-offer-panel"
  >
    <TeamDiscardDialog
      :open="guard.open.value"
      @update:open="value => !value && guard.cancel()"
      @confirm="guard.confirm"
    />
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-lg font-semibold">{{ t("catalogue.offer") }}</h2>
      <Button variant="ghost" size="sm" :disabled="saving" @click="close">{{ t("catalogue.close") }}</Button>
    </div>
    <ApiErrorCard v-if="query.error.value" :error="query.error.value" @retry="query.refetch()" />
    <Skeleton v-else-if="query.isPending.value" class="h-64 rounded-xl" />
    <template v-else-if="query.data.value">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h3 class="min-w-0 break-words font-semibold">
          {{ query.data.value.offre.titre ?? query.data.value.offre.produit.nom }}
        </h3>
        <Badge variant="secondary">{{ t(`catalogue.status.${query.data.value.offre.statut}`) }}</Badge>
      </div>
      <p class="text-sm text-muted-foreground">
        {{ query.data.value.offre.boutique.nom }} · {{ query.data.value.offre.referenceVendeur }}
      </p>
      <nav class="flex flex-wrap gap-4 text-sm font-medium text-primary">
        <NuxtLinkLocale :to="{ path: '/products', query: { id: query.data.value.offre.produit.id } }">{{
          t("catalogue.product")
        }}</NuxtLinkLocale
        ><NuxtLinkLocale
          :to="{
            path: '/operations',
            query: { tab: 'seller-onboarding', candidature: query.data.value.offre.boutique.vendeurId },
          }"
          >{{ t("catalogue.seller") }}</NuxtLinkLocale
        ><NuxtLinkLocale
          :to="{
            path: '/operations',
            query: {
              tab: 'marketplace-catalogue',
              produit: query.data.value.offre.produit.id,
              offre: id,
              file: 'offers',
            },
          }"
          >{{ t("catalogue.moderation") }}</NuxtLinkLocale
        >
      </nav>
      <CatalogueOfferForm
        v-if="editing"
        :key="id"
        :offer="query.data.value.offre"
        :saving="saving"
        :error="corrections.offer.error.value"
        @dirty="dirty = $event"
        @save="save"
        @cancel="
          guard.request(() => {
            editing = false
          })
        "
      />
      <template v-else>
        <CatalogueOfferAvailability :offer="query.data.value.offre" />
        <CatalogueOfferFacts :offer="query.data.value.offre" />
        <Button v-if="editable" class="self-start" data-testid="catalogue-edit-offer" @click="editing = true">{{
          t("catalogue.editOffer")
        }}</Button>
        <p v-else class="text-sm text-muted-foreground">{{ t("catalogue.reviewRequired") }}</p>
        <CatalogueCorrectionHistory :entries="query.data.value.historique" />
      </template>
    </template>
  </section>
</template>

<script setup lang="ts">
import type { AdminMarketplaceProductDetail } from "@/types/api/catalogue-products"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
const { detail, canEdit } = defineProps<{ detail: AdminMarketplaceProductDetail; canEdit: boolean }>()
defineEmits<{ edit: []; back: [] }>()
const { t } = useI18n()
const tab = ref("info")
const tabs = computed(() => [
  { value: "info", label: t("catalogue.info") },
  ...(detail.peutLireOffres
    ? [
        { value: "offers", label: t("catalogue.sellerOffers"), testid: "catalogue-product-offers-tab" },
        { value: "history", label: t("catalogue.history") },
      ]
    : []),
])
</script>
<template>
  <article
    class="flex min-w-0 flex-col gap-5 rounded-2xl border border-border bg-card p-4 sm:p-6"
    data-testid="catalogue-product-detail"
  >
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <Button size="sm" variant="ghost" @click="$emit('back')"
          ><Icon name="ph:arrow-left" data-icon="inline-start" />{{ t("catalogue.back") }}</Button
        >
        <h2 class="mt-3 break-words font-heading text-xl font-semibold">{{ detail.produit.nom }}</h2>
        <p class="mt-2 text-sm text-muted-foreground">{{ detail.produit.marque }} · {{ detail.produit.categorie }}</p>
      </div>
      <div class="flex items-center gap-2">
        <Badge :variant="detail.produit.statut === 'actif' ? 'success' : 'secondary'">{{
          t(`catalogue.status.${detail.produit.statut}`)
        }}</Badge
        ><Button v-if="canEdit" size="sm" data-testid="catalogue-edit-product" @click="$emit('edit')">{{
          t("catalogue.edit")
        }}</Button>
      </div>
    </div>
    <div class="max-w-full overflow-x-auto"><PillTabs v-model="tab" :items="tabs" /></div>
    <CatalogueProductOffers
      v-if="tab === 'offers' && detail.peutLireOffres"
      :offers="detail.produit.offres"
      :product-id="detail.produit.id"
    />
    <CatalogueCorrectionHistory v-else-if="tab === 'history'" :entries="detail.historique" />
    <div v-else class="flex flex-col gap-5">
      <CatalogueProductInformation :product="detail.produit" />
      <p v-if="!detail.peutLireOffres" class="text-xs text-muted-foreground">{{ t("catalogue.restrictedOffers") }}</p>
      <NuxtLinkLocale
        v-if="canEdit"
        :to="{ path: '/operations', query: { tab: 'marketplace-catalogue', produit: detail.produit.id } }"
        class="text-sm text-primary hover:underline"
        >{{ t("catalogue.moderation") }}</NuxtLinkLocale
      >
    </div>
  </article>
</template>

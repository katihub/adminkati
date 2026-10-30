<script setup lang="ts">
import type { LinkedMarketplaceOffer } from "@/types/api/catalogue-products"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatMontant } from "@/utils/money"
defineProps<{ offers: LinkedMarketplaceOffer[]; productId: string }>()
const { t, locale } = useI18n()
const availabilityOpen = ref(false)
</script>
<template>
  <section class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <NuxtLinkLocale
        :to="{ path: '/operations', query: { tab: 'marketplace-offers', produit: productId } }"
        class="text-sm font-medium text-primary hover:underline"
        >{{ t("catalogue.allProductOffers") }}</NuxtLinkLocale
      >
      <Button
        v-if="offers.length"
        size="sm"
        variant="outline"
        data-testid="catalogue-change-product-availability"
        @click="availabilityOpen = true"
        >{{ t("catalogue.availability.changeAll") }}</Button
      >
    </div>
    <CatalogueAvailabilityDialog
      v-if="availabilityOpen"
      v-model:open="availabilityOpen"
      :target="{ kind: 'product', id: productId }"
    />
    <p v-if="!offers.length" class="text-sm text-muted-foreground">{{ t("catalogue.noOffers") }}</p>
    <article v-for="offer in offers" :key="offer.id" class="flex flex-col gap-3 rounded-xl border border-border p-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h3 class="font-semibold">{{ offer.boutique.nom }}</h3>
        <span class="flex flex-wrap gap-2"
          ><CatalogueAvailabilityBadge :status="offer.statutStock" /><Badge variant="secondary">{{
            t(`catalogue.status.${offer.statut}`)
          }}</Badge></span
        >
      </div>
      <p class="text-sm text-muted-foreground">
        {{ offer.referenceVendeur }}<template v-if="offer.libelleVariante"> · {{ offer.libelleVariante }}</template>
      </p>
      <dl class="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt class="text-xs text-muted-foreground">{{ t("catalogue.price") }}</dt>
          <dd>{{ offer.prixFcfa === null ? "—" : formatMontant(offer.prixFcfa, locale).exact }}</dd>
        </div>
        <div>
          <dt class="text-xs text-muted-foreground">{{ t("catalogue.moq") }}</dt>
          <dd>{{ offer.quantiteMinimale }}</dd>
        </div>
      </dl>
      <div class="flex flex-wrap gap-4 text-sm font-medium text-primary">
        <NuxtLinkLocale
          :to="{ path: '/operations', query: { tab: 'marketplace-offers', produit: productId, offre: offer.id } }"
          :data-testid="`catalogue-open-offer-${offer.id}`"
          >{{ t("catalogue.open") }}</NuxtLinkLocale
        >
        <NuxtLinkLocale
          :to="{ path: '/operations', query: { tab: 'seller-onboarding', candidature: offer.boutique.vendeurId } }"
          >{{ t("catalogue.seller") }}</NuxtLinkLocale
        >
      </div>
    </article>
  </section>
</template>

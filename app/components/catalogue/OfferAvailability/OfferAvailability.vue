<script setup lang="ts">
import type { LinkedMarketplaceOffer } from "@/types/api/catalogue-products"
import { Button } from "@/components/ui/button"
/** The offer's availability badge, and the button that changes it (archived offers excepted). */
const { offer } = defineProps<{ offer: LinkedMarketplaceOffer }>()
const { t } = useI18n()
const open = ref(false)
</script>
<template>
  <div class="flex flex-wrap items-center gap-3" data-testid="catalogue-offer-availability">
    <span class="text-sm text-muted-foreground">{{ t("catalogue.availability.title") }}</span>
    <CatalogueAvailabilityBadge :status="offer.statutStock" />
    <Button
      v-if="offer.statut !== 'archivee'"
      size="sm"
      variant="outline"
      data-testid="catalogue-change-availability"
      @click="open = true"
      >{{ t("catalogue.availability.change") }}</Button
    >
    <CatalogueAvailabilityDialog
      v-if="open"
      v-model:open="open"
      :target="{
        kind: 'offer',
        id: offer.id,
        statutStock: offer.statutStock,
        suiviStock: offer.boutique.suiviStock,
        stock: offer.stock,
      }"
    />
  </div>
</template>

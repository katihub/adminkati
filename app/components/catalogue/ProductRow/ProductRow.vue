<script setup lang="ts">
import type { AdminMarketplaceProductSummary } from "@/types/api/catalogue-products"
import { Badge } from "@/components/ui/badge"
defineProps<{ product: AdminMarketplaceProductSummary }>()
const emit = defineEmits<{ select: [id: string] }>()
const { t } = useI18n()
</script>
<template>
  <button
    type="button"
    class="flex w-full items-center gap-4 p-4 text-left hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    :data-testid="`marketplace-product-${product.id}`"
    @click="emit('select', product.id)"
  >
    <img
      v-if="product.image"
      :src="product.image"
      alt=""
      class="size-14 shrink-0 rounded-lg bg-muted object-contain"
      loading="lazy"
    /><Icon v-else name="ph:package" class="size-10 shrink-0 text-muted-foreground" aria-hidden="true" />
    <span class="flex min-w-0 flex-1 flex-col gap-1"
      ><span class="line-clamp-2 text-sm font-semibold">{{ product.nom }}</span
      ><span class="text-xs text-muted-foreground">{{ product.marque }} · {{ product.categorie }}</span
      ><span class="text-xs text-muted-foreground">{{ t("catalogue.offerCount", { count: product.offres }) }}</span
      ><span
        v-if="product.disponibilite?.rupture || product.disponibilite?.reapprovisionnement"
        class="flex flex-wrap gap-1"
        ><Badge v-if="product.disponibilite.rupture" variant="destructive">{{
          t("catalogue.availability.listOut", { count: product.disponibilite.rupture })
        }}</Badge
        ><Badge v-if="product.disponibilite.reapprovisionnement" variant="warning">{{
          t("catalogue.availability.listRestock", { count: product.disponibilite.reapprovisionnement })
        }}</Badge></span
      ></span
    >
    <Badge :variant="product.statut === 'actif' ? 'success' : 'secondary'">{{
      t(`catalogue.status.${product.statut}`)
    }}</Badge>
  </button>
</template>

<script setup lang="ts">
import type { MarketplaceAdminOfferPage } from "@/types/api/marketplace-catalogue-admin"
import { useQuery } from "@tanstack/vue-query"
import { computed } from "vue"

/**
 * Every product belongs to one shop (6 November 2026), even one the team creates. The shop list
 * comes with the catalogue listing; one row is enough to read it.
 */
const owner = defineModel<string>({ required: true })
const { t } = useI18n()
const api = useApiFetch()
const shops = useQuery<MarketplaceAdminOfferPage>({
  queryKey: ["v1", "marketplace", "administration", "offres", "boutiques"],
  queryFn: () => api("/marketplace/administration/offres", { query: { taille: 1 } }),
})
const options = computed(() =>
  [...(shops.data.value?.boutiques ?? [])].sort((a, b) => a.nom.localeCompare(b.nom, "fr")),
)
</script>

<template>
  <PointsOfSaleField v-slot="{ field }" :label="t('catalogue.owner')" :detail="t('catalogue.ownerHelp')"
    ><select
      v-model="owner"
      v-bind="field"
      required
      class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      data-testid="catalogue-product-owner"
    >
      <option value="" disabled>{{ t("catalogue.ownerChoose") }}</option>
      <option v-for="shop in options" :key="shop.id" :value="shop.id">{{ shop.nom }}</option>
    </select></PointsOfSaleField
  >
</template>

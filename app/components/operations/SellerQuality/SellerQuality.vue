<script setup lang="ts">
import type { SellerReviewDetail } from "@/types/api/marketplace-moderation"
import { computed } from "vue"
const { seller, canOpen } = defineProps<{ seller: SellerReviewDetail; canOpen: boolean }>()
const { t } = useI18n({ useScope: "local" })
const reputation = computed(() => seller.reputations?.[0])
const sanctions = computed(() => seller.sanctions ?? [])
</script>
<template>
  <section class="flex flex-col gap-3 border-t border-border pt-4">
    <h3 class="font-heading font-semibold">{{ t("quality") }}</h3>
    <p v-if="reputation" class="text-sm">
      {{ t("risk", { score: reputation.scoreRisque, rate: reputation.tauxLitigeBps / 100 }) }}
    </p>
    <p v-else class="text-sm text-muted-foreground">{{ t("noScore") }}</p>
    <ul class="flex flex-col gap-2 text-sm">
      <li v-for="item in sanctions" :key="item.id">
        <strong>{{ item.type }} · {{ item.statut }}</strong>
        <p>{{ item.motif }}</p>
      </li>
    </ul>
    <NuxtLinkLocale
      v-if="canOpen"
      :to="{ path: '/operations', query: { tab: 'seller-trust', vendeur: seller.id } }"
      class="text-sm font-semibold text-primary underline underline-offset-4"
      >{{ t("openQuality") }}</NuxtLinkLocale
    >
  </section>
</template>
<i18n lang="json">
{
  "en": {
    "quality": "Quality and sanctions",
    "risk": "Risk score: {score} · Dispute rate: {rate}%",
    "noScore": "No quality assessment recorded.",
    "openQuality": "Open quality and sanction history"
  },
  "fr": {
    "quality": "Qualité et sanctions",
    "risk": "Score de risque : {score} · Taux de litiges : {rate}%",
    "noScore": "Aucune évaluation de qualité enregistrée.",
    "openQuality": "Ouvrir la qualité et l’historique des sanctions"
  }
}
</i18n>

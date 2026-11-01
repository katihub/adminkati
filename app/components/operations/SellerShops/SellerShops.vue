<script setup lang="ts">
import type { SellerReviewDetail } from "@/types/api/marketplace-moderation"
const { seller, canViewFinance = false } = defineProps<{ seller: SellerReviewDetail; canViewFinance?: boolean }>()
const { t } = useI18n({ useScope: "local" })
function shopCities(shop: SellerReviewDetail["boutiques"][number]) {
  return [...new Set([shop.ville, ...(shop.villesLivraison ?? [])].filter(Boolean))].join(", ") || "—"
}
function savLabel(mode: string | undefined) {
  if (!mode) return "—"
  return t(mode === "kati_service" ? "katiService" : "shopService")
}
function shopFields(shop: SellerReviewDetail["boutiques"][number]) {
  return [
    ["cities", shopCities(shop)],
    ["sav", savLabel(shop.gestionSav)],
    ["pickup", shop.adresseRetrait || "—"],
    ["focal", shop.pointFocal?.nom ?? "—"],
    ["products", shop._count?.offres ?? "—"],
    ["delivery", shop.modesLivraison?.join(", ") || "—"],
  ] as const
}
</script>

<template>
  <section class="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4" data-testid="seller-shops-record">
    <h3 class="font-heading font-semibold">{{ t("title") }}</h3>
    <dl class="grid gap-3 rounded-xl bg-muted/60 p-4 text-sm sm:grid-cols-2">
      <div>
        <dt class="text-xs text-muted-foreground">{{ t("identity") }}</dt>
        <dd>{{ seller.nomLegal }} · {{ seller.type }}</dd>
      </div>
      <div>
        <dt class="text-xs text-muted-foreground">{{ t("status") }}</dt>
        <dd>{{ seller.statut }} · {{ seller.statutVerification }}</dd>
      </div>
      <OperationsSellerCommission
        :seller-id="seller.id"
        :commission-bps="seller.commissionBps"
        :can-edit="canViewFinance"
      />
      <div v-if="seller.motifStatut">
        <dt class="text-xs text-muted-foreground">{{ t("reason") }}</dt>
        <dd>{{ seller.motifStatut }}</dd>
      </div>
    </dl>
    <article
      v-for="shop in seller.boutiques"
      :key="shop.id"
      class="flex flex-col gap-3 rounded-xl border border-border p-4"
    >
      <div class="flex flex-wrap justify-between gap-2">
        <strong>{{ shop.nom }}</strong
        ><span class="text-xs text-muted-foreground">{{ shop.statut }} · {{ shop.slug }}</span>
      </div>
      <p v-if="shop.description" class="whitespace-pre-wrap text-sm">{{ shop.description }}</p>
      <OperationsShopVisuals :shop="shop" :seller-id="seller.id" :can-remove="canViewFinance" />
      <dl class="grid gap-3 text-sm sm:grid-cols-2">
        <div v-for="[key, value] in shopFields(shop)" :key="key">
          <dt class="text-xs text-muted-foreground">{{ t(key) }}</dt>
          <dd>{{ value }}</dd>
        </div>
      </dl>
      <OperationsShopMembers :members="shop.membres" />
      <div v-if="canViewFinance" class="flex flex-wrap gap-4 text-sm font-semibold text-primary">
        <NuxtLinkLocale
          :to="{ path: '/operations', query: { tab: 'marketplace-offers', boutique: shop.id } }"
          class="underline underline-offset-4"
          >{{ t("catalogue") }}</NuxtLinkLocale
        >
        <NuxtLinkLocale
          :to="{ path: '/operations', query: { tab: 'seller-finance', boutique: shop.id } }"
          class="underline underline-offset-4"
          >{{ t("finance") }}</NuxtLinkLocale
        >
      </div>
    </article>
    <OperationsSellerQuality :seller="seller" :can-open="canViewFinance" />
  </section>
</template>

<i18n lang="json">
{
  "en": {
    "identity": "Legal identity",
    "status": "Account and KYC status",
    "reason": "Status reason",
    "title": "Shops and operations",
    "cities": "Cities served",
    "sav": "After-sales manager",
    "katiService": "Kati Service",
    "shopService": "Managed by the shop",
    "pickup": "Pickup address",
    "focal": "KATI focal point",
    "products": "Offers",
    "delivery": "Delivery modes",
    "members": "Shop members",
    "none": "No member recorded.",
    "active": "Active",
    "inactive": "Inactive",
    "catalogue": "Open this shop’s catalogue",
    "finance": "Open shop finance",
    "quality": "Quality and sanctions",
    "risk": "Risk score: {score} · Dispute rate: {rate}%",
    "noScore": "No quality assessment recorded.",
    "openQuality": "Open quality and sanction history"
  },
  "fr": {
    "identity": "Identité légale",
    "status": "Statut du compte et KYC",
    "reason": "Motif du statut",
    "title": "Boutiques et exploitation",
    "cities": "Villes desservies",
    "sav": "Gestionnaire du SAV",
    "katiService": "Kati Service",
    "shopService": "Gestion par la boutique",
    "pickup": "Adresse de retrait",
    "focal": "Point focal KATI",
    "products": "Offres",
    "delivery": "Modes de livraison",
    "members": "Membres de la boutique",
    "none": "Aucun membre enregistré.",
    "active": "Actif",
    "inactive": "Inactif",
    "catalogue": "Ouvrir le catalogue de cette boutique",
    "finance": "Ouvrir les finances de la boutique",
    "quality": "Qualité et sanctions",
    "risk": "Score de risque : {score} · Taux de litiges : {rate}%",
    "noScore": "Aucune évaluation de qualité enregistrée.",
    "openQuality": "Ouvrir la qualité et l’historique des sanctions"
  }
}
</i18n>

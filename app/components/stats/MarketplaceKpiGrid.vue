<script setup lang="ts">
import type { MarketplaceCommandCenter } from "@/types/api/statistiques"

const { marketplace } = defineProps<{ marketplace: MarketplaceCommandCenter }>()
const { t } = useI18n({ useScope: "local" })

const cards = computed(() => [
  {
    key: "gmv",
    title: t("cards.gmv"),
    metric: marketplace.kpis.gmv,
    icon: "ph:chart-line-up",
    to: "/orders",
    color: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  },
  {
    key: "orders",
    title: t("cards.orders"),
    metric: marketplace.kpis.orders,
    icon: "ph:shopping-cart-simple",
    to: "/orders",
    color: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  },
  {
    key: "activeSellers",
    title: t("cards.activeSellers"),
    metric: marketplace.kpis.activeSellers,
    icon: "ph:storefront",
    to: "/operations?tab=seller-onboarding",
    color: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  },
  {
    key: "clients",
    title: t("cards.clients"),
    metric: marketplace.kpis.clients,
    icon: "ph:users",
    to: "/users",
    color: "bg-brand-navy/10 text-brand-navy dark:bg-blue-300/15 dark:text-blue-300",
  },
  {
    key: "activeProducts",
    title: t("cards.activeProducts"),
    metric: marketplace.kpis.activeProducts,
    icon: "ph:cube",
    to: "/operations?tab=marketplace-catalogue",
    color: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  {
    key: "commissions",
    title: t("cards.commissions"),
    metric: marketplace.kpis.commissions,
    icon: "ph:coins",
    to: "/operations?tab=seller-finance",
    color: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  },
  {
    key: "openDisputes",
    title: t("cards.openDisputes"),
    metric: marketplace.kpis.openDisputes,
    icon: "ph:warning",
    to: "/operations?tab=marketplace-disputes",
    color: "bg-red-500/15 text-red-600 dark:text-red-400",
  },
])
</script>

<template>
  <section aria-labelledby="marketplace-kpi-title">
    <div class="mb-3 flex items-end justify-between gap-4">
      <div>
        <h2 id="marketplace-kpi-title" class="font-heading text-xl font-extrabold tracking-tight">
          {{ t("title") }}
        </h2>
        <p class="mt-1 text-sm text-muted-foreground">{{ t("subtitle") }}</p>
      </div>
      <NuxtLinkLocale to="/operations" class="hidden text-sm font-bold text-primary hover:underline sm:inline-flex">
        {{ t("operations") }}
      </NuxtLinkLocale>
    </div>
    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
      <StatsKpiCard
        v-for="card in cards"
        :key="card.key"
        :title="card.title"
        :valeur="card.metric.valeur"
        :precedent="card.metric.precedent"
        :period-label="card.metric.precedent === null ? t('currentTotal') : t('previousPeriod')"
        :icon="card.icon"
        :icon-bg-class="card.color"
        :to="card.to"
        :is-currency="card.metric.isCurrency"
      />
    </div>
  </section>
</template>

<i18n lang="json">
{
  "en": {
    "title": "Marketplace command center",
    "subtitle": "Global business health and queues that need a decision.",
    "operations": "Open operations",
    "previousPeriod": "vs previous period",
    "currentTotal": "current total",
    "cards": {
      "gmv": "Marketplace GMV",
      "orders": "Orders",
      "activeSellers": "Active sellers",
      "clients": "Clients",
      "activeProducts": "Active products",
      "commissions": "Acquired commissions",
      "openDisputes": "Open disputes"
    }
  },
  "fr": {
    "title": "Poste de commande marketplace",
    "subtitle": "Santé globale et files qui nécessitent une décision.",
    "operations": "Ouvrir les opérations",
    "previousPeriod": "vs période précédente",
    "currentTotal": "total actuel",
    "cards": {
      "gmv": "Volume d’affaires marketplace",
      "orders": "Commandes",
      "activeSellers": "Vendeurs actifs",
      "clients": "Clients",
      "activeProducts": "Produits actifs",
      "commissions": "Commissions acquises",
      "openDisputes": "Litiges ouverts"
    }
  }
}
</i18n>

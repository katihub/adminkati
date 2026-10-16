<script setup lang="ts">
import type { MarketplaceCommandCenter } from "@/types/api/statistiques"

const { marketplace } = defineProps<{ marketplace: MarketplaceCommandCenter }>()
const { locale, t } = useI18n({ useScope: "local" })

const metrics = computed(() => [
  { id: "gmv", label: t("metrics.gmv"), icon: "ph:coins", metric: marketplace.kpis.gmv },
  { id: "orders", label: t("metrics.orders"), icon: "ph:shopping-cart-simple", metric: marketplace.kpis.orders },
  {
    id: "activeSellers",
    label: t("metrics.activeSellers"),
    icon: "ph:storefront",
    metric: marketplace.kpis.activeSellers,
  },
  {
    id: "activeProducts",
    label: t("metrics.activeProducts"),
    icon: "ph:cube",
    metric: marketplace.kpis.activeProducts,
  },
  { id: "commissions", label: t("metrics.commissions"), icon: "ph:wallet", metric: marketplace.kpis.commissions },
  {
    id: "openDisputes",
    label: t("metrics.openDisputes"),
    icon: "ph:warning-octagon",
    metric: marketplace.kpis.openDisputes,
  },
])

function formatValue(value: number, isCurrency?: boolean) {
  const formatted = new Intl.NumberFormat(locale.value).format(value)
  return isCurrency ? `${formatted} FCFA` : formatted
}
</script>

<template>
  <section class="rounded-2xl border border-border bg-card" data-testid="direction-health">
    <header class="border-b border-border px-5 py-4">
      <h2 class="font-heading text-lg font-bold text-brand-navy dark:text-foreground">{{ t("title") }}</h2>
    </header>
    <div class="divide-y divide-border">
      <div v-for="item in metrics" :key="item.id" class="flex items-center gap-3 px-5 py-3">
        <Icon :name="item.icon" size="21" class="shrink-0 text-brand-orange" aria-hidden="true" />
        <div class="min-w-0 flex-1">
          <p class="text-xs font-medium text-muted-foreground">{{ item.label }}</p>
          <p class="mt-0.5 font-heading text-lg font-bold tabular-nums text-brand-navy dark:text-foreground">
            {{ formatValue(item.metric.valeur, item.metric.isCurrency) }}
          </p>
        </div>
        <StatsDeltaPill :courant="item.metric.valeur" :precedent="item.metric.precedent" />
      </div>
    </div>
  </section>
</template>

<i18n lang="json">
{
  "en": {
    "title": "Marketplace health",
    "metrics": {
      "gmv": "Marketplace GMV",
      "orders": "Orders",
      "activeSellers": "Active sellers",
      "activeProducts": "Active products",
      "commissions": "Acquired commissions",
      "openDisputes": "Open disputes"
    }
  },
  "fr": {
    "title": "Santé de la marketplace",
    "metrics": {
      "gmv": "Volume d’affaires",
      "orders": "Commandes",
      "activeSellers": "Vendeurs actifs",
      "activeProducts": "Produits actifs",
      "commissions": "Commissions acquises",
      "openDisputes": "Litiges ouverts"
    }
  }
}
</i18n>

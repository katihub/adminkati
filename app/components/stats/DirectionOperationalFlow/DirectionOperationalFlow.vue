<script setup lang="ts">
import type { MarketplaceCommandCenter } from "@/types/api/statistiques"

const { marketplace } = defineProps<{ marketplace: MarketplaceCommandCenter }>()
const { locale, t } = useI18n({ useScope: "local" })
const ids = ["submitted", "preparing", "shipping", "delivered"] as const
type OperationalStage = (typeof ids)[number]
const stageLabels = computed<Record<OperationalStage, string>>(() => ({
  submitted: t("stages.submitted"),
  preparing: t("stages.preparing"),
  shipping: t("stages.shipping"),
  delivered: t("stages.delivered"),
}))
const stages = computed(() =>
  ids.map(id => ({ id, count: marketplace.orderStatuses.find(status => status.id === id)?.count ?? 0 })),
)
</script>

<template>
  <section class="rounded-2xl border border-border bg-card p-5 sm:p-6" data-testid="direction-operational-flow">
    <h2 class="font-heading text-lg font-bold text-brand-navy dark:text-foreground">{{ t("title") }}</h2>
    <p class="mt-1 text-sm text-muted-foreground">{{ t("subtitle") }}</p>
    <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div v-for="(stage, index) in stages" :key="stage.id" class="relative rounded-xl bg-muted/60 p-4">
        <span class="text-xs font-semibold text-muted-foreground">{{ stageLabels[stage.id] }}</span>
        <strong class="mt-2 block font-heading text-2xl tabular-nums text-brand-navy dark:text-foreground">{{
          new Intl.NumberFormat(locale).format(stage.count)
        }}</strong>
        <Icon
          v-if="index < stages.length - 1"
          name="ph:arrow-right"
          class="absolute right-3 top-3 text-brand-orange"
          aria-hidden="true"
        />
      </div>
    </div>
  </section>
</template>

<i18n lang="json">
{
  "en": {
    "title": "Operational flow",
    "subtitle": "From order submission to delivery.",
    "stages": { "submitted": "Submitted", "preparing": "Preparing", "shipping": "Shipping", "delivered": "Delivered" }
  },
  "fr": {
    "title": "Flux opérationnel",
    "subtitle": "De la commande à la livraison.",
    "stages": {
      "submitted": "Soumises",
      "preparing": "En préparation",
      "shipping": "En livraison",
      "delivered": "Livrées"
    }
  }
}
</i18n>

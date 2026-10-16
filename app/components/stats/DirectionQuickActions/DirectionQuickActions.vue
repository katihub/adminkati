<script setup lang="ts">
import type { DirectionQueue } from "@/utils/direction-cockpit"

defineProps<{ queues: DirectionQueue[] }>()
const { t } = useI18n({ useScope: "local" })
const queueLabels = computed<Record<DirectionQueue["id"], string>>(() => ({
  "orders-review": t("queues.orders-review"),
  "seller-approvals": t("queues.seller-approvals"),
  "product-moderation": t("queues.product-moderation"),
  "offer-moderation": t("queues.offer-moderation"),
  "open-disputes": t("queues.open-disputes"),
  "cash-disputes": t("queues.cash-disputes"),
}))
</script>

<template>
  <section
    v-if="queues.length > 0"
    class="rounded-2xl border border-border bg-card p-5 sm:p-6"
    data-testid="direction-quick-actions"
  >
    <h2 class="font-heading text-lg font-bold text-brand-navy dark:text-foreground">{{ t("title") }}</h2>
    <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <NuxtLinkLocale
        v-for="queue in queues"
        :key="queue.id"
        :to="queue.to"
        class="flex min-h-14 items-center gap-3 rounded-xl border border-border px-4 transition-colors hover:border-brand-orange hover:bg-brand-orange/5"
      >
        <Icon :name="queue.icon" size="20" class="text-brand-orange" aria-hidden="true" />
        <span class="min-w-0 flex-1 text-sm font-semibold">{{ queueLabels[queue.id] }}</span>
        <strong class="tabular-nums text-brand-navy dark:text-foreground">{{ queue.count }}</strong>
      </NuxtLinkLocale>
    </div>
  </section>
</template>

<i18n lang="json">
{
  "en": {
    "title": "Quick actions",
    "queues": {
      "orders-review": "Review orders",
      "seller-approvals": "Approve sellers",
      "product-moderation": "Moderate products",
      "offer-moderation": "Moderate offers",
      "open-disputes": "Handle disputes",
      "cash-disputes": "Review cash"
    }
  },
  "fr": {
    "title": "Actions rapides",
    "queues": {
      "orders-review": "Examiner les commandes",
      "seller-approvals": "Valider les vendeurs",
      "product-moderation": "Modérer les produits",
      "offer-moderation": "Modérer les offres",
      "open-disputes": "Traiter les litiges",
      "cash-disputes": "Contrôler les caisses"
    }
  }
}
</i18n>

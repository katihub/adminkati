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
const priorityLabels = computed<Record<DirectionQueue["priority"], string>>(() => ({
  critical: t("priority.critical"),
  high: t("priority.high"),
}))
const ownerLabels = computed<Record<DirectionQueue["owner"], string>>(() => ({
  commerce: t("owners.commerce"),
  sellers: t("owners.sellers"),
  catalogue: t("owners.catalogue"),
  clients: t("owners.clients"),
  finance: t("owners.finance"),
}))
const targetLabels = computed<Record<DirectionQueue["target"], string>>(() => ({
  "4-business-hours": t("targets.4-business-hours"),
  "2-business-days": t("targets.2-business-days"),
  "1-business-day": t("targets.1-business-day"),
  "72-hours": t("targets.72-hours"),
}))
</script>

<template>
  <section class="overflow-hidden rounded-2xl border border-border bg-card" data-testid="direction-priority-queues">
    <header class="border-b border-border px-5 py-4 sm:px-6">
      <h2 class="font-heading text-lg font-bold text-brand-navy dark:text-foreground">{{ t("title") }}</h2>
      <p class="mt-1 text-sm text-muted-foreground">{{ t("subtitle") }}</p>
    </header>

    <p
      v-if="queues.length === 0"
      class="px-5 py-10 text-center text-sm text-muted-foreground"
      data-testid="direction-priority-queues-empty"
    >
      {{ t("empty") }}
    </p>
    <div v-else class="divide-y divide-border">
      <div
        class="hidden grid-cols-[minmax(12rem,1.5fr)_5rem_7rem_8rem_8rem_auto] gap-3 bg-muted/60 px-5 py-2 text-xs font-semibold text-muted-foreground lg:grid"
      >
        <span>{{ t("columns.queue") }}</span>
        <span>{{ t("columns.volume") }}</span>
        <span>{{ t("columns.priority") }}</span>
        <span>{{ t("columns.owner") }}</span>
        <span>{{ t("columns.target") }}</span>
        <span class="sr-only">{{ t("columns.action") }}</span>
      </div>
      <article
        v-for="queue in queues"
        :key="queue.id"
        class="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(12rem,1.5fr)_5rem_7rem_8rem_8rem_auto] lg:items-center"
        :data-testid="`direction-queue-${queue.id}`"
      >
        <div class="flex min-w-0 items-center gap-3">
          <span
            class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange"
          >
            <Icon :name="queue.icon" size="20" aria-hidden="true" />
          </span>
          <span class="font-semibold text-foreground">{{ queueLabels[queue.id] }}</span>
        </div>
        <strong class="text-xl tabular-nums text-brand-navy dark:text-foreground">{{ queue.count }}</strong>
        <span
          class="w-fit rounded-lg px-2.5 py-1 text-xs font-bold"
          :class="
            queue.priority === 'critical'
              ? 'bg-destructive/10 text-destructive'
              : 'bg-warning/15 text-warning-foreground'
          "
        >
          {{ priorityLabels[queue.priority] }}
        </span>
        <span class="text-sm text-muted-foreground">{{ ownerLabels[queue.owner] }}</span>
        <span class="text-sm font-medium">{{ targetLabels[queue.target] }}</span>
        <NuxtLinkLocale
          :to="queue.to"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-orange px-4 text-sm font-bold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {{ t("open") }} <Icon name="ph:arrow-right" size="16" aria-hidden="true" />
        </NuxtLinkLocale>
      </article>
    </div>
  </section>
</template>

<i18n lang="json">
{
  "en": {
    "title": "Priority work",
    "subtitle": "Queues that need a decision or action.",
    "empty": "No priority work",
    "open": "Open",
    "columns": {
      "queue": "Queue",
      "volume": "Volume",
      "priority": "Priority",
      "owner": "Owner",
      "target": "Target SLA",
      "action": "Action"
    },
    "queues": {
      "orders-review": "Orders to review",
      "seller-approvals": "Sellers to approve",
      "product-moderation": "Products to moderate",
      "offer-moderation": "Offers to moderate",
      "open-disputes": "Open disputes",
      "cash-disputes": "Cash discrepancies"
    },
    "priority": { "critical": "Critical", "high": "High" },
    "owners": {
      "commerce": "Commerce",
      "sellers": "Sellers",
      "catalogue": "Catalogue",
      "clients": "Clients",
      "finance": "Finance"
    },
    "targets": {
      "4-business-hours": "4 business hours",
      "2-business-days": "2 business days",
      "1-business-day": "1 business day",
      "72-hours": "72 hours"
    }
  },
  "fr": {
    "title": "Travaux prioritaires",
    "subtitle": "Les files qui nécessitent une décision ou une action.",
    "empty": "Aucun travail prioritaire",
    "open": "Ouvrir",
    "columns": {
      "queue": "File",
      "volume": "Volume",
      "priority": "Priorité",
      "owner": "Responsable",
      "target": "SLA cible",
      "action": "Action"
    },
    "queues": {
      "orders-review": "Commandes à examiner",
      "seller-approvals": "Vendeurs à valider",
      "product-moderation": "Produits à modérer",
      "offer-moderation": "Offres à modérer",
      "open-disputes": "Litiges ouverts",
      "cash-disputes": "Écarts de caisse"
    },
    "priority": { "critical": "Critique", "high": "Élevée" },
    "owners": {
      "commerce": "Commerce",
      "sellers": "Vendeurs",
      "catalogue": "Catalogue",
      "clients": "Clients",
      "finance": "Finance"
    },
    "targets": {
      "4-business-hours": "4 h ouvrées",
      "2-business-days": "2 jours ouvrés",
      "1-business-day": "1 jour ouvré",
      "72-hours": "72 h"
    }
  }
}
</i18n>

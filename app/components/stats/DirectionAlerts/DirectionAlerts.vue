<script setup lang="ts">
import type { MarketplaceCommandCenter } from "@/types/api/statistiques"
import { operationalDestinations } from "@/utils/admin-destinations"

const { alerts } = defineProps<{ alerts: MarketplaceCommandCenter["alerts"] }>()
const { t } = useI18n({ useScope: "local" })

const destination = {
  open_disputes: operationalDestinations.openDisputes,
  cash_disputes: operationalDestinations.cashDisputes,
  pending_approvals: operationalDestinations.sellerApprovals,
} as const
const alertLabels = computed(() => ({
  open_disputes: t("alerts.open_disputes"),
  cash_disputes: t("alerts.cash_disputes"),
  pending_approvals: t("alerts.pending_approvals"),
}))
</script>

<template>
  <section class="rounded-2xl border border-border bg-card p-5 sm:p-6" data-testid="direction-alerts">
    <h2 class="font-heading text-lg font-bold text-brand-navy dark:text-foreground">{{ t("title") }}</h2>
    <p v-if="alerts.length === 0" class="mt-6 text-sm text-muted-foreground" data-testid="direction-alerts-empty">
      {{ t("empty") }}
    </p>
    <div v-else class="mt-4 divide-y divide-border">
      <NuxtLinkLocale
        v-for="alert in alerts"
        :key="alert.id"
        :to="destination[alert.id]"
        class="flex min-h-14 items-center gap-3 py-3 hover:text-brand-orange"
      >
        <Icon
          name="ph:warning-circle"
          size="20"
          :class="
            alert.severity === 'danger'
              ? 'text-destructive'
              : alert.severity === 'warning'
                ? 'text-warning'
                : 'text-info'
          "
          aria-hidden="true"
        />
        <span class="flex-1 text-sm font-semibold">{{ alertLabels[alert.id] }}</span>
        <strong class="tabular-nums">{{ alert.count }}</strong>
        <Icon name="ph:caret-right" size="16" aria-hidden="true" />
      </NuxtLinkLocale>
    </div>
  </section>
</template>

<i18n lang="json">
{
  "en": {
    "title": "Current alerts",
    "empty": "No marketplace alert",
    "alerts": {
      "open_disputes": "Open disputes",
      "cash_disputes": "Cash closing discrepancies",
      "pending_approvals": "Pending approvals"
    }
  },
  "fr": {
    "title": "Alertes actuelles",
    "empty": "Aucune alerte marketplace",
    "alerts": {
      "open_disputes": "Litiges ouverts",
      "cash_disputes": "Écarts de clôture de caisse",
      "pending_approvals": "Approbations en attente"
    }
  }
}
</i18n>

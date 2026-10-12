<script setup lang="ts">
// fallow-ignore-file complexity -- declarative dashboard composition of status, approval, alert and seller blocks
import type { MarketplaceAlertId, MarketplaceCommandCenter, MarketplaceOrderStatus } from "@/types/api/statistiques"

const { marketplace } = defineProps<{ marketplace: MarketplaceCommandCenter }>()
const { locale, t } = useI18n({ useScope: "local" })

const maximumStatus = computed(() => Math.max(1, ...marketplace.orderStatuses.map(status => status.count)))
const approvalTotal = computed(
  () => marketplace.approvals.sellers + marketplace.approvals.products + marketplace.approvals.offers,
)
const statusColor: Record<MarketplaceOrderStatus, string> = {
  submitted: "bg-blue-500",
  preparing: "bg-amber-500",
  shipping: "bg-violet-500",
  delivered: "bg-emerald-500",
  cancelled: "bg-red-500",
  attention: "bg-orange-500",
}
const alertIcon: Record<MarketplaceAlertId, string> = {
  open_disputes: "ph:warning-octagon",
  cash_disputes: "ph:cash-register",
  pending_approvals: "ph:seal-check",
}
const statusLabels = computed<Record<MarketplaceOrderStatus, string>>(() => ({
  submitted: t("status.submitted"),
  preparing: t("status.preparing"),
  shipping: t("status.shipping"),
  delivered: t("status.delivered"),
  cancelled: t("status.cancelled"),
  attention: t("status.attention"),
}))
const approvals = computed(() => [
  {
    id: "sellers",
    label: t("approvals.sellers"),
    value: marketplace.approvals.sellers,
    to: "/operations?tab=seller-onboarding",
    icon: "ph:storefront",
  },
  {
    id: "products",
    label: t("approvals.products"),
    value: marketplace.approvals.products,
    to: "/operations?tab=marketplace-catalogue",
    icon: "ph:cube",
  },
  {
    id: "offers",
    label: t("approvals.offers"),
    value: marketplace.approvals.offers,
    to: "/operations?tab=marketplace-catalogue",
    icon: "ph:tag",
  },
])
const alertLabels = computed<Record<MarketplaceAlertId, string>>(() => ({
  open_disputes: t("alerts.open_disputes"),
  cash_disputes: t("alerts.cash_disputes"),
  pending_approvals: t("alerts.pending_approvals"),
}))

function formatNumber(value: number) {
  return new Intl.NumberFormat(locale.value).format(value)
}
</script>

<template>
  <div class="grid gap-4 xl:grid-cols-12">
    <StatsBlockShell :title="t('status.title')" class="xl:col-span-5">
      <div class="space-y-4">
        <div
          v-for="status in marketplace.orderStatuses"
          :key="status.id"
          class="grid grid-cols-[8rem_1fr_auto] items-center gap-3 text-sm"
        >
          <span class="font-medium">{{ statusLabels[status.id] }}</span>
          <div class="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              class="h-full rounded-full"
              :class="statusColor[status.id]"
              :style="{ width: `${(status.count / maximumStatus) * 100}%` }"
            />
          </div>
          <strong class="tabular-nums">{{ formatNumber(status.count) }}</strong>
        </div>
      </div>
      <template #action>
        <NuxtLinkLocale to="/orders" class="text-sm font-bold text-primary hover:underline">{{
          t("viewOrders")
        }}</NuxtLinkLocale>
      </template>
    </StatsBlockShell>

    <StatsBlockShell :title="t('approvals.title')" :empty="approvalTotal === 0" class="xl:col-span-3">
      <div class="space-y-2">
        <NuxtLinkLocale
          v-for="approval in approvals"
          :key="approval.id"
          :to="approval.to"
          class="flex min-h-12 items-center gap-3 rounded-xl border border-border/70 px-3 transition-colors hover:bg-muted"
        >
          <Icon :name="approval.icon" size="20" class="text-primary" aria-hidden="true" />
          <span class="flex-1 text-sm font-medium">{{ approval.label }}</span>
          <strong class="tabular-nums">{{ approval.value }}</strong>
        </NuxtLinkLocale>
      </div>
    </StatsBlockShell>

    <StatsBlockShell :title="t('alerts.title')" class="xl:col-span-4">
      <template #default>
        <p v-if="marketplace.alerts.length === 0" class="text-sm text-muted-foreground">{{ t("alerts.empty") }}</p>
        <div v-else class="space-y-2">
          <NuxtLinkLocale
            v-for="alert in marketplace.alerts"
            :key="alert.id"
            :to="
              alert.id === 'cash_disputes'
                ? '/operations'
                : alert.id === 'open_disputes'
                  ? '/operations?tab=marketplace-disputes'
                  : '/operations?tab=seller-onboarding'
            "
            class="flex min-h-12 items-center gap-3 rounded-xl border border-border/70 px-3 transition-colors hover:bg-muted"
          >
            <Icon
              :name="alertIcon[alert.id]"
              size="20"
              aria-hidden="true"
              :class="
                alert.severity === 'danger'
                  ? 'text-red-600'
                  : alert.severity === 'warning'
                    ? 'text-amber-600'
                    : 'text-blue-600'
              "
            />
            <span class="flex-1 text-sm font-medium">{{ alertLabels[alert.id] }}</span>
            <strong class="tabular-nums">{{ alert.count }}</strong>
          </NuxtLinkLocale>
        </div>
      </template>
    </StatsBlockShell>

    <StatsBlockShell :title="t('sellers.title')" class="xl:col-span-8">
      <template #default>
        <p v-if="marketplace.topSellers.length === 0" class="text-sm text-muted-foreground">{{ t("sellers.empty") }}</p>
        <ol v-else class="divide-y divide-border/70">
          <li
            v-for="(seller, index) in marketplace.topSellers"
            :key="seller.boutiqueId"
            class="grid grid-cols-[2rem_1fr_auto] items-center gap-3 py-3 first:pt-0 last:pb-0"
          >
            <span
              class="flex size-7 items-center justify-center rounded-lg bg-orange-500/15 text-xs font-black text-orange-600"
              >{{ index + 1 }}</span
            >
            <div class="min-w-0">
              <p class="truncate font-semibold">{{ seller.name }}</p>
              <p class="text-xs text-muted-foreground">{{ t("sellers.orders", { count: seller.orders }) }}</p>
            </div>
            <StatsAmount :valeur="seller.revenue" class="font-bold" />
          </li>
        </ol>
      </template>
    </StatsBlockShell>

    <StatsBlockShell :title="t('quick.title')" class="xl:col-span-4">
      <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        <NuxtLinkLocale
          to="/operations?tab=seller-onboarding"
          class="flex min-h-12 items-center gap-3 rounded-xl bg-emerald-500/10 px-4 font-semibold text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
        >
          <Icon name="ph:storefront" size="20" aria-hidden="true" />{{ t("quick.sellers") }}
        </NuxtLinkLocale>
        <NuxtLinkLocale
          to="/operations?tab=marketplace-disputes"
          class="flex min-h-12 items-center gap-3 rounded-xl bg-blue-500/10 px-4 font-semibold text-blue-700 hover:bg-blue-500/15 dark:text-blue-300"
        >
          <Icon name="ph:scales" size="20" aria-hidden="true" />{{ t("quick.disputes") }}
        </NuxtLinkLocale>
        <NuxtLinkLocale
          to="/operations"
          class="flex min-h-12 items-center gap-3 rounded-xl bg-amber-500/10 px-4 font-semibold text-amber-700 hover:bg-amber-500/15 dark:text-amber-300"
        >
          <Icon name="ph:cash-register" size="20" aria-hidden="true" />{{ t("quick.cash") }}
        </NuxtLinkLocale>
      </div>
    </StatsBlockShell>
  </div>
</template>

<i18n lang="json">
{
  "en": {
    "viewOrders": "View orders",
    "status": {
      "title": "Marketplace order status",
      "submitted": "Submitted",
      "preparing": "Preparing",
      "shipping": "Shipping",
      "delivered": "Delivered",
      "cancelled": "Cancelled",
      "attention": "Needs attention"
    },
    "approvals": { "title": "Pending approvals", "sellers": "Sellers", "products": "Products", "offers": "Offers" },
    "alerts": {
      "title": "System alerts",
      "empty": "No marketplace alert",
      "open_disputes": "Open disputes",
      "cash_disputes": "Cash closings in dispute",
      "pending_approvals": "Pending approvals"
    },
    "sellers": {
      "title": "Top sellers by revenue",
      "empty": "No seller activity for this period",
      "orders": "{count} orders"
    },
    "quick": {
      "title": "Quick actions",
      "sellers": "Review sellers",
      "disputes": "Resolve disputes",
      "cash": "Open cash operations"
    }
  },
  "fr": {
    "viewOrders": "Voir les commandes",
    "status": {
      "title": "Statut des commandes marketplace",
      "submitted": "Soumises",
      "preparing": "En préparation",
      "shipping": "En livraison",
      "delivered": "Livrées",
      "cancelled": "Annulées",
      "attention": "À examiner"
    },
    "approvals": {
      "title": "Approbations en attente",
      "sellers": "Vendeurs",
      "products": "Produits",
      "offers": "Offres"
    },
    "alerts": {
      "title": "Alertes système",
      "empty": "Aucune alerte marketplace",
      "open_disputes": "Litiges ouverts",
      "cash_disputes": "Clôtures de caisse en litige",
      "pending_approvals": "Approbations en attente"
    },
    "sellers": {
      "title": "Meilleurs vendeurs par revenu",
      "empty": "Aucune activité vendeur sur cette période",
      "orders": "{count} commandes"
    },
    "quick": {
      "title": "Actions rapides",
      "sellers": "Valider les vendeurs",
      "disputes": "Résoudre les litiges",
      "cash": "Ouvrir les opérations de caisse"
    }
  }
}
</i18n>

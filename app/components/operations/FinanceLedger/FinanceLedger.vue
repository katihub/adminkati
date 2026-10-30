<script setup lang="ts">
import type { SellerFinanceSummary } from "@/types/api/seller-finance"
import { useQuery } from "@tanstack/vue-query"
import { computed } from "vue"
import { apiQueryKeys } from "@/utils/api-query-keys"
const { shopId } = defineProps<{ shopId: string }>()
const { t, locale } = useI18n({ useScope: "local" })
const api = useApiFetch()
const query = useQuery<SellerFinanceSummary>({
  queryKey: computed(() => [...apiQueryKeys.marketplaceOperations.all, "finance", shopId]),
  queryFn: () => api(`/marketplace/finance/administration/boutiques/${encodeURIComponent(shopId)}`),
})
if (import.meta.server) await query.suspense().catch(() => undefined) // Render the query's error card on failure.
const money = computed(
  () => new Intl.NumberFormat(locale.value, { style: "currency", currency: "XAF", maximumFractionDigits: 0 }),
)
</script>
<template>
  <section class="space-y-4 rounded-2xl border border-border bg-card p-5" data-testid="finance-ledger">
    <ApiErrorCard v-if="query.error.value" :error="query.error.value" @retry="query.refetch()" />
    <p v-else-if="query.isPending.value" class="text-sm text-muted-foreground">{{ t("loading") }}</p>
    <template v-else-if="query.data.value">
      <h3 class="font-heading text-lg font-semibold">{{ query.data.value.boutique.nom }}</h3>
      <dl class="grid gap-3 sm:grid-cols-3">
        <div class="rounded-xl bg-muted p-4">
          <dt class="text-sm text-muted-foreground">{{ t("available") }}</dt>
          <dd class="text-xl font-bold">{{ money.format(query.data.value.soldes.disponibleFcfa) }}</dd>
        </div>
        <div class="rounded-xl bg-muted p-4">
          <dt class="text-sm text-muted-foreground">{{ t("held") }}</dt>
          <dd class="text-xl font-bold">{{ money.format(query.data.value.soldes.geleFcfa) }}</dd>
        </div>
        <div class="rounded-xl bg-muted p-4">
          <dt class="text-sm text-muted-foreground">{{ t("destinations") }}</dt>
          <dd class="text-xl font-bold">{{ query.data.value.destinations.length }}</dd>
        </div>
      </dl>
      <h4 class="font-semibold">{{ t("ledger") }}</h4>
      <p class="text-xs text-muted-foreground">{{ t("limit") }}</p>
      <p v-if="!query.data.value.transactions.length" class="text-sm text-muted-foreground">{{ t("empty") }}</p>
      <ul v-else class="divide-y divide-border">
        <OperationsFinanceEntry
          v-for="transaction in query.data.value.transactions"
          :key="transaction.id"
          :transaction="transaction"
        />
      </ul>
    </template>
  </section>
</template>
<i18n lang="json">
{
  "fr": {
    "loading": "Chargement du compte…",
    "available": "Disponible vendeur",
    "held": "Fonds gelés",
    "destinations": "Justificatifs bancaires valides",
    "ledger": "Écritures et commissions",
    "limit": "Les 50 dernières transactions de cette boutique. Chaque écriture conserve sa référence et son compte comptable.",
    "empty": "Aucune écriture pour cette boutique.",
    "order": "Sous-commande"
  },
  "en": {
    "loading": "Loading account…",
    "available": "Seller available balance",
    "held": "Held funds",
    "destinations": "Valid bank documents",
    "ledger": "Ledger and commissions",
    "limit": "The latest 50 transactions for this shop. Each entry retains its reference and ledger account.",
    "empty": "No entries for this shop.",
    "order": "Sub-order"
  }
}
</i18n>

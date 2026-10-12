<script setup lang="ts">
// fallow-ignore-file complexity -- declarative finance workspace with withdrawal decision and proof states
import type { SellerWithdrawalFilters, SellerWithdrawalStatus } from "@/types/api/marketplace-operations"
import { computed, reactive, ref } from "vue"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSellerFinanceMutations, useSellerWithdrawals } from "@/composables/useMarketplaceOperations"

const status = ref<SellerWithdrawalStatus | undefined>()
const { t } = useI18n({ useScope: "local" })
const filters = computed<SellerWithdrawalFilters>(() => ({
  ...(status.value ? { statut: status.value } : {}),
  taille: 50,
}))
const query = useSellerWithdrawals(filters)
const { acquireCommissions, decideWithdrawal, recordTransfer } = useSellerFinanceMutations()
const reasons = reactive<Record<string, string>>({})
const proofs = reactive<Record<string, { reference: string; key: string; hash: string; mime: string; size: string }>>(
  {},
)
const statuses: SellerWithdrawalStatus[] = ["demande", "approuve", "refuse", "reverse", "echec", "annule"]
const money = new Intl.NumberFormat("fr-CM", { style: "currency", currency: "XAF", maximumFractionDigits: 0 })
const date = new Intl.DateTimeFormat("fr-CM", { dateStyle: "medium", timeStyle: "short" })

function proof(id: string) {
  return (proofs[id] ??= { reference: "", key: "", hash: "", mime: "application/pdf", size: "" })
}
function reject(id: string) {
  const motif = reasons[id]?.trim()
  if (motif) decideWithdrawal.mutate({ id, decision: "refuse", motif })
}
function transfer(id: string) {
  const value = proof(id)
  if (!value.reference.trim() || !value.key.trim() || !/^[0-9a-f]{64}$/i.test(value.hash) || Number(value.size) < 1)
    return
  recordTransfer.mutate({
    id,
    referenceExterne: value.reference.trim(),
    preuveStockageCle: value.key.trim(),
    preuveEmpreinteSha256: value.hash,
    preuveMime: value.mime,
    preuveTailleOctets: Number(value.size),
  })
}
</script>

<template>
  <div
    class="min-h-0 flex-1 overflow-y-auto border-t border-border bg-muted/60"
    data-testid="operations-seller-finance-workspace"
  >
    <div class="mx-auto max-w-7xl space-y-5 p-4 sm:p-6 lg:p-8">
      <section
        class="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm md:flex-row md:items-center md:justify-between"
      >
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-primary">{{ t("eyebrow") }}</p>
          <h2 class="mt-1 font-heading text-xl font-bold">{{ t("title") }}</h2>
          <p class="mt-1 text-sm text-muted-foreground">{{ t("description") }}</p>
        </div>
        <Button :disabled="acquireCommissions.isPending.value" @click="acquireCommissions.mutate(100)"
          ><Icon name="ph:calculator" class="mr-2" />{{
            acquireCommissions.isPending.value ? t("calculating") : t("acquire")
          }}</Button
        >
      </section>
      <div
        v-if="acquireCommissions.data.value"
        class="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
      >
        {{
          t("acquired", {
            count: acquireCommissions.data.value.acquises,
            amount: money.format(acquireCommissions.data.value.netVendeurTotalFcfa),
          })
        }}
      </div>
      <div class="flex items-center justify-between gap-3">
        <div>
          <h3 class="font-heading text-lg font-semibold">{{ t("withdrawals") }}</h3>
          <p class="text-sm text-muted-foreground">{{ t("count", { count: query.data.value?.total ?? 0 }) }}</p>
        </div>
        <select v-model="status" class="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option :value="undefined">{{ t("allStatuses") }}</option>
          <option v-for="value in statuses" :key="value" :value="value">{{ value.replaceAll("_", " ") }}</option>
        </select>
      </div>
      <ApiErrorCard v-if="query.error.value" :error="query.error.value" @retry="() => void query.refetch()" />
      <div v-else-if="query.isPending.value" class="grid gap-3">
        <div v-for="n in 5" :key="n" class="h-28 animate-pulse rounded-xl bg-card" />
      </div>
      <EmptyStateCard v-else-if="!query.data.value?.elements.length" icon="ph:wallet" :text="t('empty')" />
      <div v-else class="grid gap-4">
        <article
          v-for="item in query.data.value.elements"
          :key="item.id"
          class="rounded-xl border border-border bg-card p-5 shadow-sm"
        >
          <header class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <strong class="text-base">{{ item.reference }}</strong
                ><Badge variant="secondary" class="capitalize">{{ item.statut.replaceAll("_", " ") }}</Badge>
              </div>
              <p class="mt-1 text-sm text-muted-foreground">
                {{ item.boutique.nom }} · {{ item.boutique.vendeur.nomLegal }} ·
                {{ date.format(new Date(item.creeLe)) }}
              </p>
            </div>
            <strong class="text-lg text-primary">{{ money.format(item.montantFcfa) }}</strong>
          </header>
          <dl class="mt-4 grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-3">
            <div>
              <dt class="text-muted-foreground">{{ t("destination") }}</dt>
              <dd class="font-medium">{{ item.documentDestination.type.toUpperCase() }}</dd>
            </div>
            <div>
              <dt class="text-muted-foreground">{{ t("privateKey") }}</dt>
              <dd class="break-all font-mono text-xs">{{ item.documentDestination.stockageCle }}</dd>
            </div>
            <div>
              <dt class="text-muted-foreground">{{ t("bankReference") }}</dt>
              <dd class="font-medium">{{ item.referenceExterne ?? "—" }}</dd>
            </div>
          </dl>
          <div
            v-if="item.statut === 'demande'"
            class="mt-4 grid gap-3 rounded-lg bg-muted p-4 md:grid-cols-[1fr_auto_auto]"
          >
            <Input v-model="reasons[item.id]" :placeholder="t('refusalReason')" /><Button
              variant="outline"
              :disabled="decideWithdrawal.isPending.value"
              @click="reject(item.id)"
              >{{ t("reject") }}</Button
            ><Button
              :disabled="decideWithdrawal.isPending.value"
              @click="decideWithdrawal.mutate({ id: item.id, decision: 'approuve' })"
              >{{ t("approve") }}</Button
            >
          </div>
          <div
            v-if="item.statut === 'approuve'"
            class="mt-4 grid gap-3 rounded-lg bg-muted p-4 md:grid-cols-2 xl:grid-cols-5"
          >
            <Input v-model="proof(item.id).reference" :placeholder="t('transferReference')" /><Input
              v-model="proof(item.id).key"
              :placeholder="t('proofKey')"
            /><Input v-model="proof(item.id).hash" :placeholder="t('proofHash')" /><Input
              v-model="proof(item.id).size"
              type="number"
              min="1"
              :placeholder="t('proofSize')"
            /><Button :disabled="recordTransfer.isPending.value" @click="transfer(item.id)">{{
              t("confirmTransfer")
            }}</Button>
          </div>
          <p v-if="item.motifDecision" class="mt-3 text-sm text-muted-foreground">
            {{ t("decision") }} {{ item.motifDecision }}
          </p>
        </article>
      </div>
    </div>
  </div>
</template>

<i18n lang="json">
{
  "en": {
    "eyebrow": "Seller financial cycle",
    "title": "Commissions, holds and transfers",
    "description": "Acquisition closes eligible sales. Every payout requires a decision and verifiable evidence.",
    "calculating": "Calculating…",
    "acquire": "Acquire commissions",
    "acquired": "{count} commission(s) acquired, {amount} credited to sellers.",
    "withdrawals": "Withdrawal requests",
    "count": "{count} request(s)",
    "allStatuses": "All statuses",
    "empty": "No withdrawal request for this filter.",
    "destination": "Destination",
    "privateKey": "Private key",
    "bankReference": "Bank reference",
    "refusalReason": "Required reason for rejection",
    "reject": "Reject and release",
    "approve": "Approve",
    "transferReference": "Transfer reference",
    "proofKey": "marketplace/reversements/…",
    "proofHash": "SHA-256 (64 characters)",
    "proofSize": "Size in bytes",
    "confirmTransfer": "Confirm transfer",
    "decision": "Decision:"
  },
  "fr": {
    "eyebrow": "Cycle financier vendeur",
    "title": "Commissions, gels et reversements",
    "description": "L’acquisition clôt les ventes éligibles. Chaque sortie exige une décision et une preuve vérifiable.",
    "calculating": "Calcul…",
    "acquire": "Acquérir les commissions",
    "acquired": "{count} commission(s) acquise(s), {amount} crédités aux vendeurs.",
    "withdrawals": "Demandes de retrait",
    "count": "{count} demande(s)",
    "allStatuses": "Tous les statuts",
    "empty": "Aucune demande de retrait dans ce filtre.",
    "destination": "Destination",
    "privateKey": "Clé privée",
    "bankReference": "Référence bancaire",
    "refusalReason": "Motif obligatoire en cas de refus",
    "reject": "Refuser et dégeler",
    "approve": "Approuver",
    "transferReference": "Référence du virement",
    "proofKey": "marketplace/reversements/…",
    "proofHash": "SHA-256 (64 caractères)",
    "proofSize": "Taille octets",
    "confirmTransfer": "Confirmer le reversement",
    "decision": "Décision :"
  }
}
</i18n>

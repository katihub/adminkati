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
const { acquireCommissions, decideWithdrawal, initiateTransfer, reconcileTransfer, uploadTransferProof } =
  useSellerFinanceMutations()
const reasons = reactive<Record<string, string>>({})
const phones = reactive<Record<string, string>>({})
const proofFiles = reactive<Record<string, File | undefined>>({})
const statuses: SellerWithdrawalStatus[] = ["demande", "approuve", "refuse", "reverse", "echec", "annule"]
const money = new Intl.NumberFormat("fr-CM", { style: "currency", currency: "XAF", maximumFractionDigits: 0 })
const date = new Intl.DateTimeFormat("fr-CM", { dateStyle: "medium", timeStyle: "short" })

function reject(id: string) {
  const motif = reasons[id]?.trim()
  if (motif) decideWithdrawal.mutate({ id, decision: "refuse", motif })
}
function transferLabel(payoutStatus: string | undefined) {
  return payoutStatus === "echec" ? t("retryTransfer") : t("startTransfer")
}

function transfer(id: string) {
  const telephone = phones[id]?.trim()
  if (telephone) initiateTransfer.mutate({ id, telephone })
}
function selectProof(id: string, event: Event) {
  proofFiles[id] = (event.target as HTMLInputElement).files?.[0]
}
function uploadProof(id: string) {
  const file = proofFiles[id]
  if (file) uploadTransferProof.mutate({ id, file })
}
function proofUrl(withdrawalId: string, proofId: string) {
  return `/api/v1/marketplace/finance/retraits/${encodeURIComponent(withdrawalId)}/pieces/${encodeURIComponent(proofId)}`
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
              <dt class="text-muted-foreground">{{ t("payoutStatus") }}</dt>
              <dd class="font-medium">{{ item.reversementPsp?.statut.replaceAll("_", " ") ?? t("notStarted") }}</dd>
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
          <div v-if="item.statut === 'approuve'" class="mt-4 space-y-3 rounded-lg bg-muted p-4">
            <div
              v-if="
                !item.reversementPsp ||
                item.reversementPsp.statut === 'echec' ||
                item.reversementPsp.statut === 'prepare'
              "
              class="grid gap-3 md:grid-cols-[1fr_auto]"
            >
              <Input v-model="phones[item.id]" inputmode="tel" :placeholder="t('payoutPhone')" />
              <Button
                :disabled="initiateTransfer.isPending.value || !phones[item.id]?.trim()"
                @click="transfer(item.id)"
              >
                {{ transferLabel(item.reversementPsp?.statut) }}
              </Button>
            </div>
            <div
              v-else-if="
                item.reversementPsp.statut === 'soumission_en_cours' ||
                item.reversementPsp.statut === 'soumis' ||
                item.reversementPsp.statut === 'verification_requise'
              "
              class="flex flex-wrap items-center justify-between gap-3"
            >
              <p class="text-sm text-muted-foreground">
                {{ t("payoutPending", { reference: item.reversementPsp.transId ?? "—" }) }}
              </p>
              <Button
                v-if="item.reversementPsp.transId"
                variant="outline"
                :disabled="reconcileTransfer.isPending.value"
                @click="reconcileTransfer.mutate(item.id)"
              >
                {{ t("reconcile") }}
              </Button>
            </div>
            <p v-if="item.reversementPsp?.raisonEchec" class="text-sm text-destructive">
              {{ item.reversementPsp.raisonEchec }}
            </p>
          </div>
          <div
            v-if="item.statut === 'approuve' || item.statut === 'reverse'"
            class="mt-3 grid gap-3 rounded-lg border border-dashed border-border p-3 md:grid-cols-[1fr_auto]"
          >
            <Input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              @change="selectProof(item.id, $event)"
            />
            <Button
              variant="outline"
              :disabled="uploadTransferProof.isPending.value || !proofFiles[item.id]"
              @click="uploadProof(item.id)"
            >
              {{ t("uploadProof") }}
            </Button>
          </div>
          <div v-if="item.piecesJustificatives?.length" class="mt-3 flex flex-wrap gap-2">
            <a
              v-for="piece in item.piecesJustificatives"
              :key="piece.id"
              :href="proofUrl(item.id, piece.id)"
              class="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
            >
              <Icon name="ph:file-arrow-down" />{{ piece.nomCapture }}
            </a>
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
    "payoutStatus": "Payout status",
    "notStarted": "Not started",
    "bankReference": "Bank reference",
    "refusalReason": "Required reason for rejection",
    "reject": "Reject and release",
    "approve": "Approve",
    "payoutPhone": "Mobile Money number (e.g. 699000001)",
    "startTransfer": "Send payout",
    "retryTransfer": "Retry payout",
    "payoutPending": "Fapshi reference: {reference}",
    "reconcile": "Check with Fapshi",
    "uploadProof": "Upload supporting document",
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
    "payoutStatus": "Statut PSP",
    "notStarted": "Non démarré",
    "bankReference": "Référence bancaire",
    "refusalReason": "Motif obligatoire en cas de refus",
    "reject": "Refuser et dégeler",
    "approve": "Approuver",
    "payoutPhone": "Numéro Mobile Money (ex. 699000001)",
    "startTransfer": "Envoyer le reversement",
    "retryTransfer": "Relancer le reversement",
    "payoutPending": "Référence Fapshi : {reference}",
    "reconcile": "Vérifier chez Fapshi",
    "uploadProof": "Ajouter un justificatif",
    "decision": "Décision :"
  }
}
</i18n>

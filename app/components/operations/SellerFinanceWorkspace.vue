<script setup lang="ts">
// fallow-ignore-file complexity -- declarative finance workspace with withdrawal decision and proof states
import type { SellerWithdrawalFilters, SellerWithdrawalStatus } from "@/types/api/marketplace-operations"
import { computed, reactive, ref, watch } from "vue"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useMarketplaceAdminOffers } from "@/composables/useMarketplaceCatalogueAdmin"
import { useSellerFinanceMutations, useSellerWithdrawals } from "@/composables/useMarketplaceOperations"
import { downloadBlob } from "@/utils/download-file"

const status = ref<SellerWithdrawalStatus | undefined>()
const route = useRoute()
const shopId = ref(typeof route.query.boutique === "string" ? route.query.boutique : "")
const shopsQuery = useMarketplaceAdminOffers({ taille: 1 })
const page = ref(1)
watch([status, shopId], () => {
  page.value = 1
})
watch(
  () => route.query.boutique,
  value => {
    shopId.value = typeof value === "string" ? value : ""
  },
)
const { t } = useI18n({ useScope: "local" })
const filters = computed<SellerWithdrawalFilters>(() => ({
  ...(status.value ? { statut: status.value } : {}),
  ...(shopId.value ? { boutiqueId: shopId.value } : {}),
  page: page.value,
  taille: 20,
}))
const query = useSellerWithdrawals(filters)
if (import.meta.server) {
  await Promise.all([shopsQuery.suspense(), query.suspense()].map(read => read.catch(() => undefined)))
  // Errors remain available in each query and are rendered below.
}
const { acquireCommissions, decideWithdrawal, initiateTransfer, reconcileTransfer, uploadTransferProof } =
  useSellerFinanceMutations()
const reasons = reactive<Record<string, string>>({})
const phones = reactive<Record<string, string>>({})
const proofFiles = reactive<Record<string, File | undefined>>({})
const statuses: SellerWithdrawalStatus[] = ["demande", "approuve", "refuse", "reverse", "echec", "annule"]
const money = new Intl.NumberFormat("fr-CM", { style: "currency", currency: "XAF", maximumFractionDigits: 0 })
const date = new Intl.DateTimeFormat("fr-CM", { dateStyle: "medium", timeStyle: "short" })
const proofError = ref<unknown>(null)
const downloading = ref(false)
const mutationError = computed(
  () =>
    proofError.value ||
    acquireCommissions.error.value ||
    decideWithdrawal.error.value ||
    initiateTransfer.error.value ||
    reconcileTransfer.error.value ||
    uploadTransferProof.error.value,
)
function clearErrors() {
  proofError.value = null
  for (const mutation of [
    acquireCommissions,
    decideWithdrawal,
    initiateTransfer,
    reconcileTransfer,
    uploadTransferProof,
  ])
    mutation.reset()
}
async function downloadProof(withdrawalId: string, proof: { id: string; nomCapture: string }) {
  proofError.value = null
  downloading.value = true
  try {
    downloadBlob(await $fetch<Blob>(proofUrl(withdrawalId, proof.id), { responseType: "blob" }), proof.nomCapture)
  } catch (error) {
    proofError.value = error
  } finally {
    downloading.value = false
  }
}

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
      <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <label class="flex min-w-0 flex-1 flex-col gap-2 text-sm font-semibold"
          >{{ t("shop") }}
          <select v-model="shopId" class="h-10 w-full rounded-md border border-input bg-background px-3 font-normal">
            <option value="">{{ t("allShops") }}</option>
            <option v-for="shop in shopsQuery.data.value?.boutiques ?? []" :key="shop.id" :value="shop.id">
              {{ shop.nom }}
            </option>
          </select>
        </label>
        <NuxtLinkLocale
          :to="{ path: '/operations', query: { tab: 'payment-gateway' } }"
          class="text-sm font-semibold text-primary underline underline-offset-4"
          >{{ t("payments") }}</NuxtLinkLocale
        >
        <NuxtLinkLocale
          :to="{ path: '/operations', query: { tab: 'marketplace-disputes' } }"
          class="text-sm font-semibold text-primary underline underline-offset-4"
          >{{ t("refunds") }}</NuxtLinkLocale
        >
      </div>
      <ApiErrorCard v-if="shopsQuery.error.value" :error="shopsQuery.error.value" @retry="shopsQuery.refetch()" />
      <OperationsFinanceLedger v-if="shopId" :key="shopId" :shop-id="shopId" />
      <ApiErrorCard v-if="mutationError" :error="mutationError" @retry="clearErrors" />
      <div
        v-if="acquireCommissions.data.value"
        class="rounded-lg border border-success/20 bg-success/10 p-4 text-sm text-success"
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
        <select
          v-model="status"
          :aria-label="t('allStatuses')"
          class="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
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
              :disabled="decideWithdrawal.isPending.value || !reasons[item.id]?.trim()"
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
            <button
              v-for="piece in item.piecesJustificatives"
              :key="piece.id"
              type="button"
              :disabled="downloading || !!piece.purgeeLe || (!!piece.statutAnalyse && piece.statutAnalyse !== 'saine')"
              @click="downloadProof(item.id, piece)"
              class="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
              :title="piece.empreinteSha256"
            >
              <Icon name="ph:file-arrow-down" />{{ piece.nomCapture }}
              <span v-if="piece.purgeeLe || (piece.statutAnalyse && piece.statutAnalyse !== 'saine')">
                · {{ t("unavailableProof") }}</span
              >
            </button>
          </div>
          <p v-if="item.motifDecision" class="mt-3 text-sm text-muted-foreground">
            {{ t("decision") }} {{ item.motifDecision }}
          </p>
          <dl class="mt-4 grid gap-2 border-t border-border pt-3 text-xs text-muted-foreground sm:grid-cols-2">
            <div>
              <dt>{{ t("decidedAt") }}</dt>
              <dd>{{ item.decideLe ? date.format(new Date(item.decideLe)) : "—" }}</dd>
            </div>
            <div>
              <dt>{{ t("paidAt") }}</dt>
              <dd>{{ item.reverseLe ? date.format(new Date(item.reverseLe)) : "—" }}</dd>
            </div>
            <div v-if="item.reversementPsp">
              <dt>{{ t("attempts") }}</dt>
              <dd>{{ item.reversementPsp.tentatives }} · {{ item.reversementPsp.transId ?? "—" }}</dd>
            </div>
            <div v-if="item.reversementPsp">
              <dt>{{ t("checkedAt") }}</dt>
              <dd>{{ item.reversementPsp.verifieLe ? date.format(new Date(item.reversementPsp.verifieLe)) : "—" }}</dd>
            </div>
          </dl>
        </article>
      </div>
      <nav
        v-if="query.data.value && query.data.value.total > query.data.value.taille"
        class="flex items-center justify-center gap-3"
      >
        <Button variant="outline" :disabled="page <= 1 || query.isFetching.value" @click="page--">{{
          t("previous")
        }}</Button
        ><span class="text-sm">{{ page }} / {{ Math.ceil(query.data.value.total / query.data.value.taille) }}</span
        ><Button
          variant="outline"
          :disabled="page * query.data.value.taille >= query.data.value.total || query.isFetching.value"
          @click="page++"
          >{{ t("next") }}</Button
        >
      </nav>
    </div>
  </div>
</template>

<i18n lang="json">
{
  "en": {
    "unavailableProof": "Unavailable (purged or security scan pending)",
    "shop": "Shop account",
    "allShops": "All shops — select a shop to view its ledger",
    "payments": "Payments and PSP reconciliation",
    "refunds": "Returns and refunds",
    "decidedAt": "Decision date",
    "paidAt": "Payout date",
    "attempts": "PSP attempts and reference",
    "checkedAt": "Last PSP check",
    "previous": "Previous",
    "next": "Next",
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
    "payoutPending": "Kratospay reference: {reference}",
    "reconcile": "Check with Kratospay",
    "uploadProof": "Upload supporting document",
    "decision": "Decision:"
  },
  "fr": {
    "unavailableProof": "Indisponible (purgée ou analyse de sécurité non validée)",
    "shop": "Compte boutique",
    "allShops": "Toutes les boutiques — choisir pour consulter le registre",
    "payments": "Paiements et rapprochements PSP",
    "refunds": "Retours et remboursements",
    "decidedAt": "Date de décision",
    "paidAt": "Date de reversement",
    "attempts": "Tentatives et référence PSP",
    "checkedAt": "Dernière vérification PSP",
    "previous": "Précédent",
    "next": "Suivant",
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
    "payoutPending": "Référence Kratospay : {reference}",
    "reconcile": "Vérifier chez Kratospay",
    "uploadProof": "Ajouter un justificatif",
    "decision": "Décision :"
  }
}
</i18n>

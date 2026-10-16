<script setup lang="ts">
// fallow-ignore-file complexity -- declarative dispute workspace with explicit workflow states
import type { MarketplaceReturnFilters, MarketplaceReturnStatus } from "@/types/api/marketplace-operations"
import { computed, ref, watch } from "vue"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  useMarketplaceReturn,
  useMarketplaceReturnMutations,
  useMarketplaceReturns,
} from "@/composables/useMarketplaceOperations"
import { downloadBlob } from "@/utils/download-file"
import { routeQueryString } from "@/utils/route-query"

const route = useRoute()
const { locale, t } = useI18n()
const search = ref("")
const status = ref<MarketplaceReturnStatus | undefined>()
const reimbursementPhone = ref("")
const evidenceError = ref(false)
const workflowDecision = ref<"autorise" | "refuse">("autorise")
const workflowReason = ref("")
const workflowResponsibility = ref<"client" | "vendeur" | "agent_livraison" | "katihub" | "indetermine">("indetermine")
const returnFees = ref(0)
const replyText = ref("")
const explicitId = computed(() => routeQueryString(route.query.retour) ?? null)
const filters = computed<MarketplaceReturnFilters>(() => ({
  ...(search.value.trim() ? { q: search.value.trim() } : {}),
  ...(status.value ? { statut: status.value } : {}),
  taille: 40,
}))
const listQuery = useMarketplaceReturns(filters)
const effectiveId = computed(() => explicitId.value ?? listQuery.data.value?.elements[0]?.id ?? null)
const detailQuery = useMarketplaceReturn(effectiveId)
const { reimburse, reconcileRefund, receive, decide, arbitrate, reply } = useMarketplaceReturnMutations()

watch(effectiveId, () => {
  reimbursementPhone.value = ""
  workflowReason.value = ""
  replyText.value = ""
})

function submitWorkflowDecision() {
  const detail = detailQuery.data.value
  const motif = workflowReason.value.trim()
  if (!detail || motif.length < 10) return
  if (detail.capacites.arbitrer) arbitrate.mutate({ id: detail.id, decision: workflowDecision.value, motif })
  else if (detail.capacites.decider)
    decide.mutate({
      id: detail.id,
      decision: workflowDecision.value,
      motif,
      responsable: workflowResponsibility.value,
      fraisRetourFcfa: returnFees.value,
    })
}

function sendReply() {
  const detail = detailQuery.data.value
  const contenu = replyText.value.trim()
  if (!detail || contenu.length < 2) return
  reply.mutate(
    { id: detail.id, demandId: detail.demande.id, contenu },
    {
      onSuccess: () => {
        replyText.value = ""
      },
    },
  )
}

const dateFormatter = computed(
  () => new Intl.DateTimeFormat(locale.value, { day: "2-digit", month: "short", year: "numeric" }),
)
const dateTimeFormatter = computed(
  () =>
    new Intl.DateTimeFormat(locale.value, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
)
const moneyFormatter = computed(
  () => new Intl.NumberFormat(locale.value, { style: "currency", currency: "XAF", maximumFractionDigits: 0 }),
)

const statusTone: Record<MarketplaceReturnStatus, string> = {
  demande: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  autorise: "bg-success/10 text-success",
  refuse: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  en_transit: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  recu: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  rembourse: "bg-success/10 text-success",
}

function selectReturn(id: string) {
  void navigateTo({ path: route.path, query: { tab: "marketplace-disputes", retour: id } })
}

function clearSelection() {
  void navigateTo({ path: route.path, query: { tab: "marketplace-disputes" } })
}

function reimburseReturn() {
  const id = effectiveId.value
  if (!id) return
  const telephone = reimbursementPhone.value.replace(/\s/g, "")
  reimburse.mutate({ id, ...(telephone ? { telephone } : {}) })
}

const session = useCachedSession()
const isDirection = computed(() => session.value?.roles.includes("direction") ?? false)
const exporting = ref(false)
const exportError = ref(false)

/** The server refuses these; the button says why instead of failing on click. */
function evidenceBlock(piece: { statutAnalyse?: string; purgeeLe?: string | null }) {
  if (piece.purgeeLe) return "purged"
  if (piece.statutAnalyse === "infectee") return "infected"
  if (piece.statutAnalyse === "en_quarantaine") return "quarantine"
  return null
}

async function exportCase(demandId: string, reference: string) {
  exporting.value = true
  exportError.value = false
  try {
    const blob = await $fetch<Blob>(`/api/v1/marketplace/demandes-client/${encodeURIComponent(demandId)}/export`, {
      responseType: "blob",
    })
    downloadBlob(blob, `dossier-${reference}.zip`)
  } catch {
    exportError.value = true
  } finally {
    exporting.value = false
  }
}

async function downloadEvidence(demandId: string, piece: { id: string; nomCapture: string }) {
  evidenceError.value = false
  try {
    const blob = await $fetch<Blob>(
      `/api/v1/marketplace/demandes-client/${encodeURIComponent(demandId)}/pieces/${encodeURIComponent(piece.id)}`,
      { responseType: "blob" },
    )
    downloadBlob(blob, piece.nomCapture)
  } catch {
    evidenceError.value = true
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col" data-testid="operations-marketplace-disputes-workspace">
    <div class="shrink-0 border-t border-border bg-background px-4 py-3 sm:px-6 lg:px-10">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label class="relative min-w-0 flex-1 sm:max-w-md">
          <Icon
            name="ph:magnifying-glass"
            class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input v-model="search" class="pl-9 text-sm" :placeholder="t('operations.disputes.search')" />
        </label>
        <select v-model="status" class="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option :value="undefined">{{ t("operations.disputes.allStatuses") }}</option>
          <option v-for="value in Object.keys(statusTone)" :key="value" :value="value">
            {{ t(`operations.disputes.status.${value}`) }}
          </option>
        </select>
      </div>
    </div>

    <div class="grid min-h-0 flex-1 grid-cols-1 border-t border-border bg-card lg:grid-cols-[300px_1fr]">
      <aside
        class="h-full overflow-hidden border-r border-border bg-card"
        :class="explicitId ? 'hidden lg:block' : 'block'"
        data-testid="marketplace-disputes-sidebar"
      >
        <div class="border-b border-border px-4 py-3">
          <h2 class="font-heading text-sm font-semibold">{{ t("operations.disputes.queue") }}</h2>
          <p class="mt-0.5 text-xs text-muted-foreground">
            {{ t("operations.disputes.count", { count: listQuery.data.value?.total ?? 0 }) }}
          </p>
        </div>
        <ScrollArea class="h-[calc(100%-61px)]">
          <div v-if="listQuery.isPending.value" class="space-y-2 p-3">
            <div v-for="n in 7" :key="n" class="h-20 animate-pulse rounded-md bg-muted" />
          </div>
          <div
            v-else-if="listQuery.error.value || !listQuery.data.value?.elements.length"
            class="p-6 text-center text-sm text-muted-foreground"
          >
            {{ listQuery.error.value ? t("operations.common.loadError") : t("operations.disputes.empty") }}
          </div>
          <button
            v-for="item in listQuery.data.value?.elements ?? []"
            v-else
            :key="item.id"
            type="button"
            class="flex w-full flex-col gap-1 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/50"
            :class="
              item.id === effectiveId ? 'border-l-4 border-l-primary bg-muted' : 'border-l-4 border-l-transparent'
            "
            @click="selectReturn(item.id)"
          >
            <span class="flex w-full items-start justify-between gap-2">
              <strong class="truncate text-sm font-medium">{{ item.demande.reference }}</strong>
              <Badge class="shrink-0 border-0 px-2 py-0 text-[10px] font-medium" :class="statusTone[item.statut]">
                {{ t(`operations.disputes.status.${item.statut}`) }}
              </Badge>
            </span>
            <span class="truncate text-xs text-muted-foreground">
              {{
                item.demande.client.profil?.nom || item.demande.client.courriel || t("operations.common.unknownClient")
              }}
              · {{ item.demande.boutique.nom }}
            </span>
            <span class="text-[11px] text-muted-foreground">{{ dateFormatter.format(new Date(item.creeLe)) }}</span>
          </button>
        </ScrollArea>
      </aside>

      <section class="h-full overflow-y-auto bg-muted/70" :class="explicitId ? 'block' : 'hidden lg:block'">
        <div
          v-if="detailQuery.isPending.value"
          class="flex h-full items-center justify-center text-sm text-muted-foreground"
        >
          {{ t("operations.common.loading") }}
        </div>
        <ApiErrorCard
          v-else-if="detailQuery.error.value"
          class="m-6"
          :error="detailQuery.error.value"
          @retry="() => void detailQuery.refetch()"
        />
        <EmptyStateCard
          v-else-if="!detailQuery.data.value"
          class="m-6"
          icon="ph:cursor-click"
          :text="t('operations.disputes.select')"
        />
        <div v-else class="min-h-full">
          <header
            class="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background p-4 sm:p-5"
          >
            <div class="min-w-0">
              <button
                type="button"
                class="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground lg:hidden"
                @click="clearSelection"
              >
                <Icon name="ph:arrow-left" /> {{ t("operations.common.back") }}
              </button>
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="font-heading text-lg font-semibold">{{ detailQuery.data.value.demande.reference }}</h2>
                <Badge class="border-0 px-2.5 py-0.5 text-xs" :class="statusTone[detailQuery.data.value.statut]">
                  {{ t(`operations.disputes.status.${detailQuery.data.value.statut}`) }}
                </Badge>
              </div>
              <p class="mt-0.5 text-sm text-muted-foreground">{{ detailQuery.data.value.demande.boutique.nom }}</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <Button
                v-if="isDirection"
                size="sm"
                variant="outline"
                :disabled="exporting"
                data-testid="disputes-export-case"
                @click="exportCase(detailQuery.data.value.demande.id, detailQuery.data.value.demande.reference)"
              >
                <Icon name="ph:file-zip" />
                {{ exporting ? t("operations.disputes.exporting") : t("operations.disputes.exportCase") }}
              </Button>
              <Button
                v-if="detailQuery.data.value.capacites.recevoir"
                size="sm"
                :disabled="receive.isPending.value"
                @click="receive.mutate(detailQuery.data.value.id)"
              >
                {{ t("operations.disputes.receive") }}
              </Button>
            </div>
            <p v-if="exportError" class="basis-full text-sm text-destructive" role="alert">
              {{ t("operations.disputes.exportError") }}
            </p>
          </header>

          <div class="grid gap-4 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div class="space-y-4">
              <section class="rounded-lg border border-border bg-card p-4">
                <h3 class="font-heading text-base font-semibold">{{ t("operations.disputes.summary") }}</h3>
                <dl class="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt class="text-muted-foreground">{{ t("operations.disputes.order") }}</dt>
                    <dd class="font-medium">{{ detailQuery.data.value.demande.commande.reference }}</dd>
                  </div>
                  <div>
                    <dt class="text-muted-foreground">{{ t("operations.disputes.shipment") }}</dt>
                    <dd class="font-medium">{{ detailQuery.data.value.demande.expedition?.reference ?? "—" }}</dd>
                  </div>
                  <div>
                    <dt class="text-muted-foreground">{{ t("operations.disputes.refundable") }}</dt>
                    <dd class="font-medium">
                      {{ moneyFormatter.format(detailQuery.data.value.montantRemboursableFcfa) }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-muted-foreground">{{ t("operations.disputes.reason") }}</dt>
                    <dd class="font-medium">{{ detailQuery.data.value.motifClient }}</dd>
                  </div>
                </dl>
              </section>
              <section class="overflow-hidden rounded-lg border border-border bg-card">
                <h3 class="px-4 pt-4 font-heading text-base font-semibold">{{ t("operations.disputes.items") }}</h3>
                <div class="overflow-x-auto p-4">
                  <table class="w-full min-w-[520px] text-left text-sm">
                    <thead class="border-b border-border text-xs text-muted-foreground">
                      <tr>
                        <th class="pb-2">{{ t("operations.disputes.item") }}</th>
                        <th class="pb-2">{{ t("operations.disputes.sku") }}</th>
                        <th class="pb-2">{{ t("operations.disputes.quantity") }}</th>
                        <th class="pb-2 text-right">{{ t("operations.disputes.unitPrice") }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td class="pt-3 font-medium">{{ detailQuery.data.value.ligne.produitNomCapture }}</td>
                        <td class="pt-3">{{ detailQuery.data.value.ligne.referenceVendeurCapture }}</td>
                        <td class="pt-3">{{ detailQuery.data.value.quantite }}</td>
                        <td class="pt-3 text-right">
                          {{ moneyFormatter.format(detailQuery.data.value.ligne.prixUnitaireFcfa) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
              <section class="rounded-lg border border-border bg-card p-4">
                <h3 class="font-heading text-base font-semibold">{{ t("operations.disputes.history") }}</h3>
                <ol class="mt-4 space-y-4 border-l border-border pl-5">
                  <li
                    v-for="event in detailQuery.data.value.demande.evenements"
                    :key="event.id"
                    class="relative text-sm"
                  >
                    <span class="absolute -left-[25px] top-1.5 size-2 rounded-full bg-primary" />
                    <p class="font-medium">
                      {{ t(`operations.disputes.requestStatus.${event.versStatut}`, event.versStatut) }}
                    </p>
                    <p v-if="event.motif" class="text-muted-foreground">{{ event.motif }}</p>
                    <time class="text-xs text-muted-foreground">{{
                      dateTimeFormatter.format(new Date(event.creeLe))
                    }}</time>
                  </li>
                </ol>
              </section>
              <section class="rounded-lg border border-border bg-card p-4">
                <h3 class="font-heading text-base font-semibold">{{ t("operations.disputes.exchanges") }}</h3>
                <div class="mt-3 space-y-2">
                  <div
                    v-for="message in detailQuery.data.value.demande.messages"
                    :key="message.id"
                    class="rounded-md bg-muted p-3 text-sm"
                  >
                    <strong class="capitalize">{{ message.auteurType }}</strong>
                    <p class="mt-1 whitespace-pre-wrap">{{ message.contenu }}</p>
                  </div>
                </div>
                <textarea
                  v-model="replyText"
                  class="mt-3 min-h-24 w-full rounded-md border border-input bg-background p-3 text-sm"
                  maxlength="5000"
                  :placeholder="t('operations.disputes.replyPlaceholder')"
                />
                <Button
                  class="mt-2"
                  size="sm"
                  :disabled="replyText.trim().length < 2 || reply.isPending.value"
                  @click="sendReply"
                  >{{ t("operations.disputes.sendReply") }}</Button
                >
              </section>
              <section class="rounded-lg border border-border bg-card p-4">
                <h3 class="font-heading text-base font-semibold">{{ t("operations.disputes.evidence") }}</h3>
                <p v-if="evidenceError" class="mt-3 text-sm text-destructive" role="alert">
                  {{ t("operations.disputes.evidenceDownloadError") }}
                </p>
                <p
                  v-if="!detailQuery.data.value.demande.messages.some(message => message.pieces.length)"
                  class="mt-3 text-sm text-muted-foreground"
                >
                  {{ t("operations.disputes.noEvidence") }}
                </p>
                <ul v-else class="mt-3 space-y-2">
                  <template v-for="message in detailQuery.data.value.demande.messages" :key="message.id">
                    <li v-for="piece in message.pieces" :key="piece.id">
                      <button
                        type="button"
                        class="flex w-full items-center gap-3 rounded-md border border-border p-3 text-left hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                        :disabled="Boolean(evidenceBlock(piece))"
                        :data-testid="`disputes-evidence-${piece.id}`"
                        @click="downloadEvidence(detailQuery.data.value!.demande.id, piece)"
                      >
                        <Icon
                          :name="evidenceBlock(piece) ? 'ph:shield-warning' : 'ph:file-arrow-down'"
                          :class="evidenceBlock(piece) ? 'text-amber-600' : 'text-primary'"
                        />
                        <span class="min-w-0 flex-1"
                          ><strong class="block truncate text-sm">{{ piece.nomCapture }}</strong
                          ><small class="text-muted-foreground">{{
                            t("operations.disputes.fileMeta", {
                              size: Math.ceil(piece.tailleOctets / 1024),
                              type: piece.typeMime,
                            })
                          }}</small></span
                        >
                        <Badge v-if="evidenceBlock(piece)" variant="secondary" class="shrink-0">{{
                          t(`operations.disputes.evidenceState.${evidenceBlock(piece)}`)
                        }}</Badge>
                      </button>
                    </li>
                  </template>
                </ul>
              </section>
            </div>
            <section class="h-fit rounded-lg border border-border bg-card p-4 xl:sticky xl:top-24">
              <h3 class="font-heading text-base font-semibold">{{ t("operations.disputes.decision") }}</h3>
              <div
                v-if="detailQuery.data.value.capacites.decider || detailQuery.data.value.capacites.arbitrer"
                class="mt-4 space-y-3 rounded-md border border-border p-3"
              >
                <p class="text-sm font-medium">
                  {{
                    detailQuery.data.value.capacites.arbitrer
                      ? t("operations.disputes.finalArbitration")
                      : t("operations.disputes.initialDecision")
                  }}
                </p>
                <select
                  v-model="workflowDecision"
                  class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="autorise">{{ t("operations.disputes.authorizeReturn") }}</option>
                  <option value="refuse">{{ t("operations.disputes.refuseReturn") }}</option>
                </select>
                <template v-if="detailQuery.data.value.capacites.decider">
                  <select
                    v-model="workflowResponsibility"
                    class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="indetermine">{{ t("operations.disputes.responsibilityUnknown") }}</option>
                    <option value="client">{{ t("operations.disputes.client") }}</option>
                    <option value="vendeur">{{ t("operations.disputes.seller") }}</option>
                    <option value="agent_livraison">{{ t("operations.disputes.courier") }}</option>
                    <option value="katihub">{{ t("operations.disputes.platform") }}</option>
                  </select>
                  <Input
                    v-model.number="returnFees"
                    type="number"
                    min="0"
                    step="1"
                    :placeholder="t('operations.disputes.returnFees')"
                  />
                </template>
                <textarea
                  v-model="workflowReason"
                  class="min-h-24 w-full rounded-md border border-input bg-background p-3 text-sm"
                  maxlength="1000"
                  :placeholder="t('operations.disputes.reasonPlaceholder')"
                />
                <Button
                  class="w-full"
                  :disabled="workflowReason.trim().length < 10 || decide.isPending.value || arbitrate.isPending.value"
                  @click="submitWorkflowDecision"
                  ><Icon name="ph:scales" />{{
                    detailQuery.data.value.capacites.arbitrer
                      ? t("operations.disputes.submitArbitration")
                      : t("operations.disputes.saveDecision")
                  }}</Button
                >
              </div>
              <div
                v-if="detailQuery.data.value.remboursementPsp"
                class="mt-4 rounded-md border border-border bg-muted/50 p-3 text-sm"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="font-medium">{{ t("operations.disputes.pspRefund") }}</span>
                  <Badge variant="outline">{{
                    t(`operations.disputes.pspStatus.${detailQuery.data.value.remboursementPsp.statut}`)
                  }}</Badge>
                </div>
                <p
                  v-if="detailQuery.data.value.remboursementPsp.transId"
                  class="mt-2 break-all font-mono text-xs text-muted-foreground"
                >
                  {{ detailQuery.data.value.remboursementPsp.transId }}
                </p>
                <p v-if="detailQuery.data.value.remboursementPsp.raisonEchec" class="mt-2 text-xs text-destructive">
                  {{ detailQuery.data.value.remboursementPsp.raisonEchec }}
                </p>
              </div>
              <label class="mt-4 block text-sm font-medium" for="refund-phone">{{
                t("operations.disputes.refundPhone")
              }}</label>
              <Input
                id="refund-phone"
                v-model="reimbursementPhone"
                class="mt-2"
                inputmode="tel"
                :placeholder="t('operations.disputes.refundPhonePlaceholder')"
                :disabled="!detailQuery.data.value.capacites.rembourser"
              />
              <p class="mt-1 text-xs text-muted-foreground">{{ t("operations.disputes.refundPhoneHint") }}</p>
              <Button
                class="mt-3 w-full"
                :disabled="!detailQuery.data.value.capacites.rembourser || reimburse.isPending.value"
                @click="reimburseReturn"
              >
                <Icon name="ph:shield-check" /> {{ t("operations.disputes.reimburse") }}
              </Button>
              <Button
                v-if="detailQuery.data.value.capacites.rapprocherRemboursement"
                class="mt-2 w-full"
                variant="outline"
                :disabled="reconcileRefund.isPending.value"
                @click="reconcileRefund.mutate(detailQuery.data.value.id)"
              >
                <Icon name="ph:arrows-clockwise" /> {{ t("operations.disputes.reconcileRefund") }}
              </Button>
            </section>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

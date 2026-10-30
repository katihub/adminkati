<script setup lang="ts">
// fallow-ignore-file complexity -- declarative onboarding workspace with list, document and decision states
import type { SellerReviewFilters, SellerVerificationStatus } from "@/types/api/marketplace-moderation"
import { computed, ref, watch } from "vue"
import { toast } from "vue-sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  useSellerReviewDetail,
  useSellerReviewList,
  useSellerReviewMutations,
} from "@/composables/useMarketplaceModeration"
import { apiErrorText } from "@/utils/api-error"
import { downloadBlob } from "@/utils/download-file"
import { routeQueryString } from "@/utils/route-query"

const route = useRoute()
const session = useCachedSession()
const isDirection = computed(() => session.value?.roles.includes("direction") ?? false)
const { locale, t } = useI18n()
const search = ref("")
const verification = ref<SellerVerificationStatus | undefined>()
const page = ref(1)
watch([search, verification], () => {
  page.value = 1
})
const reason = ref("")
const selectedDocumentId = ref<string | null>(null)
const openingDocumentId = ref<string | null>(null)

async function openDocument(document: { id: string; nomFichier?: string | null }) {
  const sellerId = effectiveId.value
  if (!sellerId) return
  openingDocumentId.value = document.id
  try {
    const blob = await $fetch<Blob>(
      `/api/v1/vendeurs/${encodeURIComponent(sellerId)}/documents/${encodeURIComponent(document.id)}/fichier`,
      { responseType: "blob" },
    )
    downloadBlob(blob, document.nomFichier ?? `justificatif-${document.id}`)
  } catch (cause) {
    toast.error(apiErrorText(cause, t))
  } finally {
    openingDocumentId.value = null
  }
}
const explicitId = computed(() => routeQueryString(route.query.candidature) ?? null)
const filters = computed<SellerReviewFilters>(() => ({
  ...(search.value.trim() ? { q: search.value.trim() } : {}),
  ...(verification.value ? { verification: verification.value } : {}),
  taille: 50,
  page: page.value,
}))
const listQuery = useSellerReviewList(filters)
const effectiveId = computed(() => explicitId.value ?? listQuery.data.value?.elements[0]?.id ?? null)
const detailQuery = useSellerReviewDetail(effectiveId)
if (import.meta.server) {
  await listQuery.suspense().catch(() => undefined) // The query owns the rendered error state.
  if (effectiveId.value) await detailQuery.suspense().catch(() => undefined)
}
const mutations = useSellerReviewMutations()
const date = computed(() => new Intl.DateTimeFormat(locale.value, { day: "2-digit", month: "short", year: "numeric" }))
const allDocumentsValid = computed(() => {
  const documents = detailQuery.data.value?.documents ?? []
  return documents.length > 0 && documents.every(document => document.statut === "valide")
})
const canDecideApplication = computed(() => {
  const status = detailQuery.data.value?.statutVerification
  return status === "soumis" || status === "en_verification"
})
const pending = computed(
  () =>
    mutations.claimDocument.isPending.value ||
    mutations.decideDocument.isPending.value ||
    mutations.decideApplication.isPending.value,
)

const verificationLabelKeys: Record<string, string> = {
  brouillon: "operations.onboarding.status.draft",
  soumis: "operations.onboarding.status.submitted",
  en_verification: "operations.onboarding.status.reviewing",
  approuve: "operations.onboarding.status.approved",
  modification_demandee: "operations.onboarding.status.changesRequested",
  refuse: "operations.onboarding.status.refused",
}
const documentLabelKeys: Record<string, string> = {
  soumis: "operations.onboarding.documentStatus.submitted",
  en_verification: "operations.onboarding.documentStatus.reviewing",
  valide: "operations.onboarding.documentStatus.validated",
  refuse: "operations.onboarding.documentStatus.refused",
  expire: "operations.onboarding.documentStatus.expired",
}
const verificationLabels = computed<Record<string, string>>(() =>
  Object.fromEntries(Object.entries(verificationLabelKeys).map(([status, key]) => [status, t(key)])),
)
const documentLabels = computed<Record<string, string>>(() =>
  Object.fromEntries(Object.entries(documentLabelKeys).map(([status, key]) => [status, t(key)])),
)

function verificationLabel(status: string) {
  return verificationLabels.value[status] ?? status
}

function documentLabel(status: string) {
  return documentLabels.value[status] ?? status
}

watch(effectiveId, () => {
  reason.value = ""
  selectedDocumentId.value = null
})

function selectSeller(id: string) {
  void navigateTo({ path: route.path, query: { tab: "seller-onboarding", candidature: id } })
}

function clearSelection() {
  void navigateTo({ path: route.path, query: { tab: "seller-onboarding" } })
}

async function run(action: () => Promise<unknown>, success: string) {
  try {
    await action()
    reason.value = ""
    toast.success(success)
  } catch (error) {
    toast.error(apiErrorText(error, t))
  }
}

async function claimDocument(documentId: string) {
  const sellerId = effectiveId.value
  if (!sellerId) return
  await run(
    () => mutations.claimDocument.mutateAsync({ sellerId, documentId }),
    t("operations.onboarding.documentClaimed"),
  )
  selectedDocumentId.value = documentId
}

async function decideDocument(documentId: string, decision: "valide" | "refuse") {
  const sellerId = effectiveId.value
  const motif = reason.value.trim()
  if (!sellerId || (decision === "refuse" && motif.length < 5)) return
  await run(
    () => mutations.decideDocument.mutateAsync({ sellerId, documentId, decision, ...(motif ? { motif } : {}) }),
    decision === "valide" ? t("operations.onboarding.documentValidated") : t("operations.onboarding.documentRefused"),
  )
  selectedDocumentId.value = null
}

async function decideApplication(decision: "approuve" | "modification_demandee" | "refuse") {
  const sellerId = effectiveId.value
  const motif = reason.value.trim()
  if (!sellerId || !canDecideApplication.value || (decision !== "approuve" && motif.length < 5)) return
  await run(
    () => mutations.decideApplication.mutateAsync({ sellerId, decision, ...(motif ? { motif } : {}) }),
    decision === "approuve" ? t("operations.onboarding.sellerActivated") : t("operations.onboarding.decisionSaved"),
  )
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col" data-testid="seller-onboarding-workspace">
    <div class="shrink-0 border-t border-border bg-background px-4 py-3 sm:px-6 lg:px-10">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label class="relative min-w-0 flex-1 sm:max-w-md">
          <Icon
            name="ph:magnifying-glass"
            class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input v-model="search" class="pl-9 text-sm" :placeholder="t('operations.onboarding.search')" />
        </label>
        <select v-model="verification" class="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option :value="undefined">{{ t("operations.onboarding.allStatuses") }}</option>
          <option v-for="(key, status) in verificationLabelKeys" :key="status" :value="status">{{ t(key) }}</option>
        </select>
      </div>
    </div>

    <div class="grid min-h-0 flex-1 grid-cols-1 border-t border-border bg-card lg:grid-cols-[310px_minmax(0,1fr)]">
      <aside
        class="flex h-full min-h-0 flex-col overflow-hidden border-r border-border bg-card"
        :class="explicitId ? 'hidden lg:block' : 'block'"
      >
        <div class="border-b border-border px-4 py-3">
          <h2 class="font-heading text-sm font-semibold">{{ t("operations.onboarding.applications") }}</h2>
          <p class="mt-0.5 text-xs text-muted-foreground">
            {{ t("operations.onboarding.applicationCount", { count: listQuery.data.value?.total ?? 0 }) }}
          </p>
        </div>
        <ScrollArea class="min-h-0 flex-1">
          <div v-if="listQuery.isPending.value" class="space-y-2 p-3">
            <div v-for="n in 7" :key="n" class="h-20 animate-pulse rounded-md bg-muted" />
          </div>
          <ApiErrorCard
            v-else-if="listQuery.error.value"
            class="m-3"
            :error="listQuery.error.value"
            @retry="() => void listQuery.refetch()"
          />
          <div v-else-if="!listQuery.data.value?.elements.length" class="p-8 text-center text-sm text-muted-foreground">
            {{ t("operations.onboarding.empty") }}
          </div>
          <button
            v-for="seller in listQuery.data.value?.elements ?? []"
            v-else
            :key="seller.id"
            type="button"
            class="flex w-full flex-col gap-1 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/50"
            :class="
              seller.id === effectiveId ? 'border-l-4 border-l-primary bg-muted' : 'border-l-4 border-l-transparent'
            "
            @click="selectSeller(seller.id)"
          >
            <span class="flex w-full items-start justify-between gap-2"
              ><strong class="truncate text-sm font-medium">{{ seller.nomLegal }}</strong
              ><Badge class="shrink-0 border-0 px-2 py-0 text-[10px]">{{
                verificationLabel(seller.statutVerification)
              }}</Badge></span
            >
            <span class="truncate text-xs text-muted-foreground">{{
              seller.boutiques.map(item => item.nom).join(", ")
            }}</span>
            <span class="text-[11px] text-muted-foreground">{{
              t("operations.onboarding.receivedOn", { date: date.format(new Date(seller.creeLe)) })
            }}</span>
          </button>
        </ScrollArea>
        <nav
          v-if="(listQuery.data.value?.pages ?? 1) > 1"
          class="flex shrink-0 items-center justify-center gap-3 border-t border-border p-3"
        >
          <Button
            variant="outline"
            size="icon"
            :aria-label="t('operations.focal.previous')"
            :disabled="page <= 1 || listQuery.isFetching.value"
            @click="page--"
            ><Icon name="ph:caret-left"
          /></Button>
          <span class="text-xs">{{ page }} / {{ listQuery.data.value?.pages }}</span>
          <Button
            variant="outline"
            size="icon"
            :aria-label="t('operations.focal.next')"
            :disabled="page >= (listQuery.data.value?.pages ?? 1) || listQuery.isFetching.value"
            @click="page++"
            ><Icon name="ph:caret-right"
          /></Button>
        </nav>
      </aside>

      <section class="h-full overflow-y-auto bg-muted/60" :class="explicitId ? 'block' : 'hidden lg:block'">
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
          :text="t('operations.onboarding.select')"
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
                <h2 class="truncate font-heading text-lg font-semibold">{{ detailQuery.data.value.nomLegal }}</h2>
                <Badge class="border-0">{{ verificationLabel(detailQuery.data.value.statutVerification) }}</Badge>
              </div>
              <p class="mt-1 text-sm text-muted-foreground">
                {{ detailQuery.data.value.type }} ·
                {{ detailQuery.data.value.boutiques.map(item => item.nom).join(", ") }}
              </p>
            </div>
            <div class="text-right text-xs text-muted-foreground">
              <p>{{ t("operations.onboarding.niu") }} : {{ detailQuery.data.value.niu ?? "—" }}</p>
              <p>{{ t("operations.onboarding.rccm") }} : {{ detailQuery.data.value.rccm ?? "—" }}</p>
            </div>
          </header>

          <div class="grid gap-4 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_310px]">
            <div class="space-y-4">
              <section class="rounded-lg border border-border bg-card">
                <div class="flex items-center justify-between border-b border-border p-4">
                  <h3 class="font-heading font-semibold">{{ t("operations.onboarding.documents") }}</h3>
                  <span class="text-xs text-muted-foreground">{{
                    t("operations.onboarding.documentCount", { count: detailQuery.data.value.documents.length })
                  }}</span>
                </div>
                <div
                  v-if="!detailQuery.data.value.documents.length"
                  class="p-8 text-center text-sm text-muted-foreground"
                >
                  {{ t("operations.onboarding.noDocuments") }}
                </div>
                <ul v-else class="divide-y divide-border">
                  <li
                    v-for="document in detailQuery.data.value.documents"
                    :key="document.id"
                    class="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div>
                      <div class="flex flex-wrap items-center gap-2">
                        <strong class="text-sm">{{ document.type }}</strong
                        ><Badge variant="outline" class="text-[10px]">{{ documentLabel(document.statut) }}</Badge>
                      </div>
                      <p class="mt-1 text-xs text-muted-foreground">
                        {{ t("operations.onboarding.submittedOn", { date: date.format(new Date(document.creeLe)) })
                        }}<template v-if="document.expireLe">
                          ·
                          {{
                            t("operations.onboarding.expiresOn", { date: date.format(new Date(document.expireLe)) })
                          }}</template
                        >
                      </p>
                      <p v-if="document.nomFichier" class="mt-1 text-xs text-muted-foreground">
                        {{ document.nomFichier }}
                        <template v-if="document.statutAnalyse === 'saine'">
                          · {{ t("operations.onboarding.scanClean") }}</template
                        >
                      </p>
                      <p v-else class="mt-1 text-xs text-muted-foreground">
                        {{ t("operations.onboarding.legacyKey") }}
                      </p>
                      <p v-if="document.motifDecision" class="mt-2 text-xs text-destructive">
                        {{ document.motifDecision }}
                      </p>
                    </div>
                    <div class="flex flex-wrap gap-2">
                      <Button
                        v-if="document.typeMime && document.statutAnalyse !== 'infectee'"
                        size="sm"
                        variant="ghost"
                        :disabled="openingDocumentId === document.id"
                        :data-testid="`seller-document-open-${document.id}`"
                        @click="openDocument(document)"
                        ><Icon name="ph:file-arrow-down" /> {{ t("operations.onboarding.openFile") }}</Button
                      >
                      <Button
                        v-if="document.statut === 'soumis'"
                        size="sm"
                        variant="outline"
                        :disabled="pending"
                        @click="claimDocument(document.id)"
                        >{{ t("operations.onboarding.claim") }}</Button
                      >
                      <Button
                        v-if="document.statut === 'en_verification'"
                        size="sm"
                        variant="outline"
                        @click="selectedDocumentId = document.id"
                        >{{ t("operations.onboarding.decide") }}</Button
                      >
                    </div>
                    <div
                      v-if="selectedDocumentId === document.id"
                      class="grid gap-2 rounded-md bg-muted p-3 sm:col-span-2"
                    >
                      <label class="text-xs font-medium">{{ t("operations.onboarding.refusalReason") }}</label>
                      <textarea
                        v-model="reason"
                        rows="3"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                      <div class="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          :disabled="pending || reason.trim().length < 5"
                          @click="decideDocument(document.id, 'refuse')"
                          >{{ t("operations.onboarding.refuse") }}</Button
                        ><Button size="sm" :disabled="pending" @click="decideDocument(document.id, 'valide')">{{
                          t("operations.onboarding.validate")
                        }}</Button>
                      </div>
                    </div>
                  </li>
                </ul>
              </section>

              <OperationsSellerShops :seller="detailQuery.data.value" :can-view-finance="isDirection" />
            </div>

            <section class="h-fit rounded-lg border border-border bg-card p-4 xl:sticky xl:top-24">
              <h3 class="font-heading font-semibold">{{ t("operations.onboarding.applicationDecision") }}</h3>
              <p class="mt-2 text-xs text-muted-foreground">{{ t("operations.onboarding.approvalHelp") }}</p>
              <div class="mt-4 rounded-md border border-border bg-muted/50 p-3 text-xs">
                <strong>{{
                  !canDecideApplication
                    ? t("operations.onboarding.finalized")
                    : allDocumentsValid
                      ? t("operations.onboarding.ready")
                      : t("operations.onboarding.validationImpossible")
                }}</strong>
                <p class="mt-1 text-muted-foreground">
                  {{
                    !canDecideApplication
                      ? t("operations.onboarding.noFurtherDecision")
                      : allDocumentsValid
                        ? t("operations.onboarding.allDocumentsValid")
                        : t("operations.onboarding.documentsRequired")
                  }}
                </p>
              </div>
              <label class="mt-4 block text-sm font-medium" for="seller-decision-reason">{{
                t("operations.onboarding.decisionReason")
              }}</label>
              <textarea
                id="seller-decision-reason"
                v-model="reason"
                rows="5"
                class="mt-2 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <Button
                class="mt-3 w-full"
                :disabled="pending || !canDecideApplication || !allDocumentsValid"
                @click="decideApplication('approuve')"
                ><Icon name="ph:check-circle" /> {{ t("operations.onboarding.approveActivate") }}</Button
              >
              <Button
                class="mt-2 w-full"
                variant="outline"
                :disabled="pending || !canDecideApplication || reason.trim().length < 5"
                @click="decideApplication('modification_demandee')"
                >{{ t("operations.onboarding.requestChanges") }}</Button
              >
              <Button
                class="mt-2 w-full"
                variant="destructive"
                :disabled="pending || !canDecideApplication || reason.trim().length < 5"
                @click="decideApplication('refuse')"
                >{{ t("operations.onboarding.refuseApplication") }}</Button
              >
            </section>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
// fallow-ignore-file complexity -- declarative onboarding workspace with list, document and decision states
import type { SellerApplicationTab, SellerReviewFilters } from "@/types/api/marketplace-moderation"
import { computed, onBeforeUnmount, ref, watch } from "vue"
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
import {
  applicationAfterDecision,
  groupSellerDocuments,
  neighbourApplications,
  parsePage,
  parseSellerApplicationTab,
} from "@/utils/seller-applications"
import { canWithdrawSellerApplication, isSellerFileApprovable } from "@/utils/seller-documents"

const route = useRoute()
const session = useCachedSession()
const isDirection = computed(() => session.value?.roles.includes("direction") ?? false)
const { t } = useI18n()
/* The tab, the search and the page live in the address (12 November 2026): a reload or a shared link
   lands on the same list. Changing the tab or the search goes back to the first page. */
const tab = computed(() => parseSellerApplicationTab(routeQueryString(route.query.onglet)))
const page = computed(() => parsePage(routeQueryString(route.query.page)))
const search = ref(routeQueryString(route.query.q) ?? "")
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, value => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    const q = value.trim()
    if (q === (routeQueryString(route.query.q) ?? "")) return
    void navigateTo({ query: { ...route.query, q: q || undefined, page: undefined } }, { replace: true })
  }, 300)
})
onBeforeUnmount(() => clearTimeout(searchTimer))

function setTab(value: SellerApplicationTab) {
  void navigateTo({ query: { ...route.query, onglet: value, page: undefined, candidature: undefined } })
}

function setPage(value: number) {
  void navigateTo({ query: { ...route.query, page: value > 1 ? String(value) : undefined } })
}
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
const filters = computed<SellerReviewFilters>(() => {
  const q = routeQueryString(route.query.q)?.trim()
  return { ...(q ? { q } : {}), onglet: tab.value, taille: 50, page: page.value }
})
const listQuery = useSellerReviewList(filters)
const effectiveId = computed(() => explicitId.value ?? listQuery.data.value?.elements[0]?.id ?? null)
const detailQuery = useSellerReviewDetail(effectiveId)
const listIds = computed(() => listQuery.data.value?.elements.map(seller => seller.id) ?? [])
const neighbours = computed(() => neighbourApplications(listIds.value, effectiveId.value))
const requirements = computed(() => detailQuery.data.value?.exigences ?? [])
const documentLabelsByType = computed<Record<string, string>>(() =>
  Object.fromEntries(requirements.value.map(requirement => [requirement.type, requirement.libelle])),
)
const documentGroups = computed(() => groupSellerDocuments(detailQuery.data.value?.documents ?? [], requirements.value))
if (import.meta.server) {
  await listQuery.suspense().catch(() => undefined) // The query owns the rendered error state.
  if (effectiveId.value) await detailQuery.suspense().catch(() => undefined)
}
const mutations = useSellerReviewMutations()
const allDocumentsValid = computed(() => isSellerFileApprovable(detailQuery.data.value?.documents ?? []))
const canDecideApplication = computed(() => {
  const status = detailQuery.data.value?.statutVerification
  return status === "soumis" || status === "en_verification"
})
const canWithdraw = computed(() => canWithdrawSellerApplication(detailQuery.data.value?.statutVerification))
const confirmingWithdrawal = ref(false)
const pending = computed(
  () =>
    mutations.withdrawApplication.isPending.value ||
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
  retiree: "operations.onboarding.status.withdrawn",
}
const verificationLabels = computed<Record<string, string>>(() =>
  Object.fromEntries(Object.entries(verificationLabelKeys).map(([status, key]) => [status, t(key)])),
)

function verificationLabel(status: string) {
  return verificationLabels.value[status] ?? status
}

watch(effectiveId, () => {
  reason.value = ""
  selectedDocumentId.value = null
})

function selectSeller(id: string) {
  void navigateTo({ path: route.path, query: { ...route.query, tab: "seller-onboarding", candidature: id } })
}

function clearSelection() {
  void navigateTo({ path: route.path, query: { ...route.query, tab: "seller-onboarding", candidature: undefined } })
}

async function run(action: () => Promise<unknown>, success: string) {
  try {
    await action()
    reason.value = ""
    toast.success(success)
    return true
  } catch (error) {
    toast.error(apiErrorText(error, t))
    return false
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

/* Withdraw the application (10 November 2026): it leaves the list, its shop name and e-mail are freed. */
async function withdrawApplication() {
  const sellerId = effectiveId.value
  const motif = reason.value.trim()
  if (!sellerId || !canWithdraw.value || motif.length < 5) return
  confirmingWithdrawal.value = false
  await run(() => mutations.withdrawApplication.mutateAsync({ sellerId, motif }), t("operations.onboarding.withdrawn"))
  if (explicitId.value) await navigateTo({ query: { ...route.query, candidature: undefined } })
}

async function decideApplication(decision: "approuve" | "modification_demandee" | "refuse") {
  const sellerId = effectiveId.value
  const motif = reason.value.trim()
  if (!sellerId || !canDecideApplication.value || (decision !== "approuve" && motif.length < 5)) return
  // The next file is chosen before the decision: once decided, this one may leave the tab.
  const nextId = applicationAfterDecision(listIds.value, sellerId)
  const done = await run(
    () => mutations.decideApplication.mutateAsync({ sellerId, decision, ...(motif ? { motif } : {}) }),
    decision === "approuve" ? t("operations.onboarding.sellerActivated") : t("operations.onboarding.decisionSaved"),
  )
  if (done) {
    if (nextId) selectSeller(nextId)
    else clearSelection()
  }
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
      </div>
      <OperationsSellerApplicationTabs
        class="mt-3"
        :model-value="tab"
        :counts="listQuery.data.value?.compteurs"
        @update:model-value="setTab"
      />
    </div>

    <div class="grid min-h-0 flex-1 grid-cols-1 border-t border-border bg-card lg:grid-cols-[310px_minmax(0,1fr)]">
      <aside
        class="h-full min-h-0 flex-col overflow-hidden border-r border-border bg-card"
        :class="explicitId ? 'hidden lg:flex' : 'flex'"
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
          <OperationsSellerApplicationCard
            v-for="seller in listQuery.data.value?.elements ?? []"
            v-else
            :key="seller.id"
            :seller="seller"
            :selected="seller.id === effectiveId"
            :status-label="verificationLabel(seller.statutVerification)"
            @select="selectSeller"
          />
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
            @click="setPage(page - 1)"
            ><Icon name="ph:caret-left"
          /></Button>
          <span class="text-xs">{{ page }} / {{ listQuery.data.value?.pages }}</span>
          <Button
            variant="outline"
            size="icon"
            :aria-label="t('operations.focal.next')"
            :disabled="page >= (listQuery.data.value?.pages ?? 1) || listQuery.isFetching.value"
            @click="setPage(page + 1)"
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
            <div class="flex items-center gap-3">
              <div class="text-right text-xs text-muted-foreground">
                <p>{{ t("operations.onboarding.niu") }} : {{ detailQuery.data.value.niu ?? "—" }}</p>
                <p>{{ t("operations.onboarding.rccm") }} : {{ detailQuery.data.value.rccm ?? "—" }}</p>
              </div>
              <div class="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  :aria-label="t('operations.onboarding.previousFile')"
                  :disabled="!neighbours.previous"
                  data-testid="seller-file-previous"
                  @click="neighbours.previous && selectSeller(neighbours.previous)"
                  ><Icon name="ph:caret-up"
                /></Button>
                <Button
                  variant="outline"
                  size="icon"
                  :aria-label="t('operations.onboarding.nextFile')"
                  :disabled="!neighbours.next"
                  data-testid="seller-file-next"
                  @click="neighbours.next && selectSeller(neighbours.next)"
                  ><Icon name="ph:caret-down"
                /></Button>
              </div>
            </div>
          </header>

          <div class="grid gap-4 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_310px]">
            <div class="space-y-4">
              <OperationsSellerIdentity :seller="detailQuery.data.value" />
              <OperationsSellerFileChecklist :requirements="requirements" />
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
                  <template v-for="group in documentGroups" :key="group.type">
                    <OperationsSellerDocumentRow
                      v-for="document in group.current"
                      :key="document.id"
                      v-model:reason="reason"
                      :document="document"
                      :label="documentLabelsByType[document.type] ?? document.type"
                      :is-new="group.isNew && document.id === group.current[0]?.id"
                      :pending="pending"
                      :opening="openingDocumentId === document.id"
                      :selected="selectedDocumentId === document.id"
                      @open="openDocument(document)"
                      @claim="claimDocument(document.id)"
                      @decide="selectedDocumentId = document.id"
                      @refuse="decideDocument(document.id, 'refuse')"
                      @validate="decideDocument(document.id, 'valide')"
                    />
                    <li v-if="group.previous.length" class="px-4 py-2">
                      <details :data-testid="`seller-document-previous-${group.type}`">
                        <summary class="cursor-pointer text-xs text-muted-foreground">
                          {{ t("operations.onboarding.previousVersions", { count: group.previous.length }) }}
                        </summary>
                        <ul class="mt-2 divide-y divide-border rounded-md border border-border">
                          <OperationsSellerDocumentRow
                            v-for="document in group.previous"
                            :key="document.id"
                            v-model:reason="reason"
                            replaced
                            :document="document"
                            :label="documentLabelsByType[document.type] ?? document.type"
                            :pending="pending"
                            :opening="openingDocumentId === document.id"
                            :selected="selectedDocumentId === document.id"
                            @open="openDocument(document)"
                            @claim="claimDocument(document.id)"
                            @decide="selectedDocumentId = document.id"
                            @refuse="decideDocument(document.id, 'refuse')"
                            @validate="decideDocument(document.id, 'valide')"
                          />
                        </ul>
                      </details>
                    </li>
                  </template>
                </ul>
              </section>
              <OperationsSellerFileHistory
                :events="detailQuery.data.value.historique ?? []"
                :document-labels="documentLabelsByType"
              />

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
              <div v-if="canWithdraw" class="mt-4 border-t border-border pt-3" data-testid="seller-withdraw">
                <p class="text-xs text-muted-foreground">{{ t("operations.onboarding.withdrawHelp") }}</p>
                <Button
                  v-if="!confirmingWithdrawal"
                  class="mt-2 w-full text-destructive"
                  variant="ghost"
                  :disabled="pending || reason.trim().length < 5"
                  data-testid="seller-withdraw-start"
                  @click="confirmingWithdrawal = true"
                  ><Icon name="ph:archive" /> {{ t("operations.onboarding.withdraw") }}</Button
                >
                <div v-else class="mt-2 grid gap-2">
                  <p class="text-sm font-medium text-destructive">{{ t("operations.onboarding.withdrawConfirm") }}</p>
                  <div class="flex gap-2">
                    <Button
                      class="flex-1"
                      variant="outline"
                      :disabled="pending"
                      @click="confirmingWithdrawal = false"
                      >{{ t("operations.onboarding.cancel") }}</Button
                    >
                    <Button
                      class="flex-1"
                      variant="destructive"
                      :disabled="pending"
                      data-testid="seller-withdraw-confirm"
                      @click="withdrawApplication"
                      >{{ t("operations.onboarding.withdrawYes") }}</Button
                    >
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

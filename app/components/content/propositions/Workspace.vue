<script setup lang="ts">
import type { CatalogueProposal, CatalogueProposalQuery } from "@/types/api/catalogue"
import { computed, watch } from "vue"
import { toast } from "vue-sonner"
import { useCachedSession } from "@/composables/useCachedSession"
import { useCatalogueMutations, useCatalogueProposal, useCatalogueProposals } from "@/composables/useCatalogue"
import { useTaxonomy } from "@/composables/useTaxonomy"
import { apiErrorText, toApiError } from "@/utils/api-error"
import { apiQueryKeys } from "@/utils/api-query-keys"

const PAGE_SIZE = 50
const statuses = ["toutes", "en_attente", "acceptee", "refusee"] as const
type ProposalStatusFilter = (typeof statuses)[number]

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const queryClient = useNuxtApp().$queryClient
const session = useCachedSession()
const canWrite = computed(() => session.value?.roles.includes("direction") ?? false)

type QueryValue = string | (string | null)[] | null | undefined

function firstQueryValue(value: QueryValue): string | undefined {
  return Array.isArray(value) ? (value[0] ?? undefined) : (value ?? undefined)
}

function parsePositiveInteger(value: QueryValue): number | null {
  const parsed = Number(firstQueryValue(value))
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function parseStatus(value: QueryValue): ProposalStatusFilter {
  const candidate = firstQueryValue(value)
  return statuses.includes(candidate as ProposalStatusFilter) ? (candidate as ProposalStatusFilter) : "toutes"
}

const status = computed(() => parseStatus(route.query.proposalStatus))
const page = computed(() => parsePositiveInteger(route.query.proposalPage) ?? 1)
const selectedId = computed(() => parsePositiveInteger(route.query.proposal))
const filters = computed<CatalogueProposalQuery>(() => ({ statut: status.value, page: page.value, taille: PAGE_SIZE }))

const listQuery = useCatalogueProposals(filters)
const detailQuery = useCatalogueProposal(selectedId)
const taxonomyQuery = useTaxonomy()
const mutations = useCatalogueMutations()

const proposals = computed(() => listQuery.data.value?.propositions ?? [])
const total = computed(() => listQuery.data.value?.total ?? 0)
const effectiveSelectedId = computed(() => selectedId.value ?? proposals.value[0]?.id ?? null)
const selectedProposal = computed<CatalogueProposal | null>(
  () => detailQuery.data.value ?? proposals.value.find(proposal => proposal.id === effectiveSelectedId.value) ?? null,
)
const categories = computed(
  () => new Map((taxonomyQuery.categories.value ?? []).map(category => [category.id, category.nom])),
)
const detailLoading = computed(() => selectedId.value !== null && detailQuery.isPending.value)
const detailError = computed(() => (selectedId.value !== null ? detailQuery.error.value : null))
const decisionPending = computed(() => mutations.accept.isPending.value || mutations.refuse.isPending.value)

async function replaceQuery(query: Record<string, string | undefined>) {
  await router.replace({
    path: route.path,
    query: Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined)),
  })
}

function selectProposal(id: number) {
  void replaceQuery({
    tab: "propositions",
    proposalStatus: status.value,
    proposalPage: String(page.value),
    proposal: String(id),
  })
}

function setStatus(nextStatus: ProposalStatusFilter) {
  void replaceQuery({
    tab: "propositions",
    proposalStatus: nextStatus,
    proposalPage: "1",
    proposal: undefined,
  })
}

function setPage(nextPage: number) {
  void replaceQuery({
    tab: "propositions",
    proposalStatus: status.value,
    proposalPage: String(nextPage),
    proposal: undefined,
  })
}

function selectFirstVisibleProposal() {
  if (import.meta.server || selectedId.value !== null || proposals.value.length === 0) return
  const firstProposal = proposals.value[0]
  if (firstProposal) selectProposal(firstProposal.id)
}

async function refreshAfterConflict(id: number) {
  await Promise.all([
    listQuery.refetch(),
    queryClient.invalidateQueries({ queryKey: apiQueryKeys.catalogue.proposal(id) }),
  ])
  if (selectedId.value === id) await detailQuery.refetch()
}

async function decideProposal(decision: "accept" | "refuse", motif?: string) {
  const id = selectedId.value
  if (id === null) return

  try {
    if (decision === "accept") await mutations.accept.mutateAsync(id)
    else await mutations.refuse.mutateAsync({ id, input: { motif: motif ?? "" } })

    toast.success(t(`content.propositions.toast.${decision === "accept" ? "accepted" : "refused"}`))
    await listQuery.refetch()

    if (status.value === "en_attente") {
      const nextProposal = proposals.value.find(proposal => proposal.id !== id)
      if (nextProposal) selectProposal(nextProposal.id)
      else
        await replaceQuery({
          tab: "propositions",
          proposalStatus: status.value,
          proposalPage: String(page.value),
          proposal: undefined,
        })
    }
  } catch (error) {
    if (toApiError(error).status === 409) {
      await refreshAfterConflict(id)
      toast.error(t("content.propositions.toast.conflict"))
      return
    }
    toast.error(apiErrorText(error, t))
  }
}

watch(proposals, selectFirstVisibleProposal, { immediate: true })
</script>

<template>
  <div
    class="grid min-h-0 w-full flex-1 grid-cols-1 overflow-hidden border-t border-border bg-muted/20 lg:grid-cols-[20rem_minmax(0,1fr)]"
    data-testid="proposal-workspace"
  >
    <aside class="h-full min-h-0 overflow-hidden border-b border-border bg-background lg:border-b-0 lg:border-r p-0!">
      <ContentPropositionsProposalListPanel
        :proposals="proposals"
        :selected-id="effectiveSelectedId"
        :status="status"
        :page="page"
        :page-size="PAGE_SIZE"
        :total="total"
        :is-pending="listQuery.isPending.value"
        :error="listQuery.error.value"
        @select="selectProposal"
        @status="setStatus"
        @page="setPage"
      />
    </aside>

    <ContentPropositionsProposalDetailPanel
      :proposal="selectedProposal"
      :categories="categories"
      :can-write="canWrite"
      :is-accepting="mutations.accept.isPending.value"
      :is-refusing="mutations.refuse.isPending.value"
      :is-loading="detailLoading"
      :error="detailError"
      @accept="decideProposal('accept')"
      @refuse="decideProposal('refuse', $event)"
      @retry="() => detailQuery.refetch()"
    />

    <div v-if="decisionPending" class="sr-only" aria-live="polite">
      {{ t("content.propositions.detail.loading") }}
    </div>
  </div>
</template>

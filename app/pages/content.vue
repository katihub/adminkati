<script setup lang="ts">
import type { Filter } from "@/components/vuzeno/filters"
import type { CatalogueProposal, CatalogueProposalList, CatalogueProposalQuery } from "@/types/api/catalogue"
import type { TaxonomieResponse } from "@/types/api/taxonomie"
import type { AnnonceAdmin, PointVenteAdmin, ReordonnerBannieresInput } from "@/types/api/vitrine"
import type { BannerStatusFilter } from "@/types/content"
import { computed, ref, watch } from "vue"
import { toast } from "vue-sonner"
import { prefetchApi } from "@/composables/useApi"
import { useBanniereMutations } from "@/composables/useBanniereMutations"
import { prefetchBannieres, useBannieres } from "@/composables/useBannieres"
import { useCachedSession } from "@/composables/useCachedSession"
import { POINTS_VENTE_PATH } from "@/composables/usePointsVente"
import { apiErrorText } from "@/utils/api-error"
import { apiQueryKeys } from "@/utils/api-query-keys"
import { filterBanners } from "@/utils/banner-filters"
import { routeQueryId } from "@/utils/route-query"

definePageMeta({ layout: "admin", roles: ["direction", "comptoir"] })

defineI18nRoute({
  paths: {
    en: "/content",
    fr: "/contenu",
  },
})

const { t } = useI18n()
const route = useRoute()

/** The query is the shareable source of truth for the content sub-workspace. Banner
 *  links intentionally keep their historical query shape and therefore remain on the
 *  default tab. */
const QUERY_TABS = ["propositions", "points-de-vente", "annonces"] as const
type ContentTab = "banners" | (typeof QUERY_TABS)[number]
function tabFromQuery(value: unknown): ContentTab {
  return QUERY_TABS.find(tab => tab === value) ?? "banners"
}
const activeTab = ref<ContentTab>(tabFromQuery(route.query.tab))
watch(
  () => route.query.tab,
  value => {
    activeTab.value = tabFromQuery(value)
  },
)

const tabs = computed(() => [
  { value: "banners", label: t("content.tabs.banners.label"), icon: "ph:flag-banner", testid: "content-tab-banners" },
  {
    value: "propositions",
    label: t("content.tabs.propositions.label"),
    icon: "ph:megaphone",
    testid: "content-tab-propositions",
  },
  // The storefront's counters sit with its other editable content rather than in the top
  // navigation, which has no room left for a tenth destination at laptop widths.
  {
    value: "points-de-vente",
    label: t("content.tabs.pointsOfSale.label"),
    icon: "ph:storefront",
    testid: "content-tab-points-of-sale",
  },
  {
    value: "annonces",
    label: t("content.tabs.announcements.label"),
    icon: "ph:megaphone-simple",
    testid: "content-tab-announcements",
  },
])

const session = useCachedSession()
const canWrite = computed(() => session.value?.roles.includes("direction") ?? false)

/** Both chips start present (empty/unset), inline, rather than needing a trip through
 *  the "+" menu on first load — the same pattern the `Filters` docs' own example uses
 *  for its `status`/`price` fields. Its `x` still removes one; the "+" menu adds it back. */
function neutralBannerFilters(): Filter[] {
  return [
    { field: "q", operator: "contains", value: "" },
    { field: "status", operator: "eq", value: null },
  ]
}

/** Browser-only, ephemeral filter state — unlike `product-list.ts`'s store, this
 *  doesn't feed a server query, so a Pinia store would be over-reach. `BannerFilterBar`
 *  owns the actual filter UI (search and status both live as `Filters` chips); this page
 *  only needs the two scalars back out to feed `filterBanners`. */
const filters = ref<Filter[]>(neutralBannerFilters())

const searchTerm = computed(() => {
  const match = filters.value.find(filter => filter.field === "q")
  return typeof match?.value === "string" ? match.value : ""
})
const statusFilter = computed<BannerStatusFilter>(() => {
  const match = filters.value.find(filter => filter.field === "status")
  return match?.value === "active" || match?.value === "inactive" ? match.value : "all"
})

const queryClient = useNuxtApp().$queryClient

const proposalStatuses = ["toutes", "en_attente", "acceptee", "refusee"] as const
const proposalStatus = computed<CatalogueProposalQuery["statut"]>(() => {
  const raw = Array.isArray(route.query.proposalStatus) ? route.query.proposalStatus[0] : route.query.proposalStatus
  return proposalStatuses.includes(raw as (typeof proposalStatuses)[number])
    ? (raw as (typeof proposalStatuses)[number])
    : "toutes"
})
const proposalPage = computed(() => {
  const raw = Array.isArray(route.query.proposalPage) ? route.query.proposalPage[0] : route.query.proposalPage
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
})
const proposalId = computed(() => routeQueryId(route.query.proposal))
const proposalQuery = computed<CatalogueProposalQuery>(() => ({
  statut: proposalStatus.value,
  page: proposalPage.value,
  taille: 50,
}))

if (import.meta.server) {
  if (activeTab.value === "banners") {
    await prefetchBannieres(queryClient)
  } else if (activeTab.value === "points-de-vente") {
    await prefetchApi<PointVenteAdmin[]>(queryClient, apiQueryKeys.pointsOfSale.all, POINTS_VENTE_PATH)
  } else if (activeTab.value === "annonces") {
    await prefetchApi<AnnonceAdmin[]>(queryClient, apiQueryKeys.announcements.all, "/vitrine/administration/annonces")
  } else {
    const detailPrefetch =
      proposalId.value === null
        ? []
        : [
            prefetchApi<CatalogueProposal>(
              queryClient,
              apiQueryKeys.catalogue.proposal(proposalId.value),
              `/catalogue/administration/propositions/${proposalId.value}`,
            ),
          ]
    await Promise.allSettled([
      prefetchApi<CatalogueProposalList>(
        queryClient,
        apiQueryKeys.catalogue.proposals(proposalQuery.value),
        "/catalogue/administration/propositions",
        proposalQuery.value as Record<string, unknown>,
      ),
      prefetchApi<TaxonomieResponse>(queryClient, apiQueryKeys.taxonomy.all, "/catalogue/administration/taxonomie"),
      ...detailPrefetch,
    ])
  }
}

const { data: bannersData, isPending, error, refetch } = useBannieres(computed(() => activeTab.value === "banners"))
/** `?? []` alone only catches null/undefined — a live-backend outage or a shape
 *  mismatch can resolve the query to a non-array success value, and `filterBanners`'s
 *  `.filter` (and `selectedBanner`'s `.find` below) would throw on that. `Array.isArray`
 *  treats anything that isn't a real list the same as "no data yet". */
const banners = computed(() => (Array.isArray(bannersData.value) ? bannersData.value : []))
const { reorder } = useBanniereMutations()

/** Not `filters.value.length > 0` — both chips are always present now (inline, not
 *  behind the "+" menu), so the array is never actually empty. This is "does either
 *  chip currently hold a real value," the same meaning it had before. */
const hasActiveFilters = computed(() => searchTerm.value.trim() !== "" || statusFilter.value !== "all")
const filteredBanners = computed(() =>
  filterBanners(banners.value, { status: statusFilter.value, search: searchTerm.value }),
)

function clearFilters() {
  filters.value = neutralBannerFilters()
}

/** Each carousel is ordered on its own: the group sends its placement with every id it holds.
 *  A refusal names what was wrong (a partial list, an id from the other carousel), so it is
 *  shown as the backend wrote it, and the list is re-read to put the cards back. */
function reorderBanners(order: ReordonnerBannieresInput) {
  reorder.mutate(order, {
    onError: reorderError => {
      void queryClient.invalidateQueries({ queryKey: apiQueryKeys.banners.all })
      toast.error(apiErrorText(reorderError, t))
    },
  })
}

const explicitId = computed(() => routeQueryId(route.query.banner))
const isNewMode = computed(() => explicitId.value === null && route.query.new !== undefined)

/** No auto-select (unlike `products.vue`) — the panel stays closed unless the query
 *  explicitly asks for it. */
const isPanelOpen = computed(() => explicitId.value !== null || isNewMode.value)
const panelMode = computed<"view" | "create">(() => (isNewMode.value ? "create" : "view"))

/** No admin detail endpoint exists — the panel's banner comes from the already-fetched
 *  list, never a second request. An id that isn't in the list is "not found," not "loading." */
const selectedBanner = computed(() => {
  if (explicitId.value === null) return null
  return banners.value.find(candidate => candidate.id === explicitId.value) ?? null
})

function selectBanner(id: number) {
  void navigateTo({ path: route.path, query: { banner: String(id) } })
}

function addBanner() {
  void navigateTo({ path: route.path, query: { new: "1" } })
}

function closePanel() {
  void navigateTo({ path: route.path })
}

function setActiveTab(value: string) {
  activeTab.value = tabFromQuery(value)
  void navigateTo({ path: route.path, query: activeTab.value === "banners" ? {} : { tab: activeTab.value } })
}

useSeoMeta({
  title: () => t("content.seo.title"),
  description: () => t("content.seo.description"),
  ogTitle: () => t("content.seo.title"),
  ogDescription: () => t("content.seo.description"),
  ogType: "website",
})

useHead({
  titleTemplate: "%s",
})
</script>

<template>
  <div
    class="-mx-4 sm:-mx-6 lg:-mx-10"
    :class="activeTab === 'propositions' && 'flex h-workspace flex-col overflow-hidden'"
  >
    <div class="shrink-0 px-6 lg:px-10">
      <AdminPageHeader :title="t('content.heading')">
        <template #tabs>
          <!-- Labels stay on one line and the strip scrolls on a phone, instead of each tab
               wrapping its label over three lines. -->
          <PillTabs
            class="*:shrink-0 *:whitespace-nowrap"
            :model-value="activeTab"
            :items="tabs"
            data-testid="content-tabs"
            @update:model-value="setActiveTab"
          />
        </template>
        <template #actions>
          <NuxtLinkLocale
            to="/site-texts"
            class="text-sm font-medium text-primary underline-offset-4 hover:underline"
            data-testid="content-site-texts-link"
          >
            {{ t("content.siteTexts.openLink") }}
          </NuxtLinkLocale>
        </template>
      </AdminPageHeader>
    </div>

    <template v-if="activeTab === 'banners'">
      <ContentBannerFilterBar
        v-model:filters="filters"
        :can-write="canWrite"
        :result-count="filteredBanners.length"
        :has-active-filters="hasActiveFilters"
        @add="addBanner"
        @clear="clearFilters"
      />

      <ContentBannerGrid
        :banners="filteredBanners"
        :is-pending="isPending"
        :error="error"
        :can-write="canWrite"
        :selected-id="explicitId"
        :has-active-filters="hasActiveFilters"
        :is-reordering="reorder.isPending.value"
        @select="selectBanner"
        @reorder="reorderBanners"
        @retry="() => refetch()"
        @clear-filters="clearFilters"
        @add="addBanner"
      />

      <ContentBannerPanel
        :open="isPanelOpen"
        :banner="selectedBanner"
        :mode="panelMode"
        :can-write="canWrite"
        @close="closePanel"
      />
    </template>

    <PointsOfSaleWorkspace v-else-if="activeTab === 'points-de-vente'" />

    <ContentAnnouncementsWorkspace v-else-if="activeTab === 'annonces'" />

    <ContentPropositionsWorkspace v-else />
  </div>
</template>

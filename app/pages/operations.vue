<script setup lang="ts">
import { computed, ref, watch } from "vue"

definePageMeta({ layout: "admin", roles: ["direction", "comptoir"] })

defineI18nRoute({
  paths: {
    en: "/operations",
    fr: "/operations",
  },
})

const { t } = useI18n()
const route = useRoute()
const session = useCachedSession()
const isDirection = computed(() => session.value?.roles.includes("direction") ?? false)

const QUERY_TABS = [
  "customer-requests",
  "seller-onboarding",
  "marketplace-catalogue",
  "marketplace-offers",
  "marketplace-categories",
  "delivery-fees",
  "localities",
  "shop-agents",
  "verified-offers",
  "refused-lines",
  "kati-points",
  "order-services",
  "installment-plans",
  "marketplace-quotes",
  "reported-reviews",
  "marketplace-disputes",
  "seller-finance",
  "seller-trust",
  "legal-closure",
  "marketplace-pilot",
  "outbound-notifications",
] as const
type OperationsTab = "cash-registers" | (typeof QUERY_TABS)[number]
const DIRECTION_TABS: ReadonlySet<OperationsTab> = new Set([
  "marketplace-offers",
  "marketplace-categories",
  "delivery-fees",
  "localities",
  "shop-agents",
  "verified-offers",
  "refused-lines",
  "kati-points",
  "order-services",
  "installment-plans",
  "marketplace-quotes",
  "reported-reviews",
  "legal-closure",
  "seller-finance",
  "marketplace-pilot",
  "outbound-notifications",
])

function tabFromQuery(value: unknown): OperationsTab {
  const tab = QUERY_TABS.find(candidate => candidate === value)
  return tab && DIRECTION_TABS.has(tab) && !isDirection.value ? "cash-registers" : (tab ?? "cash-registers")
}

const activeTab = ref<OperationsTab>(tabFromQuery(route.query.tab))
watch(
  () => route.query.tab,
  value => {
    activeTab.value = tabFromQuery(value)
  },
)
watch(isDirection, allowed => {
  if (!allowed && DIRECTION_TABS.has(activeTab.value)) setActiveTab("cash-registers")
})

const tabs = computed(() => [
  {
    value: "cash-registers",
    label: t("operations.tabs.cashRegisters.label"),
    icon: "ph:cash-register",
    testid: "operations-tab-cash-registers",
  },
  {
    value: "customer-requests",
    label: t("operations.tabs.customerRequests.label"),
    icon: "ph:chats-circle",
    testid: "operations-tab-customer-requests",
  },
  {
    value: "seller-onboarding",
    label: "Validation vendeurs",
    icon: "ph:storefront",
    testid: "operations-tab-seller-onboarding",
  },
  {
    value: "marketplace-catalogue",
    label: "Modération catalogue",
    icon: "ph:checks",
    testid: "operations-tab-marketplace-catalogue",
  },
  {
    value: "marketplace-disputes",
    label: t("operations.tabs.marketplaceDisputes.label"),
    icon: "ph:arrow-u-up-left",
    testid: "operations-tab-marketplace-disputes",
  },
  {
    value: "seller-trust",
    label: t("operations.tabs.sellerTrust.label"),
    icon: "ph:shield-check",
    testid: "operations-tab-seller-trust",
  },
  ...(isDirection.value
    ? [
        {
          value: "marketplace-offers",
          label: t("operations.tabs.marketplaceOffers.label"),
          icon: "ph:package",
          testid: "operations-tab-marketplace-offers",
        },
        {
          value: "marketplace-categories",
          label: t("operations.tabs.marketplaceCategories.label"),
          icon: "ph:tree-structure",
          testid: "operations-tab-marketplace-categories",
        },
        {
          value: "delivery-fees",
          label: t("operations.tabs.deliveryFees.label"),
          icon: "ph:truck",
          testid: "operations-tab-delivery-fees",
        },
        {
          value: "localities",
          label: t("operations.tabs.localities.label"),
          icon: "ph:map-pin",
          testid: "operations-tab-localities",
        },
        {
          value: "shop-agents",
          label: t("operations.tabs.shopAgents.label"),
          icon: "ph:user-check",
          testid: "operations-tab-shop-agents",
        },
        {
          value: "verified-offers",
          label: t("operations.tabs.verifiedOffers.label"),
          icon: "ph:seal-check",
          testid: "operations-tab-verified-offers",
        },
        {
          value: "refused-lines",
          label: t("operations.tabs.refusedLines.label"),
          icon: "ph:receipt-x",
          testid: "operations-tab-refused-lines",
        },
        {
          value: "kati-points",
          label: t("operations.tabs.katiPoints.label"),
          icon: "ph:coins",
          testid: "operations-tab-kati-points",
        },
        {
          value: "order-services",
          label: t("operations.tabs.orderServices.label"),
          icon: "ph:shield-plus",
          testid: "operations-tab-order-services",
        },
        {
          value: "installment-plans",
          label: t("operations.tabs.installmentPlans.label"),
          icon: "ph:calendar-check",
          testid: "operations-tab-installment-plans",
        },
        {
          value: "marketplace-quotes",
          label: t("operations.tabs.marketplaceQuotes.label"),
          icon: "ph:file-text",
          testid: "operations-tab-marketplace-quotes",
        },
        {
          value: "reported-reviews",
          label: t("operations.tabs.reportedReviews.label"),
          icon: "ph:flag",
          testid: "operations-tab-reported-reviews",
        },
        {
          value: "seller-finance",
          label: "Finances vendeurs",
          icon: "ph:wallet",
          testid: "operations-tab-seller-finance",
        },
        {
          value: "legal-closure",
          label: "Clôture juridique P0",
          icon: "ph:seal-check",
          testid: "operations-tab-legal-closure",
        },
        {
          value: "marketplace-pilot",
          label: t("operations.tabs.marketplacePilot.label"),
          icon: "ph:flag-banner",
          testid: "operations-tab-marketplace-pilot",
        },
        {
          value: "outbound-notifications",
          label: t("operations.tabs.outboundNotifications.label"),
          icon: "ph:envelope-simple",
          testid: "operations-tab-outbound-notifications",
        },
      ]
    : []),
])

function setActiveTab(value: string) {
  const nextTab = tabFromQuery(value)
  activeTab.value = nextTab
  void navigateTo({
    path: route.path,
    query: nextTab === "cash-registers" ? {} : { tab: nextTab },
  })
}

useSeoMeta({
  title: () => t("operations.page.seo.title"),
  description: () => t("operations.page.seo.description"),
  ogTitle: () => t("operations.page.seo.title"),
  ogDescription: () => t("operations.page.seo.description"),
  ogType: "website",
})

useHead({
  titleTemplate: "%s",
})
</script>

<template>
  <div class="-mx-4 flex h-workspace flex-col overflow-hidden sm:-mx-6 lg:-mx-10">
    <div class="shrink-0 px-4 sm:px-6 lg:px-10">
      <!-- fallow-ignore-next-line complexity -->
      <AdminPageHeader :title="t('operations.page.heading')">
        <template #tabs>
          <PillTabs
            class="*:shrink-0 *:whitespace-nowrap"
            :model-value="activeTab"
            :items="tabs"
            data-testid="operations-tabs"
            @update:model-value="setActiveTab"
          />
        </template>
      </AdminPageHeader>
    </div>

    <OperationsCashRegistersWorkspace v-if="activeTab === 'cash-registers'" />
    <OperationsCustomerRequestsWorkspace v-else-if="activeTab === 'customer-requests'" />
    <OperationsSellerOnboardingWorkspace v-else-if="activeTab === 'seller-onboarding'" />
    <OperationsMarketplaceCatalogueModerationWorkspace v-else-if="activeTab === 'marketplace-catalogue'" />
    <OperationsMarketplaceOffersWorkspace v-else-if="activeTab === 'marketplace-offers'" />
    <OperationsMarketplaceCategoriesWorkspace v-else-if="activeTab === 'marketplace-categories'" />
    <OperationsDeliveryFeesWorkspace v-else-if="activeTab === 'delivery-fees'" />
    <OperationsLocalitiesWorkspace v-else-if="activeTab === 'localities'" />
    <OperationsShopAgentsWorkspace v-else-if="activeTab === 'shop-agents'" />
    <OperationsVerifiedOffersWorkspace v-else-if="activeTab === 'verified-offers'" />
    <OperationsRefusedLinesWorkspace v-else-if="activeTab === 'refused-lines'" />
    <OperationsKatiWorkspace v-else-if="activeTab === 'kati-points'" />
    <OperationsOrderServicesWorkspace v-else-if="activeTab === 'order-services'" />
    <OperationsInstallmentPlansWorkspace v-else-if="activeTab === 'installment-plans'" />
    <OperationsMarketplaceQuotesWorkspace v-else-if="activeTab === 'marketplace-quotes'" />
    <OperationsReportedReviewsWorkspace v-else-if="activeTab === 'reported-reviews'" />
    <OperationsMarketplaceDisputesWorkspace v-else-if="activeTab === 'marketplace-disputes'" />
    <OperationsSellerFinanceWorkspace v-else-if="activeTab === 'seller-finance'" />
    <OperationsSellerTrustWorkspace v-else-if="activeTab === 'seller-trust'" />
    <OperationsMarketplacePilotWorkspace v-else-if="activeTab === 'marketplace-pilot'" />
    <OperationsOutboundNotificationsWorkspace v-else-if="activeTab === 'outbound-notifications'" />
    <OperationsLegalClosureWorkspace v-else />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"

definePageMeta({ layout: "admin", roles: ["direction", "comptoir", "point_focal"] })

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
  "focal-shops",
  "focal-points",
  "payment-gateway",
  "customer-requests",
  "kati-review",
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

/* WHO SEES WHICH TAB. The counter keeps its desk; the KATI focal point gets
   the requests of its shops (the backend narrows every list to them); the
   direction sees everything except "My shops", which only means something to
   a focal point. A member holding several roles gets the union. */
const COUNTER_TABS: readonly OperationsTab[] = [
  "cash-registers",
  "customer-requests",
  "kati-review",
  "marketplace-catalogue",
  "marketplace-disputes",
  "seller-trust",
]
const FOCAL_TABS: readonly OperationsTab[] = [
  "focal-shops",
  "seller-onboarding",
  "marketplace-catalogue",
  "marketplace-disputes",
  "shop-agents",
  "verified-offers",
  "marketplace-quotes",
  "reported-reviews",
]
const allowedTabs = computed<ReadonlySet<OperationsTab>>(() => {
  const roles = session.value?.roles ?? []
  const allowed = new Set<OperationsTab>([
    ...(isDirection.value ? ["cash-registers" as const, ...QUERY_TABS] : []),
    ...(roles.includes("comptoir") ? COUNTER_TABS : []),
    ...(roles.includes("point_focal") ? FOCAL_TABS : []),
  ])
  if (!roles.includes("point_focal")) allowed.delete("focal-shops")
  return allowed
})
const defaultTab = computed<OperationsTab>(() =>
  allowedTabs.value.has("cash-registers") ? "cash-registers" : "focal-shops",
)

function tabFromQuery(value: unknown): OperationsTab {
  const tab = QUERY_TABS.find(candidate => candidate === value)
  return tab && allowedTabs.value.has(tab) ? tab : defaultTab.value
}

const activeTab = ref<OperationsTab>(tabFromQuery(route.query.tab))
watch(
  () => route.query.tab,
  value => {
    activeTab.value = tabFromQuery(value)
  },
)
watch(allowedTabs, allowed => {
  if (!allowed.has(activeTab.value)) setActiveTab(defaultTab.value)
})

const ALL_TABS = computed(() => [
  {
    value: "focal-shops",
    label: t("operations.tabs.focalShops.label"),
    icon: "ph:map-pin-area",
    testid: "operations-tab-focal-shops",
  },
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
    value: "kati-review",
    label: t("assistant.kati.tab"),
    icon: "ph:sparkle",
    testid: "operations-tab-kati-review",
  },
  {
    value: "seller-onboarding",
    label: t("admin.navigation.items.sellerOnboarding"),
    icon: "ph:storefront",
    testid: "operations-tab-seller-onboarding",
  },
  {
    value: "marketplace-catalogue",
    label: t("admin.navigation.items.catalogueModeration"),
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
  {
    value: "focal-points",
    label: t("operations.tabs.focalPoints.label"),
    icon: "ph:users-three",
    testid: "operations-tab-focal-points",
  },
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
    value: "payment-gateway",
    label: t("operations.tabs.paymentGateway.label"),
    icon: "ph:credit-card",
    testid: "operations-tab-payment-gateway",
  },
  {
    value: "seller-finance",
    label: t("admin.navigation.items.sellerFinance"),
    icon: "ph:wallet",
    testid: "operations-tab-seller-finance",
  },
  {
    value: "legal-closure",
    label: t("admin.navigation.items.legalClosure"),
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
])
const tabs = computed(() => ALL_TABS.value.filter(tab => allowedTabs.value.has(tab.value as OperationsTab)))
const currentModule = computed(() => tabs.value.find(tab => tab.value === activeTab.value))

function setActiveTab(value: string) {
  const nextTab = tabFromQuery(value)
  activeTab.value = nextTab
  void navigateTo({
    path: route.path,
    query: nextTab === defaultTab.value ? {} : { tab: nextTab },
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
      <AdminPageHeader :title="currentModule?.label ?? t('operations.page.heading')">
        {{ t("operations.page.moduleHelp") }}
        <template #actions>
          <div class="flex w-full flex-col gap-1 sm:w-72">
            <label for="operations-module" class="text-xs font-medium text-muted-foreground">
              {{ t("operations.page.chooseModule") }}
            </label>
            <select
              id="operations-module"
              data-testid="operations-module-select"
              :aria-label="t('operations.page.chooseModule')"
              :value="activeTab"
              class="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              @change="setActiveTab(($event.target as HTMLSelectElement).value)"
            >
              <option
                v-for="tab in tabs"
                :key="tab.value"
                :value="tab.value"
                :selected="tab.value === activeTab"
                :data-testid="tab.testid"
                :aria-current="tab.value === activeTab ? 'true' : undefined"
              >
                {{ tab.label }}
              </option>
            </select>
          </div>
        </template>
      </AdminPageHeader>
    </div>

    <OperationsCashRegistersWorkspace v-if="activeTab === 'cash-registers'" />
    <OperationsFocalShopsWorkspace v-else-if="activeTab === 'focal-shops'" />
    <OperationsFocalPointsWorkspace v-else-if="activeTab === 'focal-points'" />
    <OperationsPaymentGatewayWorkspace v-else-if="activeTab === 'payment-gateway'" />
    <OperationsCustomerRequestsWorkspace v-else-if="activeTab === 'customer-requests'" />
    <OperationsKatiReviewWorkspace v-else-if="activeTab === 'kati-review'" />
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

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
  "marketplace-disputes",
  "seller-trust",
  "legal-closure",
] as const
type OperationsTab = "cash-registers" | (typeof QUERY_TABS)[number]

function tabFromQuery(value: unknown): OperationsTab {
  const tab = QUERY_TABS.find(candidate => candidate === value)
  return tab === "legal-closure" && !isDirection.value ? "cash-registers" : (tab ?? "cash-registers")
}

const activeTab = ref<OperationsTab>(tabFromQuery(route.query.tab))
watch(
  () => route.query.tab,
  value => {
    activeTab.value = tabFromQuery(value)
  },
)
watch(isDirection, allowed => {
  if (!allowed && activeTab.value === "legal-closure") setActiveTab("cash-registers")
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
          value: "legal-closure",
          label: "Clôture juridique P0",
          icon: "ph:seal-check",
          testid: "operations-tab-legal-closure",
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
    <OperationsMarketplaceDisputesWorkspace v-else-if="activeTab === 'marketplace-disputes'" />
    <OperationsSellerTrustWorkspace v-else-if="activeTab === 'seller-trust'" />
    <OperationsLegalClosureWorkspace v-else />
  </div>
</template>

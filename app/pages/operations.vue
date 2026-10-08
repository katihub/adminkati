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

const QUERY_TABS = ["customer-requests"] as const
type OperationsTab = "cash-registers" | (typeof QUERY_TABS)[number]

function tabFromQuery(value: unknown): OperationsTab {
  return QUERY_TABS.find(tab => tab === value) ?? "cash-registers"
}

const activeTab = ref<OperationsTab>(tabFromQuery(route.query.tab))
watch(
  () => route.query.tab,
  value => {
    activeTab.value = tabFromQuery(value)
  },
)

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
    <OperationsCustomerRequestsWorkspace v-else />
  </div>
</template>

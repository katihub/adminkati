import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

const operationsWorkspaceStubs = {
  OperationsCashRegistersWorkspace: { template: '<div data-testid="operations-cash-registers-workspace" />' },
  OperationsCustomerRequestsWorkspace: { template: '<div data-testid="operations-customer-requests-workspace" />' },
  OperationsSellerOnboardingWorkspace: { template: '<div data-testid="operations-seller-onboarding-workspace" />' },
  OperationsMarketplaceCatalogueModerationWorkspace: {
    template: '<div data-testid="operations-marketplace-catalogue-workspace" />',
  },
  OperationsMarketplaceDisputesWorkspace: {
    template: '<div data-testid="operations-marketplace-disputes-workspace" />',
  },
  OperationsMarketplaceOffersWorkspace: {
    template: '<div data-testid="operations-marketplace-offers-workspace" />',
  },
  OperationsMarketplaceCategoriesWorkspace: {
    template: '<div data-testid="operations-marketplace-categories-workspace" />',
  },
  OperationsDeliveryFeesWorkspace: {
    template: '<div data-testid="operations-delivery-fees-workspace" />',
  },
  OperationsLocalitiesWorkspace: {
    template: '<div data-testid="operations-localities-workspace" />',
  },
  OperationsShopAgentsWorkspace: {
    template: '<div data-testid="operations-shop-agents-workspace" />',
  },
  OperationsVerifiedOffersWorkspace: {
    template: '<div data-testid="operations-verified-offers-workspace" />',
  },
  OperationsRefusedLinesWorkspace: {
    template: '<div data-testid="operations-refused-lines-workspace" />',
  },
  OperationsKatiWorkspace: {
    template: '<div data-testid="operations-kati-points-workspace" />',
  },
  OperationsOrderServicesWorkspace: {
    template: '<div data-testid="operations-order-services-workspace" />',
  },
  OperationsMarketplaceQuotesWorkspace: {
    template: '<div data-testid="operations-marketplace-quotes-workspace" />',
  },
  OperationsReportedReviewsWorkspace: {
    template: '<div data-testid="operations-reported-reviews-workspace" />',
  },
  OperationsSellerTrustWorkspace: { template: '<div data-testid="operations-seller-trust-workspace" />' },
  OperationsLegalClosureWorkspace: { template: '<div data-testid="operations-legal-closure-workspace" />' },
  OperationsMarketplacePilotWorkspace: { template: '<div data-testid="operations-marketplace-pilot-workspace" />' },
  OperationsOutboundNotificationsWorkspace: {
    template: '<div data-testid="operations-outbound-notifications-workspace" />',
  },
}

const workspaces = [
  "cash-registers",
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
  "marketplace-quotes",
  "reported-reviews",
  "marketplace-disputes",
  "seller-trust",
  "legal-closure",
  "marketplace-pilot",
  "outbound-notifications",
] as const

function signIn(roles: string[] = ["direction"]) {
  useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
    type: "equipe",
    userId: "u1",
    membreId: "m1",
    nom: "Admin",
    courriel: "admin@example.com",
    roles,
  })
}

async function mountOperations(route = "/operations", roles?: string[]) {
  signIn(roles)
  const { default: App } = await import("@/app.vue")
  const wrapper = await mountSuspended(App, {
    attachTo: document.body,
    global: { stubs: operationsWorkspaceStubs },
    route,
  })
  await flushPromises()
  return wrapper
}

describe("operations page tabs", () => {
  // The first mount compiles the whole app; paying it here keeps that cost out of the first case.
  beforeAll(async () => {
    await import("@/app.vue")
  })
  afterEach(() => useNuxtApp().$queryClient.clear())

  it.each([
    ["cash-registers", "/operations"],
    ["customer-requests", "/operations?tab=customer-requests"],
    ["seller-onboarding", "/operations?tab=seller-onboarding"],
    ["marketplace-catalogue", "/operations?tab=marketplace-catalogue"],
    ["marketplace-offers", "/operations?tab=marketplace-offers"],
    ["marketplace-categories", "/operations?tab=marketplace-categories"],
    ["delivery-fees", "/operations?tab=delivery-fees"],
    ["localities", "/operations?tab=localities"],
    ["shop-agents", "/operations?tab=shop-agents"],
    ["verified-offers", "/operations?tab=verified-offers"],
    ["refused-lines", "/operations?tab=refused-lines"],
    ["kati-points", "/operations?tab=kati-points"],
    ["order-services", "/operations?tab=order-services"],
    ["marketplace-quotes", "/operations?tab=marketplace-quotes"],
    ["reported-reviews", "/operations?tab=reported-reviews"],
    ["marketplace-disputes", "/operations?tab=marketplace-disputes"],
    ["seller-trust", "/operations?tab=seller-trust"],
    ["legal-closure", "/operations?tab=legal-closure"],
    ["marketplace-pilot", "/operations?tab=marketplace-pilot"],
    ["outbound-notifications", "/operations?tab=outbound-notifications"],
  ] as const)("opens only the %s workspace from its shareable URL", async (activeWorkspace, route) => {
    const wrapper = await mountOperations(route)

    expect(wrapper.get(`[data-testid='operations-tab-${activeWorkspace}']`).attributes("aria-current")).toBe("true")
    for (const workspace of workspaces) {
      expect(wrapper.find(`[data-testid='operations-${workspace}-workspace']`).exists()).toBe(
        workspace === activeWorkspace,
      )
    }

    wrapper.unmount()
  })

  it.each([
    "seller-onboarding",
    "marketplace-catalogue",
    "marketplace-offers",
    "marketplace-categories",
    "delivery-fees",
    "localities",
    "shop-agents",
    "shop-agents",
    "localities",
    "shop-agents",
    "shop-agents",
    "verified-offers",
    "refused-lines",
    "kati-points",
    "order-services",
    "marketplace-quotes",
    "reported-reviews",
    "marketplace-disputes",
    "seller-trust",
    "legal-closure",
    "marketplace-pilot",
    "outbound-notifications",
  ] as const)("updates the route when an operator opens the %s workspace", async activeWorkspace => {
    const wrapper = await mountOperations()

    await wrapper.get(`[data-testid='operations-tab-${activeWorkspace}']`).trigger("click")
    await flushPromises()

    await vi.waitFor(() => expect(useRoute().query).toEqual({ tab: activeWorkspace }))
    expect(wrapper.get(`[data-testid='operations-tab-${activeWorkspace}']`).attributes("aria-current")).toBe("true")
    for (const workspace of workspaces) {
      expect(wrapper.find(`[data-testid='operations-${workspace}-workspace']`).exists()).toBe(
        workspace === activeWorkspace,
      )
    }

    wrapper.unmount()
  })

  it.each([
    "marketplace-offers",
    "marketplace-pilot",
    "outbound-notifications",
    "marketplace-categories",
    "delivery-fees",
    "localities",
    "shop-agents",
    "shop-agents",
    "localities",
    "shop-agents",
    "shop-agents",
    "verified-offers",
    "refused-lines",
    "kati-points",
    "order-services",
    "marketplace-quotes",
    "reported-reviews",
  ] as const)("keeps the direction-only %s workspace closed to the counter", async workspace => {
    const wrapper = await mountOperations(`/operations?tab=${workspace}`, ["comptoir"])

    expect(wrapper.find(`[data-testid='operations-tab-${workspace}']`).exists()).toBe(false)
    expect(wrapper.find(`[data-testid='operations-${workspace}-workspace']`).exists()).toBe(false)
    expect(wrapper.find("[data-testid='operations-cash-registers-workspace']").exists()).toBe(true)

    wrapper.unmount()
  })
})

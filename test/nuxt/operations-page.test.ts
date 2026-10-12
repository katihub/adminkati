import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"

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
  OperationsSellerTrustWorkspace: { template: '<div data-testid="operations-seller-trust-workspace" />' },
  OperationsLegalClosureWorkspace: { template: '<div data-testid="operations-legal-closure-workspace" />' },
}

const workspaces = [
  "cash-registers",
  "customer-requests",
  "seller-onboarding",
  "marketplace-catalogue",
  "marketplace-disputes",
  "seller-trust",
  "legal-closure",
] as const

function signIn() {
  useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
    type: "equipe",
    userId: "u1",
    membreId: "m1",
    nom: "Admin",
    courriel: "admin@example.com",
    roles: ["direction"],
  })
}

async function mountOperations(route = "/operations") {
  signIn()
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
  afterEach(() => useNuxtApp().$queryClient.clear())

  it.each([
    ["cash-registers", "/operations"],
    ["customer-requests", "/operations?tab=customer-requests"],
    ["seller-onboarding", "/operations?tab=seller-onboarding"],
    ["marketplace-catalogue", "/operations?tab=marketplace-catalogue"],
    ["marketplace-disputes", "/operations?tab=marketplace-disputes"],
    ["seller-trust", "/operations?tab=seller-trust"],
    ["legal-closure", "/operations?tab=legal-closure"],
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
    "marketplace-disputes",
    "seller-trust",
    "legal-closure",
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
})

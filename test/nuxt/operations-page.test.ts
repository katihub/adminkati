import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"

const operationsWorkspaceStubs = {
  OperationsCashRegistersWorkspace: { template: '<div data-testid="operations-cash-registers-workspace" />' },
  OperationsCustomerRequestsWorkspace: { template: '<div data-testid="operations-customer-requests-workspace" />' },
}

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

  it("opens Cash Registers as the default workspace", async () => {
    const wrapper = await mountOperations()

    expect(wrapper.get("[data-testid='operations-tab-cash-registers']").attributes("aria-current")).toBe("true")
    expect(wrapper.find("[data-testid='operations-cash-registers-workspace']").exists()).toBe(true)

    wrapper.unmount()
  })

  it("opens Customer Requests from a shareable tab URL", async () => {
    const wrapper = await mountOperations("/operations?tab=customer-requests")

    expect(wrapper.get("[data-testid='operations-tab-customer-requests']").attributes("aria-current")).toBe("true")
    expect(wrapper.find("[data-testid='operations-customer-requests-workspace']").exists()).toBe(true)

    wrapper.unmount()
  })

  it("updates the route when an operator changes the workspace tab", async () => {
    const wrapper = await mountOperations()

    await wrapper.get("[data-testid='operations-tab-customer-requests']").trigger("click")
    await flushPromises()

    await vi.waitFor(() => expect(useRoute().query).toEqual({ tab: "customer-requests" }))
    expect(wrapper.get("[data-testid='operations-tab-customer-requests']").attributes("aria-current")).toBe("true")

    wrapper.unmount()
  })
})

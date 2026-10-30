import { mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, describe, expect, it } from "vitest"
import AdminModuleSearch from "@/components/admin/AdminModuleSearch.vue"

describe("admin module search", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("only proposes accessible destinations matching the translated label", async () => {
    useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
      userId: "u1",
      membreId: "m1",
      nom: "Agent",
      courriel: "agent@example.com",
      roles: ["comptoir"],
    })
    const wrapper = await mountSuspended(AdminModuleSearch)

    await wrapper.get("input").setValue("prod")

    expect(wrapper.get("[data-testid='admin-module-search-results']").text()).toContain("Products")
    expect(wrapper.text()).not.toContain("Seller finance")
  })
})

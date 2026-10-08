import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import ContentPage from "@/pages/content.vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

function seedSession() {
  useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
    userId: "u1",
    membreId: "m1",
    nom: "Admin",
    courriel: "admin@example.com",
    roles: ["direction"],
  })
}

describe("banner list robustness", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  /**
   * A live-backend outage or a shape mismatch can land a non-array success response in
   * the query cache — `bannersData.value ?? []` only catches null/undefined, not a wrong
   * shape, and `filterBanners`/`selectedBanner`'s `.find` both then throw
   * `banners.filter is not a function`, a full-page 500 instead of the ordinary error or
   * empty state the grid already has a UI for. This is the exact failure this test
   * reproduces and guards against.
   */
  it("shows the empty state instead of crashing when the banners query resolves to a non-array value", async () => {
    seedSession()
    useNuxtApp().$queryClient.setQueryData(apiQueryKeys.banners.all, { message: "Service Unavailable" })

    const wrapper = await mountSuspended(ContentPage, { attachTo: document.body })
    await flushPromises()

    expect(wrapper.find("[data-testid='banner-grid-empty']").exists()).toBe(true)
    expect(wrapper.find("[data-testid='banner-grid-content']").exists()).toBe(false)

    wrapper.unmount()
  })
})

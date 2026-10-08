import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { describe, expect, it, vi } from "vitest"
import ContentPage from "@/pages/content.vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

describe("content page tabs", () => {
  it("marks banners as the active tab by default", async () => {
    const wrapper = await mountSuspended(ContentPage, { attachTo: document.body })

    expect(wrapper.get("[data-testid='content-tab-banners']").attributes("aria-current")).toBe("true")

    wrapper.unmount()
  })

  it("switches the active tab to propositions when that tab is chosen", async () => {
    const wrapper = await mountSuspended(ContentPage, { attachTo: document.body })

    await wrapper.get("[data-testid='content-tab-propositions']").trigger("click")
    await flushPromises()

    expect(wrapper.get("[data-testid='content-tab-propositions']").attributes("aria-current")).toBe("true")
    expect(wrapper.get("[data-testid='content-tab-banners']").attributes("aria-current")).toBeUndefined()

    wrapper.unmount()
  })

  it("opens the points of sale tab from the query, so a link to it can be shared", async () => {
    const queryClient = useNuxtApp().$queryClient
    queryClient.setQueryData(["v1", "moi"], {
      userId: "u1",
      membreId: "m1",
      nom: "Admin",
      courriel: "admin@example.com",
      roles: ["comptoir"],
    })
    queryClient.setQueryData(apiQueryKeys.pointsOfSale.all, [])
    const wrapper = await mountSuspended(ContentPage, {
      route: "/content?tab=points-de-vente",
      attachTo: document.body,
    })

    expect(wrapper.get("[data-testid='content-tab-points-of-sale']").attributes("aria-current")).toBe("true")
    expect(wrapper.find("[data-testid='points-of-sale-toolbar']").exists()).toBe(true)

    wrapper.unmount()
    queryClient.clear()
  })

  it("brings the current tab into the strip when the tabs are wider than a phone", async () => {
    const queryClient = useNuxtApp().$queryClient
    queryClient.setQueryData(["v1", "moi"], {
      userId: "u1",
      membreId: "m1",
      nom: "Admin",
      courriel: "admin@example.com",
      roles: ["comptoir"],
    })
    queryClient.setQueryData(apiQueryKeys.pointsOfSale.all, [])
    // A 342 px strip holding 416 px of tabs, as measured at 390 px: the DOM here has no layout.
    const tabEdges: Record<string, [number, number]> = {
      "content-tab-banners": [0, 120],
      "content-tab-propositions": [120, 260],
      "content-tab-points-of-sale": [260, 416],
    }
    const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      const strip = this.closest<HTMLElement>("[data-testid='admin-page-header-tabs']")
      const edges = tabEdges[this.dataset.testid ?? ""]
      const [left, right] = edges && strip ? (edges.map(edge => edge - strip.scrollLeft) as [number, number]) : [0, 342]
      return { left, right, top: 0, bottom: 40, width: right - left, height: 40, x: left, y: 0, toJSON: () => ({}) }
    })

    const wrapper = await mountSuspended(ContentPage, {
      route: "/content?tab=points-de-vente",
      attachTo: document.body,
    })
    const strip = wrapper.get("[data-testid='admin-page-header-tabs']").element as HTMLElement

    expect(strip.scrollLeft).toBe(74)

    await wrapper.get("[data-testid='content-tab-banners']").trigger("click")
    await flushPromises()

    expect(strip.scrollLeft).toBe(0)

    rect.mockRestore()
    wrapper.unmount()
    queryClient.clear()
  })
})

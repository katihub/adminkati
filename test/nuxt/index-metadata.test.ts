import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { describe, expect, it, vi } from "vitest"
import App from "@/app.vue"
import { apercuFixture, stubsGraphiques } from "./apercu-fixture"

describe("index page metadata", () => {
  it("provides localized SEO metadata", async () => {
    useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
      userId: "u1",
      membreId: "m1",
      nom: "Admin",
      courriel: "admin@example.com",
      roles: ["direction"],
    })
    useNuxtApp().$queryClient.setQueryData(["v1", "statistiques", "apercu", "30j"], apercuFixture)
    const appWrapper = await mountSuspended(App, { route: "/", global: { stubs: stubsGraphiques } })
    await flushPromises()
    const { default: IndexPage } = await import("@/pages/index.vue")
    const wrapper = await mountSuspended(IndexPage, {
      route: "/",
      global: { stubs: stubsGraphiques },
    })
    await flushPromises()
    await flushPromises()
    await vi.waitFor(() => expect(document.title).toBe("NowTech Admin"))

    expect(document.head.querySelector("meta[name='description']")?.getAttribute("content")).toBe(
      "Overview of NowTech sales, operations, cash health and open actions.",
    )
    expect(document.head.querySelector("meta[property='og:title']")?.getAttribute("content")).toBe("NowTech Admin")
    expect(document.head.querySelector("meta[property='og:description']")?.getAttribute("content")).toBe(
      "Overview of NowTech sales, operations, cash health and open actions.",
    )
    expect(document.head.querySelector("meta[name='twitter:card']")).toBeNull()

    wrapper.unmount()
    appWrapper.unmount()
  })
})

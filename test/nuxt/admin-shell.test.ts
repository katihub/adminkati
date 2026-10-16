import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { isAdminNavigationItemActive } from "@/utils/admin-navigation"

describe("admin shell", () => {
  beforeEach(() => {
    useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
      userId: "u1",
      membreId: "m1",
      nom: "Admin",
      courriel: "admin@example.com",
      roles: ["direction"],
    })
  })
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("renders the Pilotage route in the admin shell as the active navigation item", async () => {
    const { default: App } = await import("@/app.vue")
    const wrapper = await mountSuspended(App, {
      attachTo: document.body,
      route: "/",
    })
    await flushPromises()

    expect(wrapper.get("[data-testid='admin-shell']")).toBeTruthy()
    expect(wrapper.get("[data-testid='admin-navigation-link-pilotage']").text()).toContain("Overview")
    expect(wrapper.get("[data-testid='admin-navigation-link-pilotage']").attributes("aria-current")).toBe("page")
    expect(wrapper.get("[data-testid='admin-page-header-title']").text()).toBe("Operations overview")

    wrapper.unmount()
  })

  it("keeps the login route outside the admin shell", async () => {
    const { default: App } = await import("@/app.vue")

    for (const route of ["/login", "/fr/connexion"]) {
      const wrapper = await mountSuspended(App, {
        attachTo: document.body,
        route,
      })
      await flushPromises()

      expect(wrapper.find("[data-testid='admin-shell']").exists()).toBe(false)
      wrapper.unmount()
    }
  })

  it("renders the localized Pilotage route as active in French", async () => {
    const { default: App } = await import("@/app.vue")
    const wrapper = await mountSuspended(App, {
      attachTo: document.body,
      route: "/fr/",
    })
    await flushPromises()

    expect(wrapper.get("[data-testid='admin-navigation-link-pilotage']").text()).toContain("Pilotage")
    expect(wrapper.get("[data-testid='admin-navigation-link-pilotage']").attributes("aria-current")).toBe("page")

    wrapper.unmount()
  })
})

describe("admin navigation", () => {
  it("matches a navigation item against its own localized route instead of Overview state", () => {
    expect(
      isAdminNavigationItemActive(
        {
          id: "payments",
          labelKey: "admin.navigation.payments",
          to: "/payments",
          routeNames: ["payments"],
          icon: "ph:money",
        },
        { name: "payments___fr", path: "/fr/payments", query: {} },
      ),
    ).toBe(true)
    expect(
      isAdminNavigationItemActive(
        {
          id: "pilotage",
          labelKey: "admin.navigation.pilotage",
          to: "/",
          routeNames: ["index"],
          icon: "ph:chart-donut",
        },
        { name: "payments___fr", path: "/fr/payments", query: {} },
      ),
    ).toBe(false)
  })
})

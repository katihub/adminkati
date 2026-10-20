import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { createError } from "h3"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import AdminProfileMenu from "@/components/admin/AdminProfileMenu.vue"

describe("admin profile menu", () => {
  beforeEach(() => {
    useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
      userId: "u1",
      membreId: "m1",
      nom: "Awa Ngo",
      courriel: "awa@example.com",
      roles: ["direction"],
    })
  })
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("shows the logged-in user's initials on the trigger and name/email in the menu", async () => {
    const wrapper = await mountSuspended(AdminProfileMenu, {
      attachTo: document.body,
    })

    expect(wrapper.get("[data-testid='admin-profile-trigger']").text()).toBe("AN")

    await wrapper.get("[data-testid='admin-profile-trigger']").trigger("click")

    expect(document.body.querySelector("[data-testid='admin-profile-name']")?.textContent).toBe("Awa Ngo")
    expect(document.body.querySelector("[data-testid='admin-profile-email']")?.textContent).toBe("awa@example.com")

    wrapper.unmount()
  })

  it("does not duplicate the global language switcher in the profile menu", async () => {
    const { default: App } = await import("@/app.vue")
    const wrapper = await mountSuspended(App, {
      attachTo: document.body,
      route: "/",
    })
    await flushPromises()
    await wrapper.get("[data-testid='admin-profile-trigger']").trigger("click")
    expect(
      document.body.querySelector("[data-testid='admin-profile-content'] [data-testid='language-switcher-trigger']"),
    ).toBeNull()
    wrapper.unmount()
  })

  it("logs out, clears the cached identity, and returns to the login page", async () => {
    const cleanup = registerEndpoint("/api/auth/logout", {
      method: "POST",
      handler: () => null,
    })
    const queryClient = useNuxtApp().$queryClient
    useNuxtApp().$i18n.locale.value = "en"
    const router = useRouter()
    const push = vi.spyOn(router, "push")
    const { default: App } = await import("@/app.vue")
    const wrapper = await mountSuspended(App, {
      attachTo: document.body,
      route: "/",
    })

    await wrapper.get("[data-testid='admin-profile-trigger']").trigger("click")
    const logout = document.body.querySelector("[data-testid='admin-profile-logout']")
    expect(logout).not.toBeNull()
    logout?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
    await flushPromises()

    expect(queryClient.getQueryData(["v1", "moi"])).toBeUndefined()
    expect(push).toHaveBeenCalledWith("/login")

    push.mockRestore()
    cleanup()
    wrapper.unmount()
  })

  it("toggles between the light and dark preferences from the profile menu", async () => {
    const colorMode = useColorMode()
    colorMode.preference = "light"
    const wrapper = await mountSuspended(AdminProfileMenu, {
      attachTo: document.body,
    })

    await wrapper.get("[data-testid='admin-profile-trigger']").trigger("click")
    const toggle = document.body.querySelector("[data-testid='admin-theme-toggle']")
    expect(toggle?.getAttribute("role")).toBe("switch")
    expect(toggle?.getAttribute("aria-checked")).toBe("false")

    toggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    await flushPromises()
    expect(colorMode.preference).toBe("dark")
    expect(toggle?.getAttribute("aria-checked")).toBe("true")

    toggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    await flushPromises()
    expect(colorMode.preference).toBe("light")
    expect(toggle?.getAttribute("aria-checked")).toBe("false")

    wrapper.unmount()
    colorMode.preference = "system"
  })

  it("clears local auth and returns to login when the logout request fails", async () => {
    const cleanup = registerEndpoint("/api/auth/logout", {
      method: "POST",
      handler: () => {
        throw createError({ statusCode: 503 })
      },
    })
    const queryClient = useNuxtApp().$queryClient
    useNuxtApp().$i18n.locale.value = "en"
    const router = useRouter()
    const push = vi.spyOn(router, "push")
    const { default: App } = await import("@/app.vue")
    const wrapper = await mountSuspended(App, {
      attachTo: document.body,
      route: "/",
    })

    await wrapper.get("[data-testid='admin-profile-trigger']").trigger("click")
    const logout = document.body.querySelector("[data-testid='admin-profile-logout']")
    logout?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
    await flushPromises()

    expect(queryClient.getQueryData(["v1", "moi"])).toBeUndefined()
    expect(push).toHaveBeenCalledWith("/login")

    push.mockRestore()
    cleanup()
    wrapper.unmount()
  })
})

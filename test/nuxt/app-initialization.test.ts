import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { describe, expect, it } from "vitest"

describe("app initialization", () => {
  it("boots cleanly and persists the active locale", async () => {
    window.localStorage.clear()
    const { default: App } = await import("@/app.vue")

    // La page de connexion est la seule page publique qui reste, et c'est la
    // première que voit un visiteur : c'est là que la langue doit tenir.
    const wrapper = await mountSuspended(App, {
      attachTo: document.body,
      route: "/fr/connexion",
    })
    await flushPromises()
    expect(wrapper.get("h1").text()).toBe("Connectez-vous à votre compte")
    expect(wrapper.get("[data-testid='language-switcher-trigger']").text()).toContain("Français")
    expect(window.localStorage.getItem("NT-LANG")).toBe("fr")

    wrapper.unmount()
    window.localStorage.clear()
  })
})

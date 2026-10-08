import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { describe, expect, it } from "vitest"

describe("loginPage", () => {
  it("mounts the login form and showcase panel at /login", async () => {
    const { default: App } = await import("@/app.vue")

    const wrapper = await mountSuspended(App, {
      attachTo: document.body,
      route: "/login",
    })
    await flushPromises()

    expect(wrapper.find("[data-testid='login-form']").exists()).toBe(true)
    expect(wrapper.get("[data-testid='login-showcase']").text()).toContain(
      "Every decision, backed by the numbers behind it.",
    )

    wrapper.unmount()
  })

  it("renders French copy at /fr/connexion, proving the auth domain is registered and the localized path resolves", async () => {
    const { default: App } = await import("@/app.vue")

    const wrapper = await mountSuspended(App, {
      attachTo: document.body,
      route: "/fr/connexion",
    })
    await flushPromises()

    expect(wrapper.get("[data-testid='login-heading']").text()).toBe("Connectez-vous à votre compte")
    expect(wrapper.get("[data-testid='login-showcase']").text()).toContain(
      "Chaque décision, appuyée par les chiffres qui la justifient.",
    )

    wrapper.unmount()
  })
})

import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { createError } from "h3"
import { describe, expect, it } from "vitest"

describe("login submission", () => {
  async function mountLogin() {
    const { default: App } = await import("@/app.vue")
    return mountSuspended(App, { attachTo: document.body, route: "/login" })
  }

  async function submit(wrapper: Awaited<ReturnType<typeof mountLogin>>) {
    await wrapper.get("[data-testid='login-email'] input").setValue("person@example.com")
    await wrapper.get("[data-testid='login-password'] input").setValue("a<b>c")
    await wrapper.get("[data-testid='login-submit']").trigger("click")
    await flushPromises()
  }

  it("shows the translated credentials error and clears pending after a 401", async () => {
    const cleanup = registerEndpoint("/api/auth/login", {
      method: "POST",
      handler: () => {
        throw createError({ statusCode: 401, data: { reason: "invalid_credentials" } })
      },
    })
    const wrapper = await mountLogin()
    await submit(wrapper)

    expect(wrapper.get("[data-testid='login-form-error']").text()).toContain("email address and password")
    expect(wrapper.get("[data-testid='login-submit']").attributes("disabled")).toBeUndefined()

    cleanup()
    wrapper.unmount()
  })

  it("uses a distinct deactivated message for a 403 reason", async () => {
    const cleanup = registerEndpoint("/api/auth/login", {
      method: "POST",
      handler: () => {
        throw createError({ statusCode: 403, data: { reason: "deactivated" } })
      },
    })
    const wrapper = await mountLogin()
    await submit(wrapper)

    expect(wrapper.get("[data-testid='login-form-error']").text()).toContain("access has been withdrawn")

    cleanup()
    wrapper.unmount()
  })

  it("shows the deactivated message after the auth failure redirect", async () => {
    const { default: App } = await import("@/app.vue")
    const wrapper = await mountSuspended(App, {
      attachTo: document.body,
      route: "/login?reason=deactivated",
    })

    expect(wrapper.get("[data-testid='login-form-error']").text()).toContain("access has been withdrawn")

    wrapper.unmount()
  })
})

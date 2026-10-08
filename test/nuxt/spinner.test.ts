import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import LoginForm from "@/components/auth/LoginForm.vue"
import Spinner from "@/components/Spinner.vue"

describe("spinner", () => {
  it("stays out of the accessibility tree when it carries no label", async () => {
    // The default use is inside a control that already announces itself busy,
    // where a second announcement would be noise rather than help.
    const wrapper = await mountSuspended(Spinner)
    const spinner = wrapper.get("[data-testid='spinner']")

    expect(spinner.attributes("aria-hidden")).toBe("true")
    expect(spinner.attributes("role")).toBeUndefined()

    wrapper.unmount()
  })

  it("announces itself when given a label, for standalone use", async () => {
    const wrapper = await mountSuspended(Spinner, { props: { label: "Loading orders" } })
    const spinner = wrapper.get("[data-testid='spinner']")

    expect(spinner.attributes("role")).toBe("status")
    expect(spinner.attributes("aria-label")).toBe("Loading orders")
    expect(spinner.attributes("aria-hidden")).toBeUndefined()

    wrapper.unmount()
  })
})

describe("spinner in the sign-in control", () => {
  it("appears while a sign-in is in flight", async () => {
    const wrapper = await mountSuspended(LoginForm, {
      attachTo: document.body,
      props: { pending: true },
    })

    expect(wrapper.find("[data-testid='login-submit'] [data-testid='spinner']").exists()).toBe(true)

    wrapper.unmount()
  })

  it("is absent while the control is idle", async () => {
    const wrapper = await mountSuspended(LoginForm, {
      attachTo: document.body,
      props: { pending: false },
    })

    expect(wrapper.find("[data-testid='spinner']").exists()).toBe(false)

    wrapper.unmount()
  })
})

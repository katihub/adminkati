import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { describe, expect, it } from "vitest"
import LoginForm from "@/components/auth/LoginForm.vue"

describe("authLoginForm", () => {
  it("refuses an empty submission and wires each field to its own error message", async () => {
    const wrapper = await mountSuspended(LoginForm, { attachTo: document.body })

    await wrapper.get("form").trigger("submit")
    await flushPromises()

    expect(wrapper.emitted("submit")).toBeUndefined()

    for (const field of ["email", "password"]) {
      const input = wrapper.get(`[data-testid='login-${field}'] input`)
      const label = wrapper.get(`[data-testid='login-${field}'] label`)

      expect(input.attributes("aria-invalid")).toBe("true")
      expect(label.attributes("for")).toBe(input.attributes("id"))

      const messageId = input.attributes("aria-describedby")
      expect(messageId).toBeTruthy()
      expect(wrapper.get(`[id='${messageId}']`).text()).toBe("This field is required.")
    }

    wrapper.unmount()
  })

  it("emits the normalized credentials once the fields are valid", async () => {
    const wrapper = await mountSuspended(LoginForm, { attachTo: document.body })

    await wrapper.get("[data-testid='login-email'] input").setValue("  Ada@Example.COM  ")
    await wrapper.get("[data-testid='login-password'] input").setValue("hunter2")
    await flushPromises()

    await wrapper.get("form").trigger("submit")
    await flushPromises()

    expect(wrapper.emitted("submit")).toStrictEqual([[{ email: "ada@example.com", password: "hunter2" }]])

    wrapper.unmount()
  })

  it("clears a field's error as the user repairs it, but never before a submission", async () => {
    const wrapper = await mountSuspended(LoginForm, { attachTo: document.body })
    const email = wrapper.get("[data-testid='login-email'] input")

    await email.setValue("not-an-address")
    await email.trigger("blur")
    await flushPromises()
    expect(email.attributes("aria-invalid")).toBeUndefined()

    await wrapper.get("form").trigger("submit")
    await flushPromises()
    expect(email.attributes("aria-invalid")).toBe("true")

    await email.setValue("ada@example.com")
    await flushPromises()
    expect(email.attributes("aria-invalid")).toBeUndefined()

    wrapper.unmount()
  })

  it("locks the submit control and announces itself busy while a sign-in is in flight", async () => {
    const wrapper = await mountSuspended(LoginForm, {
      attachTo: document.body,
      props: { pending: true },
    })
    const submit = wrapper.get("[data-testid='login-submit']")

    expect(submit.attributes("disabled")).toBeDefined()
    expect(submit.attributes("aria-busy")).toBe("true")
    expect(submit.text()).toContain("Signing in")

    wrapper.unmount()
  })

  it("announces a form-level failure handed down by the page", async () => {
    const message = "That email address and password do not match."
    const wrapper = await mountSuspended(LoginForm, {
      attachTo: document.body,
      props: { error: message },
    })

    expect(wrapper.get("[role='alert']").text()).toContain(message)

    wrapper.unmount()
  })

  it("reveals and re-masks the password, renaming the control each way", async () => {
    const wrapper = await mountSuspended(LoginForm, { attachTo: document.body })
    const password = wrapper.get("[data-testid='login-password'] input")
    const toggle = wrapper.get("[data-testid='login-password-toggle']")

    expect(password.attributes("type")).toBe("password")
    expect(toggle.attributes("aria-label")).toBe("Show password")
    expect(toggle.attributes("aria-pressed")).toBe("false")

    await toggle.trigger("click")

    expect(password.attributes("type")).toBe("text")
    expect(toggle.attributes("aria-label")).toBe("Hide password")
    expect(toggle.attributes("aria-pressed")).toBe("true")

    await toggle.trigger("click")

    expect(password.attributes("type")).toBe("password")
    expect(toggle.attributes("aria-label")).toBe("Show password")

    wrapper.unmount()
  })
})

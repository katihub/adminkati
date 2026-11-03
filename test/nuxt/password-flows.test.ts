import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import ResendInvitation from "@/components/team/ResendInvitation/ResendInvitation.vue"
import ChoosePassword from "@/pages/choisir-mot-de-passe.vue"
import ForgotPassword from "@/pages/forgot-password.vue"

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach(cleanup => cleanup())
  cleanups = []
  history.replaceState(null, "", "/")
})

describe("password flows of the panel", () => {
  it("asks Supabase for a reset link and answers the same way whatever the address", async () => {
    const bodies: unknown[] = []
    cleanups.push(
      registerEndpoint("/api/auth/password-reset", {
        method: "POST",
        handler: async event => {
          bodies.push(await readBody(event))
          return { ok: true }
        },
      }),
    )
    const wrapper = await mountSuspended(ForgotPassword)
    await wrapper.get("[data-testid='forgot-password-email']").setValue("awa@katimarket.com")
    await wrapper.get("form").trigger("submit")
    await vi.waitFor(() => expect(wrapper.find("[data-testid='forgot-password-sent']").exists()).toBe(true))
    expect(bodies).toEqual([{ email: "awa@katimarket.com" }])
  })

  it("saves the password with the token of the link, and hides the token from the address bar", async () => {
    const bodies: unknown[] = []
    cleanups.push(
      registerEndpoint("/api/auth/password", {
        method: "POST",
        handler: async event => {
          bodies.push(await readBody(event))
          return { ok: true }
        },
      }),
    )
    history.replaceState(null, "", "/fr/choisir-mot-de-passe#access_token=jeton-de-test-assez-long&type=invite")
    const wrapper = await mountSuspended(ChoosePassword)
    await flushPromises()
    expect(window.location.hash).toBe("")
    await wrapper.get("[data-testid='choose-password-new']").setValue("motdepasse8")
    await wrapper.get("[data-testid='choose-password-confirm']").setValue("motdepasse8")
    await wrapper.get("form").trigger("submit")
    await vi.waitFor(() => expect(wrapper.find("[data-testid='choose-password-done']").exists()).toBe(true))
    expect(bodies).toEqual([{ accessToken: "jeton-de-test-assez-long", password: "motdepasse8" }])
  })

  it("refuses two different passwords without calling the server, and explains an invalid link", async () => {
    history.replaceState(null, "", "/fr/choisir-mot-de-passe#access_token=jeton-de-test-assez-long&type=recovery")
    const wrapper = await mountSuspended(ChoosePassword)
    await flushPromises()
    await wrapper.get("[data-testid='choose-password-new']").setValue("motdepasse8")
    await wrapper.get("[data-testid='choose-password-confirm']").setValue("autrechose8")
    await wrapper.get("form").trigger("submit")
    expect(wrapper.text()).toContain("The two passwords do not match.")

    history.replaceState(null, "", "/fr/choisir-mot-de-passe#error=access_denied&error_description=expired")
    const invalid = await mountSuspended(ChoosePassword)
    await flushPromises()
    expect(invalid.find("[data-testid='choose-password-invalid']").exists()).toBe(true)
  })

  it("resends the invitation of a member who never signed in", async () => {
    const calls: string[] = []
    cleanups.push(
      registerEndpoint("/api/v1/equipe/membres/m1/invitation", {
        method: "POST",
        handler: () => {
          calls.push("resend")
          return { invitationEnvoyee: true }
        },
      }),
    )
    const member = {
      id: "m1",
      nom: "Awa",
      courriel: "awa@katimarket.com",
      actif: true,
      premiereConnexionLe: null,
    } as never
    const wrapper = await mountSuspended(ResendInvitation, { props: { member } })
    await wrapper.get("[data-testid='team-resend-invitation']").trigger("click")
    await vi.waitFor(() => expect(calls).toEqual(["resend"]))
  })
})

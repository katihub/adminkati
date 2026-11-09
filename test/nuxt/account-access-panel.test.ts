import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import AccountAccessPanel from "@/components/accounts/AccountAccessPanel.vue"

const ACCOUNT = {
  courriel: "vendeur@test.cm",
  nom: "Rostand",
  telephone: "+237699",
  client: null,
  boutiques: [{ id: "b1", nom: "Diamant", slug: "diamant", roles: ["proprietaire"], actif: true }],
  auth: {
    id: "u1",
    courriel: "vendeur@test.cm",
    courrielConfirme: false,
    derniereConnexion: null,
    creeLe: null,
    banni: false,
  },
  actions: ["lien", "confirmer", "lien_a_transmettre"],
}

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach(cleanup => cleanup())
  cleanups = []
  useNuxtApp().$queryClient.clear()
  document.body.innerHTML = ""
})

describe("account access panel", () => {
  it("shows the sign-in state and only the actions the backend allows", async () => {
    cleanups = [registerEndpoint("/api/v1/comptes/detail", { method: "GET", handler: () => ACCOUNT })]
    const wrapper = await mountSuspended(AccountAccessPanel, { props: { email: "vendeur@test.cm" } })
    await flushPromises()
    await vi.waitFor(() => expect(wrapper.find("[data-testid='account-action-lien']").exists()).toBe(true))
    expect(wrapper.text()).toContain("not confirmed")
    expect(wrapper.text()).toContain("Seller")
    expect(wrapper.find("[data-testid='account-action-confirmer']").exists()).toBe(true)
    expect(wrapper.find("[data-testid='account-action-lien_a_transmettre']").exists()).toBe(true)
    expect(wrapper.find("[data-testid='account-action-temporaire']").exists()).toBe(false)
    wrapper.unmount()
  })

  it("offers to create the access when the sign-in account could never be created", async () => {
    const created: unknown[] = []
    cleanups = [
      registerEndpoint("/api/v1/comptes/detail", {
        method: "GET",
        handler: () => ({ ...ACCOUNT, auth: null, actions: ["creer_acces"] }),
      }),
      registerEndpoint("/api/v1/comptes/creer-acces", {
        method: "POST",
        handler: async event => {
          created.push(await readBody(event))
          return { action: "creer_acces" }
        },
      }),
    ]
    const wrapper = await mountSuspended(AccountAccessPanel, {
      props: { email: "vendeur@test.cm" },
      attachTo: document.body,
    })
    await flushPromises()
    await vi.waitFor(() => expect(wrapper.find("[data-testid='account-no-login']").exists()).toBe(true))
    expect(wrapper.find("[data-testid='account-action-lien']").exists()).toBe(false)
    await wrapper.get("[data-testid='account-action-creer_acces']").trigger("click")
    await vi.waitFor(() => expect(document.querySelector("[data-testid='account-action-confirm']")).not.toBeNull())
    document.querySelector<HTMLButtonElement>("[data-testid='account-action-confirm']")!.click()
    await vi.waitFor(() => expect(created).toEqual([{ courriel: "vendeur@test.cm" }]))
    wrapper.unmount()
  })

  it("asks a reason before a link to pass on, then shows it once", async () => {
    const bodies: unknown[] = []
    cleanups = [
      registerEndpoint("/api/v1/comptes/detail", { method: "GET", handler: () => ACCOUNT }),
      registerEndpoint("/api/v1/comptes/lien-a-transmettre", {
        method: "POST",
        handler: async event => {
          bodies.push(await readBody(event))
          return { action: "lien_a_transmettre", lien: "https://supabase.test/verify?token=abc" }
        },
      }),
    ]
    const wrapper = await mountSuspended(AccountAccessPanel, {
      props: { email: "vendeur@test.cm" },
      attachTo: document.body,
    })
    await flushPromises()
    await vi.waitFor(() =>
      expect(wrapper.find("[data-testid='account-action-lien_a_transmettre']").exists()).toBe(true),
    )
    await wrapper.get("[data-testid='account-action-lien_a_transmettre']").trigger("click")
    await vi.waitFor(() => expect(document.querySelector("[data-testid='account-action-reason']")).not.toBeNull())

    const confirm = document.querySelector<HTMLButtonElement>("[data-testid='account-action-confirm']")!
    expect(confirm.disabled).toBe(true)
    const reason = document.querySelector<HTMLTextAreaElement>("[data-testid='account-action-reason']")!
    reason.value = "Ne reçoit pas les e-mails"
    reason.dispatchEvent(new Event("input"))
    await flushPromises()
    expect(confirm.disabled).toBe(false)
    confirm.click()

    await vi.waitFor(() =>
      expect(document.querySelector("[data-testid='account-action-secret']")?.textContent).toContain("token=abc"),
    )
    expect(bodies).toEqual([{ courriel: "vendeur@test.cm", motif: "Ne reçoit pas les e-mails" }])
    wrapper.unmount()
  })
})

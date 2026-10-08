import type { Role } from "@/types/session"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import { adminNavigationItems } from "@/utils/admin-navigation"

function signIn(...roles: Role[]) {
  useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
    type: "equipe",
    userId: "u1",
    membreId: "m1",
    nom: "Admin",
    courriel: "admin@example.com",
    roles,
  })
}

async function mountAppAt(route: string) {
  const { default: App } = await import("@/app.vue")
  const wrapper = await mountSuspended(App, { attachTo: document.body, route })
  await flushPromises()
  return wrapper
}

function desktopIds(wrapper: {
  findAll: (selector: string) => { attributes: (name: string) => string | undefined }[]
}) {
  return wrapper
    .findAll("[data-testid^='admin-navigation-link-']")
    .map(link => link.attributes("data-testid")?.replace("admin-navigation-link-", ""))
}

describe("admin navigation destinations", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  /*
   * The budget is cold-start cost, not assertion work: this is the first test in the
   * run, so each of the eight mounts drags its page — and everything that page imports
   * — through Vite's transform for the first time. The French pass below repeats the
   * same eight mounts in a fraction of the time, against the cache this one warmed.
   * The orders workspace grew past what 30 s covered.
   */
  it("routes every navigation destination to a page that renders inside the admin shell", async () => {
    for (const item of adminNavigationItems) {
      signIn("direction")
      const wrapper = await mountAppAt(item.to)

      expect(wrapper.find("[data-testid='admin-shell']").exists()).toBe(true)
      expect(wrapper.get("[data-testid='admin-page-header-title']").text()).not.toBe("")
      expect(wrapper.get(`[data-testid='admin-navigation-link-${item.id}']`).attributes("aria-current")).toBe("page")

      wrapper.unmount()
      useNuxtApp().$queryClient.clear()
    }
  }, 90_000)

  it("routes the French path of every destination to the same page", async () => {
    // Spelled out rather than derived: deriving them from the model would only
    // restate whatever `defineI18nRoute` already says, and a wrong French path
    // would still pass.
    const frenchPaths: Record<string, string> = {
      overview: "/fr/",
      products: "/fr/produits",
      taxonomy: "/fr/taxonomie",
      content: "/fr/contenu",
      orders: "/fr/commandes",
      users: "/fr/clients",
      operations: "/fr/operations",
      team: "/fr/equipe",
    }

    for (const item of adminNavigationItems) {
      signIn("direction")
      const wrapper = await mountAppAt(frenchPaths[item.id]!)

      expect(wrapper.find("[data-testid='admin-shell']").exists()).toBe(true)
      expect(wrapper.get("[data-testid='admin-page-header-title']").text()).not.toBe("")
      expect(wrapper.get(`[data-testid='admin-navigation-link-${item.id}']`).attributes("aria-current")).toBe("page")

      wrapper.unmount()
      useNuxtApp().$queryClient.clear()
    }
  }, 30_000)
})

describe("admin navigation rendering", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("shows direction every destination", async () => {
    signIn("direction")
    const wrapper = await mountAppAt("/")

    expect(desktopIds(wrapper)).toEqual(adminNavigationItems.map(item => item.id))

    wrapper.unmount()
  })

  it("gives a livreur their orders, and nothing they cannot call", async () => {
    signIn("livreur")
    const wrapper = await mountAppAt("/")

    /* `orders` A REJOINT LA LISTE, et ce n'est pas un relâchement. Le backend
       ouvre au livreur la lecture de SES commandes, l'encaissement à la porte
       et le retour en préparation après une porte close ; le panel les lui
       refusait tous, si bien que le paiement à la livraison — le mode
       dominant de cette maison — devait être ressaisi par quelqu'un qui
       n'était pas là. La liste reste réduite à ses commandes côté serveur. */
    expect(desktopIds(wrapper)).toEqual(["overview", "orders", "team"])

    wrapper.unmount()
  })

  it("offers the same filtered destinations in the mobile menu", async () => {
    signIn("preparation")
    const wrapper = await mountAppAt("/")

    await wrapper.get("[data-testid='admin-mobile-navigation-trigger']").trigger("click")
    await flushPromises()

    for (const id of ["overview", "orders", "team"])
      expect(document.body.querySelector(`[data-testid='admin-mobile-navigation-link-${id}']`)).not.toBeNull()
    expect(document.body.querySelector("[data-testid='admin-mobile-navigation-link-products']")).toBeNull()
    expect(document.body.querySelector("[data-testid='admin-mobile-navigation-link-assistant']")).toBeNull()

    wrapper.unmount()
  })
})

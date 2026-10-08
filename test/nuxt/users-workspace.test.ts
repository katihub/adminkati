import type { CustomerAccountDetail, CustomerDirectoryItem, CustomerDirectoryPage } from "@/types/api/clients"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"
import UsersPage from "@/pages/users.vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

const customerId = "7b4f5d9e-0c7a-4f1f-a9ae-111111111111"

const customer: CustomerDirectoryItem = {
  id: customerId,
  statut: "actif",
  courriel: "awa.ngono@example.cm",
  creeLe: "2026-09-01T10:00:00.000Z",
  dernierAccesLe: "2026-09-08T10:00:00.000Z",
  profil: {
    nom: "Awa Ngono",
    telephone: "677000000",
    raisonSociale: null,
    comptoirPrefere: "Akwa",
  },
}

const detail: CustomerAccountDetail = {
  client: {
    id: customerId,
    statut: "actif",
    courriel: customer.courriel,
    creeLe: customer.creeLe,
    dernierAccesLe: customer.dernierAccesLe,
  },
  profil: {
    clientId: customerId,
    nom: "Awa Ngono",
    telephone: "677000000",
    telephoneChiffres: "677000000",
    telephoneSecours: null,
    telephoneSecoursChiffres: null,
    comptoirPrefere: "Akwa",
    raisonSociale: null,
    completLe: "2026-09-01T10:30:00.000Z",
    majLe: "2026-09-01T10:30:00.000Z",
  },
  adresses: [
    {
      id: "address-1",
      clientId: customerId,
      mode: "domicile",
      ville: "Douala",
      quartier: "Akwa",
      repere: "Rue de la Joie",
      telephoneDestinataire: "677000000",
      comptoir: null,
      parDefaut: true,
      archivee: false,
      creeLe: "2026-09-01T10:20:00.000Z",
    },
  ],
  complet: true,
}

function makePage(elements: CustomerDirectoryItem[] = [customer]): CustomerDirectoryPage {
  return {
    total: elements.length,
    page: 1,
    taille: 50,
    pages: 1,
    elements,
  }
}

function seedSession() {
  useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
    userId: "user-1",
    membreId: "member-1",
    nom: "Direction",
    courriel: "direction@example.com",
    roles: ["direction"],
  })
}

function seedDirectory(elements: CustomerDirectoryItem[] = [customer]) {
  useNuxtApp().$queryClient.setQueryData(apiQueryKeys.customers.list({ tri: "recent", taille: 50 }), {
    pages: [makePage(elements)],
    pageParams: [1],
  })
}

describe("users workspace page", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("opens the first customer without adding an id to the route", async () => {
    seedSession()
    seedDirectory()
    useNuxtApp().$queryClient.setQueryData(apiQueryKeys.customers.detail(customerId), detail)

    const wrapper = await mountSuspended(UsersPage, { route: "/users" })
    await flushPromises()

    expect(wrapper.get("[data-testid='users-detail-content']").text()).toContain("Awa Ngono")
    expect(wrapper.get("[data-testid='users-list-item']").attributes("aria-pressed")).toBe("true")
    expect(useRoute().query.id).toBeUndefined()

    wrapper.unmount()
  })

  it("restores a complete customer detail from a direct URL without exposing account email", async () => {
    seedSession()
    seedDirectory()
    useNuxtApp().$queryClient.setQueryData(apiQueryKeys.customers.detail(customerId), detail)

    const wrapper = await mountSuspended(UsersPage, { route: `/users?id=${customerId}` })
    await flushPromises()

    const detailPanel = wrapper.get("[data-testid='users-detail-content']")
    expect(detailPanel.text()).toContain("Awa Ngono")
    expect(detailPanel.text()).toContain("Rue de la Joie")
    expect(wrapper.find("[data-testid='users-detail-incomplete']").exists()).toBe(false)
    expect(detailPanel.text()).not.toContain("direction@example.com")

    wrapper.unmount()
  })

  it("names a fiche-less row by its email and prints that email in the account block", async () => {
    const sansFiche = { ...customer, profil: null }
    const detailSansFiche: CustomerAccountDetail = {
      client: detail.client,
      profil: null,
      adresses: [],
      complet: false,
    }
    seedSession()
    seedDirectory([sansFiche])
    useNuxtApp().$queryClient.setQueryData(apiQueryKeys.customers.detail(customerId), detailSansFiche)

    const wrapper = await mountSuspended(UsersPage, { route: `/users?id=${customerId}` })
    await flushPromises()

    // Sans fiche, la ligne portait l'identifiant technique : illisible.
    expect(wrapper.get("[data-testid='users-list-item-name']").text()).toBe(customer.courriel)
    expect(wrapper.get("[data-testid='users-list-item-name']").text()).not.toContain(customerId)
    expect(wrapper.get("[data-testid='users-account-email']").text()).toBe(customer.courriel)

    wrapper.unmount()
  })

  it("renders an existing account with no profile as an incomplete, non-error detail", async () => {
    const incomplete = { ...customer, profil: null }
    const incompleteDetail: CustomerAccountDetail = {
      client: detail.client,
      profil: null,
      adresses: [],
      complet: false,
    }
    seedSession()
    seedDirectory([incomplete])
    useNuxtApp().$queryClient.setQueryData(apiQueryKeys.customers.detail(customerId), incompleteDetail)

    const wrapper = await mountSuspended(UsersPage, { route: `/users?id=${customerId}` })
    await flushPromises()

    expect(wrapper.get("[data-testid='users-detail-incomplete']").text()).toContain("incomplete")
    expect(wrapper.find("[data-testid='api-error-card']").exists()).toBe(false)

    wrapper.unmount()
  })

  it("writes the selected customer id to the localized route when a row is chosen", async () => {
    seedSession()
    seedDirectory()

    const wrapper = await mountSuspended(UsersPage, { route: "/users" })
    await flushPromises()
    await wrapper.get("[data-testid='users-list-item']").trigger("click")
    await flushPromises()

    await vi.waitFor(() => expect(useRoute().query.id).toBe(customerId))

    wrapper.unmount()
  })
})

import type { CustomerAccountDetail, CustomerDirectoryItem, CustomerDirectoryPage } from "@/types/api/clients"
import type { Role } from "@/types/session"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import UsersPage from "@/pages/users.vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

const customerId = "7b4f5d9e-0c7a-4f1f-a9ae-444444444444"

function directoryItem(overrides: Partial<CustomerDirectoryItem> = {}): CustomerDirectoryItem {
  return {
    id: customerId,
    statut: "actif",
    courriel: "awa.ngono@example.cm",
    creeLe: "2026-09-01T10:00:00.000Z",
    dernierAccesLe: "2026-09-08T10:00:00.000Z",
    profil: {
      nom: "Awa Ngono",
      telephone: "+237 690 11 90 47",
      raisonSociale: null,
      comptoirPrefere: "Akwa",
    },
    ...overrides,
  }
}

function accountDetail(overrides: Partial<CustomerAccountDetail> = {}): CustomerAccountDetail {
  return {
    client: {
      id: customerId,
      statut: "actif",
      courriel: "awa@example.com",
      creeLe: "2026-09-01T10:00:00.000Z",
      dernierAccesLe: "2026-09-08T10:00:00.000Z",
    },
    profil: {
      clientId: customerId,
      nom: "Awa Ngono",
      telephone: "+237 690 11 90 47",
      telephoneChiffres: "690119047",
      telephoneSecours: "+237 699 55 44 33",
      ville: "Douala",
      telephoneSecoursChiffres: "699554433",
      comptoirPrefere: "Akwa",
      raisonSociale: null,
      completLe: "2026-09-01T10:30:00.000Z",
      majLe: "2026-09-01T10:30:00.000Z",
    },
    adresses: [
      {
        id: "address-1",
        clientId: customerId,
        mode: "retrait",
        ville: "Douala",
        quartier: null,
        repere: null,
        telephoneDestinataire: "+237 655 12 12 12",
        comptoir: "Bonanjo",
        parDefaut: true,
        archivee: false,
        creeLe: "2026-09-01T10:20:00.000Z",
      },
    ],
    complet: true,
    ...overrides,
  }
}

function seedSession(roles: Role[]) {
  useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
    userId: "user-1",
    membreId: "member-1",
    nom: "Session",
    courriel: "session@example.com",
    roles,
  })
}

function seedDirectory(elements: CustomerDirectoryItem[] = [directoryItem()]) {
  const page: CustomerDirectoryPage = { total: elements.length, page: 1, taille: 50, pages: 1, elements }
  useNuxtApp().$queryClient.setQueryData(apiQueryKeys.customers.list({ tri: "recent", taille: 50 }), {
    pages: [page],
    pageParams: [1],
  })
}

function seedDetail(detail: CustomerAccountDetail) {
  useNuxtApp().$queryClient.setQueryData(apiQueryKeys.customers.detail(customerId), detail)
}

describe("customer suspension controls", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("posts the suspension only after the director confirms it", async () => {
    let calls = 0
    const cleanup = registerEndpoint(`/api/v1/clients/${customerId}/suspendre`, {
      method: "POST",
      handler: () => {
        calls += 1
        return accountDetail({ client: { ...accountDetail().client, statut: "suspendu" } })
      },
    })
    seedSession(["direction"])
    seedDirectory()
    seedDetail(accountDetail())

    const wrapper = await mountSuspended(UsersPage, { route: `/users?id=${customerId}` })
    await flushPromises()

    await wrapper.get("[data-testid='users-suspend-button']").trigger("click")
    await flushPromises()
    expect(calls).toBe(0)

    document.body.querySelector<HTMLButtonElement>("[data-testid='users-suspend-confirm']")?.click()
    await flushPromises()
    await flushPromises()

    expect(calls).toBe(1)

    cleanup()
    wrapper.unmount()
  })

  it("offers reactivation, and only reactivation, on a suspended customer", async () => {
    let calls = 0
    const cleanup = registerEndpoint(`/api/v1/clients/${customerId}/reactiver`, {
      method: "POST",
      handler: () => {
        calls += 1
        return accountDetail()
      },
    })
    const suspended = accountDetail({ client: { ...accountDetail().client, statut: "suspendu" } })
    seedSession(["direction"])
    seedDirectory([directoryItem({ statut: "suspendu" })])
    seedDetail(suspended)

    const wrapper = await mountSuspended(UsersPage, { route: `/users?id=${customerId}` })
    await flushPromises()

    expect(wrapper.find("[data-testid='users-suspend-button']").exists()).toBe(false)
    await wrapper.get("[data-testid='users-reactivate-button']").trigger("click")
    await flushPromises()

    document.body.querySelector<HTMLButtonElement>("[data-testid='users-reactivate-confirm']")?.click()
    await flushPromises()
    await flushPromises()

    expect(calls).toBe(1)

    cleanup()
    wrapper.unmount()
  })

  /** `@Roles(direction)` côté backend : le comptoir lit l'annuaire, il ne change pas un statut. */
  it("gives the counter no status control at all", async () => {
    seedSession(["comptoir"])
    seedDirectory()
    seedDetail(accountDetail())

    const wrapper = await mountSuspended(UsersPage, { route: `/users?id=${customerId}` })
    await flushPromises()

    expect(wrapper.find("[data-testid='users-status-actions']").exists()).toBe(false)
    expect(wrapper.find("[data-testid='users-suspend-button']").exists()).toBe(false)
    expect(wrapper.find("[data-testid='users-reactivate-button']").exists()).toBe(false)

    wrapper.unmount()
  })

  /**
   * Ces quatre valeurs arrivaient déjà dans la réponse et n'étaient affichées
   * nulle part : le second numéro, celui que le livreur appelle, le comptoir du
   * retrait, et la date qui ordonne la liste par défaut.
   */
  it("shows the backup phone, the recipient phone, the pickup counter and the last access", async () => {
    seedSession(["direction"])
    seedDirectory()
    seedDetail(accountDetail())

    const wrapper = await mountSuspended(UsersPage, { route: `/users?id=${customerId}` })
    await flushPromises()

    expect(wrapper.get("[data-testid='users-profile-backup-phone']").text()).toBe("+237 699 55 44 33")
    expect(wrapper.get("[data-testid='users-profile-city']").text()).toBe("Douala")
    expect(wrapper.get("[data-testid='users-address-recipient-phone']").text()).toBe("+237 655 12 12 12")
    expect(wrapper.get("[data-testid='users-address-counter']").text()).toBe("Bonanjo")
    expect(wrapper.get("[data-testid='users-list-item-last-access']").text()).not.toBe("")

    wrapper.unmount()
  })

  it("keeps the account card readable when the profile was never completed", async () => {
    const incomplete = accountDetail({ profil: null, adresses: [], complet: false })
    seedSession(["direction"])
    seedDirectory([directoryItem({ profil: null })])
    seedDetail(incomplete)

    const wrapper = await mountSuspended(UsersPage, { route: `/users?id=${customerId}` })
    await flushPromises()

    expect(wrapper.find("[data-testid='users-detail-incomplete']").exists()).toBe(true)
    expect(wrapper.find("[data-testid='users-account-section']").exists()).toBe(true)
    expect(wrapper.find("[data-testid='users-suspend-button']").exists()).toBe(true)
    expect(wrapper.get("[data-testid='users-list-item-last-access']").text()).not.toBe("")

    wrapper.unmount()
  })
})

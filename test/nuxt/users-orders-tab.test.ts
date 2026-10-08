import type { CustomerAccountDetail, CustomerDirectoryItem, CustomerDirectoryPage } from "@/types/api/clients"
import type { CommandeAnnuaireItem, CommandeAnnuairePage } from "@/types/api/commandes"
import type { H3Event } from "h3"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { createError, getQuery } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import UsersPage from "@/pages/users.vue"
import { apiQueryKeys } from "@/utils/api-query-keys"
import { installFakeIntersectionObserver } from "./fake-intersection-observer"

const customerId = "7b4f5d9e-0c7a-4f1f-a9ae-111111111111"
const nextCustomerId = "7b4f5d9e-0c7a-4f1f-a9ae-222222222222"
const ordersEndpoint = "/api/v1/commandes/equipe/annuaire"

const customer: CustomerDirectoryItem = {
  id: customerId,
  statut: "actif",
  courriel: "awa@example.com",
  creeLe: "2026-09-01T10:00:00.000Z",
  dernierAccesLe: "2026-09-08T10:00:00.000Z",
  profil: {
    nom: "Awa Ngono",
    telephone: "677000000",
    raisonSociale: null,
    comptoirPrefere: "Akwa",
  },
}

const nextCustomer: CustomerDirectoryItem = {
  ...customer,
  id: nextCustomerId,
  profil: { ...customer.profil!, nom: "Manga Essomba" },
}

function makeDetail(id: string, complete = true): CustomerAccountDetail {
  return {
    client: {
      id,
      statut: "actif",
      courriel: id === customerId ? "awa@example.com" : "manga@example.com",
      creeLe: "2026-09-01T10:00:00.000Z",
      dernierAccesLe: "2026-09-08T10:00:00.000Z",
    },
    profil: complete
      ? {
          clientId: id,
          nom: id === customerId ? "Awa Ngono" : "Manga Essomba",
          telephone: "677000000",
          telephoneChiffres: "677000000",
          telephoneSecours: null,
          telephoneSecoursChiffres: null,
          comptoirPrefere: "Akwa",
          raisonSociale: null,
          completLe: "2026-09-01T10:30:00.000Z",
          majLe: "2026-09-01T10:30:00.000Z",
        }
      : null,
    adresses: [],
    complet: complete,
  }
}

function makePage(
  elements: CommandeAnnuaireItem[],
  overrides: Partial<CommandeAnnuairePage> = {},
): CommandeAnnuairePage {
  return {
    total: elements.length,
    page: 1,
    taille: 50,
    pages: 1,
    elements,
    ...overrides,
  }
}

function makeOrder(overrides: Partial<CommandeAnnuaireItem> = {}): CommandeAnnuaireItem {
  return {
    id: "commande-1",
    reference: "NT-000042",
    statut: "soumise",
    modeRemise: "retrait",
    modePaiementSouhaite: "especes_comptoir",
    comptoir: "Akwa",
    creeLe: "2026-09-05T10:00:00.000Z",
    closeLe: null,
    ligneCount: 2,
    totalEstimeTtc: 125_000,
    ...overrides,
  } as CommandeAnnuaireItem
}

function seedWorkspace(customers: CustomerDirectoryItem[] = [customer], details = [makeDetail(customerId)]) {
  useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
    userId: "user-1",
    membreId: "member-1",
    nom: "Direction",
    courriel: "direction@example.com",
    roles: ["direction"],
  })
  const page: CustomerDirectoryPage = {
    total: customers.length,
    page: 1,
    taille: 50,
    pages: 1,
    elements: customers,
  }
  useNuxtApp().$queryClient.setQueryData(apiQueryKeys.customers.list({ tri: "recent", taille: 50 }), {
    pages: [page],
    pageParams: [1],
  })
  for (const detail of details)
    useNuxtApp().$queryClient.setQueryData(apiQueryKeys.customers.detail(detail.client.id), detail)
}

const endpointCleanups: (() => void)[] = []
const mountedWrappers: { unmount: () => void }[] = []
let observer: ReturnType<typeof installFakeIntersectionObserver> | undefined

function serveOrders(handler: (event: H3Event) => unknown) {
  endpointCleanups.push(registerEndpoint(ordersEndpoint, { method: "GET", handler }))
}

async function mountCustomer(route = `/users?id=${customerId}`) {
  const wrapper = await mountSuspended(UsersPage, { route })
  mountedWrappers.push(wrapper)
  await flushPromises()
  return wrapper
}

describe("customer orders tab", () => {
  afterEach(() => {
    mountedWrappers.splice(0).forEach(wrapper => wrapper.unmount())
    endpointCleanups.splice(0).forEach(cleanup => cleanup())
    observer?.restore()
    observer = undefined
    useNuxtApp().$queryClient.clear()
    document.body.innerHTML = ""
  })

  it("waits to request a customer's orders until the Orders tab is activated", async () => {
    let calls = 0
    let observedQuery: Record<string, unknown> | undefined
    serveOrders(event => {
      calls += 1
      observedQuery = getQuery(event)
      return makePage([makeOrder()])
    })
    seedWorkspace()

    const wrapper = await mountCustomer()

    expect(calls).toBe(0)
    expect(wrapper.get("[data-testid='users-detail-tab-profile']").attributes("aria-current")).toBe("true")

    await wrapper.get("[data-testid='users-detail-tab-orders']").trigger("click")
    await vi.waitFor(() => expect(calls).toBe(1))

    expect(observedQuery).toEqual({ clientId: customerId, tri: "recent", taille: "50", page: "1" })
  })

  it("shows the pending state before the first customer order page arrives", async () => {
    let resolvePage: ((page: CommandeAnnuairePage) => void) | undefined
    serveOrders(
      () =>
        new Promise<CommandeAnnuairePage>(resolve => {
          resolvePage = resolve
        }),
    )
    seedWorkspace()

    const wrapper = await mountCustomer()
    await wrapper.get("[data-testid='users-detail-tab-orders']").trigger("click")

    await vi.waitFor(() => expect(wrapper.find("[data-testid='users-orders-loading']").exists()).toBe(true))
    resolvePage?.(makePage([makeOrder()]))
    await vi.waitFor(() => expect(wrapper.find("[data-testid='users-orders-list']").exists()).toBe(true))
  })

  it("opens the existing French orders workspace when a customer's order row is clicked", async () => {
    serveOrders(() => makePage([makeOrder()]))
    seedWorkspace()

    const wrapper = await mountCustomer(`/fr/clients?id=${customerId}`)
    await wrapper.get("[data-testid='users-detail-tab-orders']").trigger("click")

    await vi.waitFor(() => expect(wrapper.findAll("[data-testid='users-orders-link']")).toHaveLength(1))
    const row = wrapper.get("[data-testid='users-orders-link']")
    expect(row.text()).toContain("NT-000042")

    await row.trigger("click")
    await vi.waitFor(() => expect(useRoute().fullPath).toBe("/fr/commandes?order=NT-000042"))
  })

  it("shows an empty customer history even when the selected account has no profile", async () => {
    serveOrders(() => makePage([]))
    seedWorkspace([{ ...customer, profil: null }], [makeDetail(customerId, false)])

    const wrapper = await mountCustomer()
    await wrapper.get("[data-testid='users-detail-tab-orders']").trigger("click")

    await vi.waitFor(() => expect(wrapper.find("[data-testid='users-orders-empty']").exists()).toBe(true))
    expect(wrapper.find("[data-testid='users-detail-incomplete']").exists()).toBe(false)
  })

  it("shows the initial fetch error and retries it from the error card", async () => {
    let calls = 0
    serveOrders(() => {
      calls += 1
      throw createError({ statusCode: 500 })
    })
    seedWorkspace()

    const wrapper = await mountCustomer()
    await wrapper.get("[data-testid='users-detail-tab-orders']").trigger("click")

    await vi.waitFor(() => expect(wrapper.find("[data-testid='api-error-card']").exists()).toBe(true), {
      timeout: 5_000,
    })
    const callsBeforeRetry = calls
    await wrapper.get("[data-testid='api-error-card'] button").trigger("click")
    await vi.waitFor(() => expect(calls).toBeGreaterThan(callsBeforeRetry))
  })

  it("retains the first page and retries from the footer when a later page fails", async () => {
    let pageTwoCalls = 0
    serveOrders(event => {
      if (getQuery(event).page === "2") {
        pageTwoCalls += 1
        throw createError({ statusCode: 500 })
      }
      return makePage([makeOrder()], { total: 2, pages: 2 })
    })
    seedWorkspace()
    observer = installFakeIntersectionObserver()

    const wrapper = await mountCustomer()
    await wrapper.get("[data-testid='users-detail-tab-orders']").trigger("click")
    await vi.waitFor(() => expect(wrapper.findAll("[data-testid='users-orders-link']")).toHaveLength(1))

    observer.setVisible(true)
    await vi.waitFor(() => expect(wrapper.find("[data-testid='users-orders-load-failed']").exists()).toBe(true), {
      timeout: 5_000,
    })

    expect(wrapper.findAll("[data-testid='users-orders-link']")).toHaveLength(1)
    expect(wrapper.find("[data-testid='api-error-card']").exists()).toBe(false)
    const callsBeforeRetry = pageTwoCalls
    await wrapper.get("[data-testid='users-orders-load-failed'] button").trigger("click")
    await vi.waitFor(() => expect(pageTwoCalls).toBeGreaterThan(callsBeforeRetry))
  })

  it("returns to Profile without querying another customer's history when the selection changes", async () => {
    let calls = 0
    serveOrders(() => {
      calls += 1
      return makePage([makeOrder()])
    })
    seedWorkspace([customer, nextCustomer], [makeDetail(customerId), makeDetail(nextCustomerId)])

    const wrapper = await mountCustomer()
    await wrapper.get("[data-testid='users-detail-tab-orders']").trigger("click")
    await vi.waitFor(() => expect(calls).toBe(1))

    await wrapper.get(`[data-testid='users-list-item'][data-customer-id='${nextCustomerId}']`).trigger("click")
    await vi.waitFor(() => expect(useRoute().query.id).toBe(nextCustomerId))

    expect(wrapper.get("[data-testid='users-detail-tab-profile']").attributes("aria-current")).toBe("true")
    expect(wrapper.get("[data-testid='users-detail-tab-orders']").attributes("aria-current")).toBeUndefined()
    expect(calls).toBe(1)
  })
})

import type { CommandeAnnuairePage, CommandeListItem } from "@/types/api/commandes"
import type { ProductDetail } from "@/types/api/produits"
import type { Role } from "@/types/session"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"
import OrdersPage from "@/pages/orders.vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

function makeProduct(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: 42,
    slug: "riz-parfume-25kg",
    nom: "Riz parfumé 25kg",
    prix: 62_500,
    prix_reference: null,
    remise_pct: null,
    statut_stock: "en_stock",
    quantite_stock: 10,
    inventaire: {
      produit_id: 1,
      quantite_stock: 10,
      statut_stock: "en_stock",
      modifie_le: null,
      disponibilite_forcee: null,
    },
    fiche_technique: null,
    fiche_pdf: null,
    fiche_pdf_nom: null,
    fiche_pdf_octets: null,
    marque: null,
    categorie_principale_id: null,
    retire_le: null,
    rayon: null,
    nom_source: null,
    ajoute_le: null,
    url_source: null,
    caracteristiques: [],
    description: null,
    categorie_nom: null,
    images: [],
    categories: [],
    historique: [],
    ...overrides,
  }
}

function seedProduct(product: ProductDetail) {
  useNuxtApp().$queryClient.setQueryData(apiQueryKeys.products.detail(product.id), product)
}

function makeOrder(overrides: Partial<CommandeListItem> = {}): CommandeListItem {
  return {
    id: "commande-1",
    reference: "NT-000042",
    statut: "soumise",
    modeRemise: "retrait",
    modePaiementSouhaite: "especes_comptoir",
    comptoir: "Akwa",
    creeLe: "2026-01-05T10:00:00.000Z",
    closeLe: null,
    confirmeParClient: false,
    motifCloture: null,
    livreur: null,
    ligneCount: 1,
    lignes: [
      {
        id: "ligne-1",
        rang: 1,
        produitId: 42,
        slug: "riz-parfume-25kg",
        nomCapture: "Riz parfumé 25kg",
        quantite: 2,
        quantiteRemise: 0,
        statutLigne: "commandee",
        motifEcart: null,
        prixCapture: 62_500,
        prixFerme: null,
      },
    ],
    totalEstimeTtc: 125_000,
    totalFermeTtc: null,
    totalFacturableTtc: null,
    resteAPayer: 125_000,
    statutPaiement: "en_attente",
    clientNom: "Awa Ngono",
    clientTelephone: "677000000",
    ...overrides,
  }
}

function seedOrders(orders: CommandeListItem[]) {
  const page: CommandeAnnuairePage = {
    total: orders.length,
    page: 1,
    taille: 50,
    pages: 1,
    elements: orders.map(({ lignes: _lignes, ...order }) => order),
  }
  useNuxtApp().$queryClient.setQueryData(apiQueryKeys.orders.list({ tri: "recent", taille: 50 }), {
    pages: [page],
    pageParams: [1],
  })
}

function seedOrderDetail(order: CommandeListItem) {
  useNuxtApp().$queryClient.setQueryData(apiQueryKeys.orders.detail(order.reference), order)
}

function seedSession(...roles: Role[]) {
  useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
    userId: "u1",
    membreId: "m1",
    nom: "Awa Admin",
    courriel: "admin@example.com",
    roles,
  })
}

describe("orders detail workspace", () => {
  afterEach(() => {
    useNuxtApp().$queryClient.clear()
    // The export dialog teleports out of the wrapper tree; wrappers alone cannot remove it.
    document.body.innerHTML = ""
  })

  it("renders a deep-linked order detail, including its line and financial summary", async () => {
    const order = makeOrder()
    seedOrders([order])
    seedOrderDetail(order)

    const wrapper = await mountSuspended(OrdersPage, { route: `/orders?order=${order.reference}` })
    await flushPromises()

    expect(wrapper.get("[data-testid='orders-detail-header-reference']").text()).toBe(order.reference)
    expect(wrapper.get("[data-testid='orders-detail-line']").text()).toContain(order.lignes[0]?.nomCapture)
    expect(wrapper.get("[data-testid='orders-detail-total']").text()).toContain("125,000")

    wrapper.unmount()
  })

  it("renders a preparation-role detail without financier-only fields", async () => {
    const source = makeOrder()
    const {
      totalEstimeTtc: _estimated,
      totalFermeTtc: _confirmed,
      totalFacturableTtc: _billable,
      resteAPayer: _remaining,
      statutPaiement: _paymentStatus,
      clientNom: _customer,
      clientTelephone: _phone,
      ...operationOnly
    } = source
    const order = {
      ...operationOnly,
      lignes: source.lignes.map(({ prixCapture: _captured, prixFerme: _final, ...line }) => line),
    }
    seedOrders([order])
    seedOrderDetail(order)

    const wrapper = await mountSuspended(OrdersPage, { route: `/orders?order=${order.reference}` })
    await flushPromises()

    expect(wrapper.find("[data-testid='orders-detail-content']").exists()).toBe(true)
    expect(wrapper.get("[data-testid='orders-detail-customer-empty']").text()).toContain("Customer details unavailable")
    expect(wrapper.find("[data-testid='orders-detail-total']").exists()).toBe(false)
    expect(wrapper.find("[data-testid='orders-detail-payment-status']").exists()).toBe(false)
    expect(wrapper.get("[data-testid='orders-detail-line']").text()).toContain("Riz parfumé 25kg")

    wrapper.unmount()
  })

  it("renders the Basic Details bar with the order's real fields, for every role", async () => {
    const order = makeOrder()
    seedOrders([order])
    seedOrderDetail(order)

    const wrapper = await mountSuspended(OrdersPage, { route: `/orders?order=${order.reference}` })
    await flushPromises()

    const basicDetails = wrapper.get("[data-testid='orders-detail-basic-details']")
    expect(basicDetails.text()).toContain(order.reference)
    expect(basicDetails.text()).toContain("Pickup")
    expect(basicDetails.text()).toContain("Cash at counter")
    expect(basicDetails.text()).toContain("Akwa")

    wrapper.unmount()
  })

  it("shows one Total column per line — the final price when set, else the captured price — with the product id as SKU", async () => {
    const order = makeOrder({
      lignes: [{ ...makeOrder().lignes[0]!, produitId: 42, prixCapture: 62_500, prixFerme: 60_000 }],
    })
    seedOrders([order])
    seedOrderDetail(order)

    const wrapper = await mountSuspended(OrdersPage, { route: `/orders?order=${order.reference}` })
    await flushPromises()

    const line = wrapper.get("[data-testid='orders-detail-line']")
    expect(line.text()).toContain("42")
    expect(line.text()).toContain("60,000")
    expect(line.text()).toContain("120,000")
    expect(line.text()).not.toContain("62,500")

    wrapper.unmount()
  })

  it("shows the product's photo instead of the placeholder icon once it loads", async () => {
    const order = makeOrder({ lignes: [{ ...makeOrder().lignes[0]!, produitId: 42 }] })
    seedOrders([order])
    seedOrderDetail(order)
    seedProduct(
      makeProduct({
        id: 42,
        images: [{ rang: 1, url: "https://cdn.example.com/riz.jpg", chemin_local: null, octets: null, alt: null }],
      }),
    )

    const wrapper = await mountSuspended(OrdersPage, { route: `/orders?order=${order.reference}` })
    await flushPromises()

    const image = wrapper.get("[data-testid='orders-detail-line-image']")
    expect(image.attributes("src")).toContain("riz.jpg")

    wrapper.unmount()
  })

  it("falls back to the placeholder icon when the product has no photo", async () => {
    const order = makeOrder({ lignes: [{ ...makeOrder().lignes[0]!, produitId: 42 }] })
    seedOrders([order])
    seedOrderDetail(order)
    seedProduct(makeProduct({ id: 42, images: [] }))

    const wrapper = await mountSuspended(OrdersPage, { route: `/orders?order=${order.reference}` })
    await flushPromises()

    expect(wrapper.find("[data-testid='orders-detail-line-image']").exists()).toBe(false)

    wrapper.unmount()
  })

  it("links the product name to its Products page detail, for a role allowed there", async () => {
    const order = makeOrder({ lignes: [{ ...makeOrder().lignes[0]!, produitId: 42 }] })
    seedSession("comptoir")
    seedOrders([order])
    seedOrderDetail(order)

    const wrapper = await mountSuspended(OrdersPage, { route: `/orders?order=${order.reference}` })
    await flushPromises()

    expect(wrapper.get("[data-testid='orders-detail-line-product-link']").attributes("href")).toBe("/products?id=42")

    wrapper.unmount()
  })

  it("does not link the product name for a role with no access to the Products page", async () => {
    const order = makeOrder({ lignes: [{ ...makeOrder().lignes[0]!, produitId: 42 }] })
    seedSession("preparation")
    seedOrders([order])
    seedOrderDetail(order)

    const wrapper = await mountSuspended(OrdersPage, { route: `/orders?order=${order.reference}` })
    await flushPromises()

    expect(wrapper.find("[data-testid='orders-detail-line-product-link']").exists()).toBe(false)
    expect(wrapper.get("[data-testid='orders-detail-line']").text()).toContain("Riz parfumé 25kg")

    wrapper.unmount()
  })

  it("renders the Payment Status card with a status pill, the remaining balance, and the total", async () => {
    const order = makeOrder({ resteAPayer: 45_000 })
    seedOrders([order])
    seedOrderDetail(order)

    const wrapper = await mountSuspended(OrdersPage, { route: `/orders?order=${order.reference}` })
    await flushPromises()

    const paymentStatus = wrapper.get("[data-testid='orders-detail-payment-status']")
    expect(paymentStatus.text()).toContain("Not paid")
    expect(paymentStatus.text()).toContain("45,000")
    expect(paymentStatus.text()).toContain("125,000")

    wrapper.unmount()
  })

  it("renders Customer Information with only the customer's own details — name and phone, not order logistics already shown in Basic Details", async () => {
    const order = makeOrder()
    seedOrders([order])
    seedOrderDetail(order)

    const wrapper = await mountSuspended(OrdersPage, { route: `/orders?order=${order.reference}` })
    await flushPromises()

    const customerInfo = wrapper.get("[data-testid='orders-detail-customer-info']")
    expect(customerInfo.text()).toContain("Awa Ngono")
    expect(customerInfo.text()).toContain("677000000")
    expect(customerInfo.text()).not.toContain("Pickup")
    expect(customerInfo.text()).not.toContain("Cash at counter")

    wrapper.unmount()
  })

  it("renders only the actions allowed for the signed-in role", async () => {
    const order = makeOrder()
    seedSession("comptoir")
    seedOrders([order])
    seedOrderDetail(order)

    const wrapper = await mountSuspended(OrdersPage, { route: `/orders?order=${order.reference}` })
    await flushPromises()

    const header = wrapper.get("[data-testid='orders-detail-header']")
    expect(header.find("[data-testid='orders-detail-actions']").exists()).toBe(true)
    expect(header.find("[data-transition='confirmee']").exists()).toBe(true)
    expect(header.find("[data-transition='refusee']").exists()).toBe(true)
    expect(header.find("[data-transition='annulee']").exists()).toBe(false)
    expect(header.find("[data-testid='orders-payment-dialog-trigger']").exists()).toBe(true)

    wrapper.unmount()
  })

  it("keeps the export trigger visible on a closed order with no other actions, and opens the export dialog", async () => {
    const order = makeOrder({ statut: "close", resteAPayer: 0, statutPaiement: "paye", modeRemise: "retrait" })
    seedSession("comptoir")
    seedOrders([order])
    seedOrderDetail(order)

    const wrapper = await mountSuspended(OrdersPage, { route: `/orders?order=${order.reference}` })
    await flushPromises()

    const header = wrapper.get("[data-testid='orders-detail-header']")
    expect(header.find("[data-testid='orders-detail-actions']").exists()).toBe(false)

    await header.get("[data-testid='orders-detail-export-trigger']").trigger("click")
    await flushPromises()

    expect(document.body.querySelector("[data-testid='orders-export-dialog']")).not.toBeNull()

    wrapper.unmount()
  })

  it("writes the selected order reference to the URL when a list row is clicked", async () => {
    const first = makeOrder()
    const second = makeOrder({ id: "commande-2", reference: "NT-000043", clientNom: "Manga Essomba" })
    seedOrders([first, second])
    seedOrderDetail(first)
    seedOrderDetail(second)

    const wrapper = await mountSuspended(OrdersPage, { route: "/orders" })
    await flushPromises()

    await wrapper.get("[data-order-reference='NT-000043']").trigger("click")
    await vi.waitFor(() => expect(useRoute().query.order).toBe("NT-000043"))

    expect(wrapper.get("[data-testid='orders-detail-header-reference']").text()).toBe("NT-000043")

    wrapper.unmount()
  })

  it("renders a skeleton UI instead of plain text while an order detail is loading", async () => {
    const order = makeOrder()
    seedOrders([order])
    // Notice: we intentionally do NOT seed the order detail, leaving it in pending state

    const wrapper = await mountSuspended(OrdersPage, { route: `/orders?order=${order.reference}` })

    const loading = wrapper.get("[data-testid='orders-detail-loading']")
    expect(loading.attributes("role")).toBe("status")
    expect(loading.attributes("aria-busy")).toBe("true")
    expect(loading.find("[data-slot='skeleton']").exists()).toBe(true)
    expect(loading.findAll("[data-slot='skeleton']").length).toBeGreaterThan(10)

    wrapper.unmount()
  })
})

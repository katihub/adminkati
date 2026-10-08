import type { CustomerAccountDetail, CustomerProfile } from "@/types/api/clients"
import type { DevisDetail, RefreshQuoteResult } from "@/types/api/devis"
import type { ProductDetail } from "@/types/api/produits"
import type { Role } from "@/types/session"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"
import QuotesDetailPanel from "@/components/quotes/DetailPanel.vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

const quote: DevisDetail = {
  id: "devis-1",
  reference: "DV-000042",
  clientId: "client-1",
  statut: "ouvert",
  catalogueGenereLe: "2026-01-05T09:59:00.000Z",
  totalTtc: 125_000,
  totalHt: 105_042,
  tva: 19_958,
  tauxTva: "0.1900",
  commandeId: null,
  commandeReference: null,
  creeLe: "2026-01-05T10:00:00.000Z",
  majLe: "2026-01-05T10:00:00.000Z",
  lignes: [
    {
      id: "devis-ligne-1",
      devisId: "devis-1",
      rang: 0,
      produitId: 42,
      slug: "riz-parfume-25kg",
      nomFige: "Riz parfumé 25kg",
      prixFige: 62_500,
      quantite: 2,
    },
  ],
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
    fiche_pdf: null,
    fiche_pdf_nom: null,
    fiche_pdf_octets: null,
    ...overrides,
  }
}

function seedProduct(product: ProductDetail) {
  useNuxtApp().$queryClient.setQueryData(apiQueryKeys.products.detail(product.id), product)
}

function makeCustomer(overrides: Partial<CustomerProfile> = {}): CustomerAccountDetail {
  return {
    client: {
      id: "client-1",
      statut: "actif",
      courriel: "awa@example.com",
      creeLe: "2026-01-05T10:00:00.000Z",
      dernierAccesLe: "2026-01-05T10:00:00.000Z",
    },
    profil: {
      clientId: "client-1",
      nom: "Awa Ngono",
      telephone: "677000000",
      telephoneChiffres: "677000000",
      telephoneSecours: null,
      telephoneSecoursChiffres: null,
      comptoirPrefere: "Akwa",
      raisonSociale: null,
      completLe: null,
      majLe: "2026-01-05T10:00:00.000Z",
      ...overrides,
    },
    adresses: [],
    complet: true,
  }
}

function seedCustomer(customer: CustomerAccountDetail) {
  useNuxtApp().$queryClient.setQueryData(apiQueryKeys.customers.detail(customer.client.id), customer)
}

describe("quote detail workspace", () => {
  afterEach(() => {
    useNuxtApp().$queryClient.clear()
    document.body.innerHTML = ""
  })

  it("refreshes prices on demand and renders the returned deltas", async () => {
    seedSession("comptoir")
    const refreshed: RefreshQuoteResult = {
      devis: { ...quote, totalTtc: 130_000 },
      ecarts: [{ slug: "riz-parfume-25kg", nom: "Riz parfumé 25kg", ancien: 62_500, nouveau: 65_000, quantite: 2 }],
      inchange: false,
    }
    let requestCount = 0
    const cleanup = registerEndpoint("/api/v1/devis/DV-000042/rafraichir", {
      method: "GET",
      handler: () => {
        requestCount += 1
        return refreshed
      },
    })

    const wrapper = await mountSuspended(QuotesDetailPanel, { props: { quote }, attachTo: document.body })
    expect(
      wrapper.get("[data-testid='quotes-detail-header']").find("[data-testid='quotes-refresh-button']").exists(),
    ).toBe(true)
    await wrapper.get("[data-testid='quotes-refresh-button']").trigger("click")
    await vi.waitFor(() => expect(requestCount).toBe(1))
    await flushPromises()

    expect(wrapper.get("[data-testid='quotes-refresh-result']").text()).toContain("65,000")

    // Dismiss the result
    const closeBtn = wrapper.get("[data-testid='quotes-refresh-result'] button")
    await closeBtn.trigger("click")
    expect(wrapper.find("[data-testid='quotes-refresh-result']").exists()).toBe(false)

    cleanup()
    wrapper.unmount()
  })

  it("renders unchanged feedback when prices match current catalogue", async () => {
    seedSession("comptoir")
    const refreshed: RefreshQuoteResult = {
      devis: quote,
      ecarts: [],
      inchange: true,
    }
    const cleanup = registerEndpoint("/api/v1/devis/DV-000042/rafraichir", {
      method: "GET",
      handler: () => refreshed,
    })

    const wrapper = await mountSuspended(QuotesDetailPanel, { props: { quote }, attachTo: document.body })
    await wrapper.get("[data-testid='quotes-refresh-button']").trigger("click")
    await vi.waitFor(() => expect(wrapper.find("[data-testid='quotes-refresh-unchanged']").exists()).toBe(true))

    const closeBtn = wrapper.get("[data-testid='quotes-refresh-unchanged'] button")
    await closeBtn.trigger("click")
    expect(wrapper.find("[data-testid='quotes-refresh-unchanged']").exists()).toBe(false)

    cleanup()
    wrapper.unmount()
  })

  it("renders error alert when price refresh fails", async () => {
    seedSession("comptoir")
    const cleanup = registerEndpoint("/api/v1/devis/DV-000042/rafraichir", {
      method: "GET",
      handler: () => {
        throw createError({ statusCode: 500, statusMessage: "Internal Server Error" })
      },
    })

    const wrapper = await mountSuspended(QuotesDetailPanel, { props: { quote }, attachTo: document.body })
    await wrapper.get("[data-testid='quotes-refresh-button']").trigger("click")
    await vi.waitFor(() => expect(wrapper.find("[data-testid='quotes-refresh-error']").exists()).toBe(true))

    const closeBtn = wrapper.get("[data-testid='quotes-refresh-error'] button")
    await closeBtn.trigger("click")
    expect(wrapper.find("[data-testid='quotes-refresh-error']").exists()).toBe(false)

    cleanup()
    wrapper.unmount()
  })

  it("archives after confirmation and reports completion to the parent", async () => {
    seedSession("direction")
    const cleanup = registerEndpoint("/api/v1/devis/DV-000042", {
      method: "DELETE",
      handler: () => ({ id: quote.id, reference: quote.reference, statut: "archive" }),
    })
    const wrapper = await mountSuspended(QuotesDetailPanel, { props: { quote }, attachTo: document.body })

    await wrapper.get("[data-testid='quotes-archive-trigger']").trigger("click")
    const confirm = document.body.querySelector<HTMLButtonElement>("[data-testid='quotes-archive-confirm']")
    expect(confirm).not.toBeNull()
    confirm?.click()
    await vi.waitFor(() => expect(wrapper.emitted("archived")).toBeTruthy())

    cleanup()
    wrapper.unmount()
  })

  it("does not expose archive to preparation staff", async () => {
    seedSession("preparation")
    const wrapper = await mountSuspended(QuotesDetailPanel, { props: { quote }, attachTo: document.body })

    expect(
      wrapper.get("[data-testid='quotes-detail-header']").find("[data-testid='quotes-archive-trigger']").exists(),
    ).toBe(false)

    wrapper.unmount()
  })

  it("links a converted quote to its order", async () => {
    seedSession("comptoir")
    const wrapper = await mountSuspended(QuotesDetailPanel, {
      props: { quote: { ...quote, statut: "commande", commandeReference: "NT-2026-0137" } },
      attachTo: document.body,
    })

    expect(wrapper.get("[data-testid='quotes-detail-order-link']").attributes("href")).toBe(
      "/orders?order=NT-2026-0137",
    )

    wrapper.unmount()
  })

  it("renders the Basic Details bar with the quote's real fields", async () => {
    seedSession("comptoir")
    const wrapper = await mountSuspended(QuotesDetailPanel, { props: { quote }, attachTo: document.body })

    const basicDetails = wrapper.get("[data-testid='quotes-detail-basic-details']")
    expect(basicDetails.text()).toContain(quote.reference)

    wrapper.unmount()
  })

  it("shows SKU, unit price, and the line total per row", async () => {
    seedSession("comptoir")
    const wrapper = await mountSuspended(QuotesDetailPanel, { props: { quote }, attachTo: document.body })

    const line = wrapper.get("[data-testid='quotes-detail-line']")
    expect(line.text()).toContain("42")
    expect(line.text()).toContain("62,500")
    expect(line.text()).toContain("125,000")

    wrapper.unmount()
  })

  it("shows the product's photo instead of the placeholder icon once it loads", async () => {
    seedSession("comptoir")
    seedProduct(
      makeProduct({
        id: 42,
        images: [{ rang: 1, url: "https://cdn.example.com/riz.jpg", chemin_local: null, octets: null, alt: null }],
      }),
    )
    const wrapper = await mountSuspended(QuotesDetailPanel, { props: { quote }, attachTo: document.body })
    await flushPromises()

    expect(wrapper.get("[data-testid='quotes-detail-line-image']").attributes("src")).toContain("riz.jpg")

    wrapper.unmount()
  })

  it("links the product name to its Products page detail, for a role allowed there", async () => {
    seedSession("comptoir")
    const wrapper = await mountSuspended(QuotesDetailPanel, { props: { quote }, attachTo: document.body })

    expect(wrapper.get("[data-testid='quotes-detail-line-product-link']").attributes("href")).toBe("/products?id=42")

    wrapper.unmount()
  })

  it("does not link the product name for a role with no access to the Products page", async () => {
    seedSession("preparation")
    const wrapper = await mountSuspended(QuotesDetailPanel, { props: { quote }, attachTo: document.body })

    expect(wrapper.find("[data-testid='quotes-detail-line-product-link']").exists()).toBe(false)

    wrapper.unmount()
  })

  it("renders the Amount card with subtotal, VAT, and the total", async () => {
    seedSession("comptoir")
    const wrapper = await mountSuspended(QuotesDetailPanel, { props: { quote }, attachTo: document.body })

    const amount = wrapper.get("[data-testid='quotes-detail-amount']")
    expect(amount.text()).toContain("105,042")
    expect(amount.text()).toContain("19,958")
    expect(amount.text()).toContain("125,000")

    wrapper.unmount()
  })

  it("renders Customer Information with the resolved customer's name, phone, company, and preferred counter", async () => {
    seedSession("comptoir")
    seedCustomer(makeCustomer({ raisonSociale: "Ngono Distribution" }))
    const wrapper = await mountSuspended(QuotesDetailPanel, { props: { quote }, attachTo: document.body })
    await flushPromises()

    const customerInfo = wrapper.get("[data-testid='quotes-detail-customer-info']")
    expect(customerInfo.text()).toContain("Awa Ngono")
    expect(customerInfo.text()).toContain("677000000")
    expect(customerInfo.text()).toContain("Ngono Distribution")
    expect(customerInfo.text()).toContain("Akwa")

    wrapper.unmount()
  })

  it("shows an empty state once the customer fails to resolve", async () => {
    seedSession("comptoir")
    const cleanup = registerEndpoint("/api/v1/clients/client-1", {
      method: "GET",
      handler: () => {
        throw new Error("not found")
      },
    })
    const wrapper = await mountSuspended(QuotesDetailPanel, { props: { quote }, attachTo: document.body })

    await vi.waitFor(() => expect(wrapper.find("[data-testid='quotes-detail-customer-empty']").exists()).toBe(true), {
      timeout: 5000,
    })
    expect(wrapper.get("[data-testid='quotes-detail-customer-empty']").text()).toContain("Customer details unavailable")

    cleanup()
    wrapper.unmount()
  })
})

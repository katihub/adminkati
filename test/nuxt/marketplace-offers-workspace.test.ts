import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { getQuery } from "h3"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import MarketplaceOffersWorkspace from "@/components/operations/MarketplaceOffersWorkspace.vue"

const firstShopId = "88888888-8888-4888-8888-888888888888"
const secondShopId = "99999999-9999-4999-8999-999999999999"

const offer = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  referenceVendeur: `REF-${id}`,
  statut: "publiee",
  titre: `Produit ${id}`,
  libelleVariante: null,
  prixFcfa: 150000,
  prixReferenceFcfa: null,
  quantiteMinimale: 1,
  publieLe: "2026-10-17T10:00:00.000Z",
  creeLe: "2026-10-17T10:00:00.000Z",
  verifieParKatiLe: null,
  produit: {
    id: `p-${id}`,
    nom: `Produit ${id}`,
    slug: `produit-${id}`,
    statut: "actif",
    marque: "HP",
    categorie: "Informatique",
    image: null,
  },
  boutique: {
    id: firstShopId,
    nom: "NowTech",
    slug: "nowtech",
    statut: "active",
    suiviStock: true,
    vendeur: { nomLegal: "NowTech Center SARL", statut: "actif" },
  },
  stock: { suivi: true, quantite: 25, reservee: 0, disponible: 25 },
  ...overrides,
})

const PAGE = {
  elements: [
    offer("o1"),
    offer("o2", { statut: "brouillon", stock: { suivi: true, quantite: 0, reservee: 0, disponible: 0 } }),
    offer("o3", {
      boutique: {
        id: secondShopId,
        nom: "Atelier Mballa",
        slug: "atelier",
        statut: "active",
        suiviStock: false,
        vendeur: { nomLegal: "Awa Mballa", statut: "actif" },
      },
      stock: { suivi: false, quantite: 0, reservee: 0, disponible: null },
    }),
  ],
  pagination: { page: 1, taille: 50, total: 120, pages: 3 },
  compteurs: { publiee: 118, brouillon: 2 },
  boutiques: [
    { id: firstShopId, nom: "NowTech", offres: 119 },
    { id: secondShopId, nom: "Atelier Mballa", offres: 1 },
  ],
}

let cleanups: Array<() => void> = []
const wrappers: Array<{ unmount: () => void }> = []
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  cleanups.forEach(cleanup => cleanup())
  cleanups = []
  document.body.innerHTML = ""
  useNuxtApp().$queryClient.clear()
})

describe("marketplace offers workspace", () => {
  beforeEach(() => {
    useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
      userId: "offers-test-user",
      membreId: "offers-test-member",
      nom: "Offer administrator",
      courriel: "admin@example.test",
      roles: ["direction"],
      comptoirs: [],
    })
  })
  it("lists every shop's offers, passes the filters to the API and pages through them", async () => {
    const queries: Record<string, unknown>[] = []
    cleanups = [
      registerEndpoint("/api/v1/marketplace/administration/offres", {
        method: "GET",
        handler: event => {
          const query = getQuery(event)
          queries.push(query)
          return { ...PAGE, pagination: { ...PAGE.pagination, page: Number(query.page ?? 1) } }
        },
      }),
      registerEndpoint("/api/v1/marketplace/categories/administration", { method: "GET", handler: () => [] }),
    ]
    const wrapper = await mountSuspended(MarketplaceOffersWorkspace, {
      attachTo: document.body,
      route: "/operations?tab=marketplace-offers",
    })
    wrappers.push(wrapper)
    await flushPromises()

    expect(queries[0]).toEqual({ page: "1", taille: "50" })
    expect(wrapper.get("[data-testid='marketplace-offers-total']").text()).toBe("120 offers")
    expect(wrapper.get("[data-testid='marketplace-offers-counter-publiee']").text()).toContain("118")
    expect(wrapper.get("[data-testid='marketplace-offer-status-o2']").text()).toBe("Drafts")
    expect(wrapper.get("[data-testid='marketplace-offer-stock-o1']").text()).toBe("25")
    expect(wrapper.get("[data-testid='marketplace-offer-stock-o2']").classes()).toContain("text-destructive")
    expect(wrapper.get("[data-testid='marketplace-offer-stock-o3']").text()).toBe("Not tracked")
    expect(wrapper.get("[data-testid='marketplace-offers-shop']").text()).toContain("NowTech (119)")

    await wrapper.get("[data-testid='marketplace-offers-shop']").setValue(firstShopId)
    await wrapper.get("[data-testid='marketplace-offers-sort']").setValue("prix_desc")
    await wrapper.get("[data-testid='marketplace-offers-stock']").setValue("rupture")
    await flushPromises()
    await vi.waitFor(() =>
      expect(queries.at(-1)).toEqual({
        boutiqueId: firstShopId,
        tri: "prix_desc",
        stock: "rupture",
        page: "1",
        taille: "50",
      }),
    )
    await vi.waitFor(() =>
      expect(useRoute().query).toMatchObject({
        tab: "marketplace-offers",
        boutique: firstShopId,
        tri: "prix_desc",
        stock: "rupture",
      }),
    )

    // The pager waits for the current page before moving on.
    const next = () => wrapper.get("[data-testid='marketplace-offers-next']")
    await vi.waitFor(() => expect(next().attributes("disabled")).toBeUndefined())
    await next().trigger("click")
    await vi.waitFor(() =>
      expect(queries.at(-1)).toMatchObject({ boutiqueId: firstShopId, tri: "prix_desc", stock: "rupture", page: "2" }),
    )
    await vi.waitFor(() =>
      expect(useRoute().query).toMatchObject({ boutique: firstShopId, tri: "prix_desc", stock: "rupture", page: "2" }),
    )
    await vi.waitFor(() => expect(wrapper.get("[data-testid='marketplace-offers-page']").text()).toBe("Page 2 of 3"))

    // A new criterion starts again from the first page.
    await wrapper.get("[data-testid='marketplace-offers-counter-brouillon']").trigger("click")
    await vi.waitFor(() => expect(queries.at(-1)).toMatchObject({ statut: "brouillon", page: "1" }))

    // Clearing returns to the unfiltered first page, served from the cache of the first load.
    await wrapper.get("[data-testid='marketplace-offers-clear']").trigger("click")
    await flushPromises()
    await vi.waitFor(() => {
      for (const filter of ["shop", "status", "stock"])
        expect((wrapper.get(`[data-testid='marketplace-offers-${filter}']`).element as HTMLSelectElement).value).toBe(
          "",
        )
    })
    expect((wrapper.get("[data-testid='marketplace-offers-sort']").element as HTMLSelectElement).value).toBe("recent")
    expect(wrapper.find("[data-testid='marketplace-offers-clear']").exists()).toBe(false)
    await vi.waitFor(() => expect(useRoute().query).toEqual({ tab: "marketplace-offers" }))
  })

  it("says so when no offer matches", async () => {
    cleanups = [
      registerEndpoint("/api/v1/marketplace/administration/offres", {
        method: "GET",
        handler: () => ({ ...PAGE, elements: [], pagination: { page: 1, taille: 50, total: 0, pages: 1 } }),
      }),
      registerEndpoint("/api/v1/marketplace/categories/administration", { method: "GET", handler: () => [] }),
    ]
    const wrapper = await mountSuspended(MarketplaceOffersWorkspace, {
      attachTo: document.body,
      route: "/operations?tab=marketplace-offers",
    })
    wrappers.push(wrapper)
    await flushPromises()
    expect(wrapper.text()).toContain("No offer matches these criteria.")
    expect(wrapper.find("[data-testid='marketplace-offers-next']").exists()).toBe(false)
  })

  it("restores shared shop, sorting and page filters directly from a bookmarked URL", async () => {
    const queries: Record<string, unknown>[] = []
    cleanups = [
      registerEndpoint("/api/v1/marketplace/administration/offres", {
        method: "GET",
        handler: event => {
          const query = getQuery(event)
          queries.push(query)
          return { ...PAGE, pagination: { ...PAGE.pagination, page: Number(query.page ?? 1) } }
        },
      }),
      registerEndpoint("/api/v1/marketplace/categories/administration", { method: "GET", handler: () => [] }),
    ]
    const wrapper = await mountSuspended(MarketplaceOffersWorkspace, {
      attachTo: document.body,
      route: `/operations?tab=marketplace-offers&boutique=${secondShopId}&tri=prix_desc&stock=disponible&page=2`,
    })
    wrappers.push(wrapper)
    await vi.waitFor(() =>
      expect(queries.at(-1)).toMatchObject({
        boutiqueId: secondShopId,
        tri: "prix_desc",
        stock: "disponible",
        page: "2",
      }),
    )
    await vi.waitFor(() =>
      expect((wrapper.get("[data-testid='marketplace-offers-shop']").element as HTMLSelectElement).value).toBe(
        secondShopId,
      ),
    )
    expect((wrapper.get("[data-testid='marketplace-offers-sort']").element as HTMLSelectElement).value).toBe(
      "prix_desc",
    )
    expect(wrapper.get("[data-testid='marketplace-offers-page']").text()).toBe("Page 2 of 3")
  })
})

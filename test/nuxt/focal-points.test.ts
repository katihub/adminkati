import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { getQuery, readBody } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import DisputeCustomer from "@/components/operations/DisputeCustomer.vue"
import FocalPointsWorkspace from "@/components/operations/FocalPointsWorkspace.vue"
import FocalShopsWorkspace from "@/components/operations/FocalShopsWorkspace.vue"

const SHOP = {
  id: "shop-1",
  nom: "Tech Bafoussam",
  slug: "tech-bafoussam",
  ville: "Bafoussam",
  statut: "active",
  creeLe: "2026-10-20T08:00:00.000Z",
  vendeur: { id: "v1", nomLegal: "Tech Ouest SARL", statut: "actif", statutVerification: "approuve" },
  pointFocal: null,
}
const MEMBERS = [
  {
    id: "pf-1",
    nom: "Awa Ngono",
    courriel: "awa@katihub.cm",
    telephone: null,
    actif: true,
    roles: ["point_focal"],
    boutiques: 2,
  },
  {
    id: "pf-2",
    nom: "Paul Ewane",
    courriel: "paul@katihub.cm",
    telephone: null,
    actif: false,
    roles: ["point_focal"],
    boutiques: 0,
  },
]

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach(cleanup => cleanup())
  cleanups = []
  useNuxtApp().$queryClient.clear()
})

describe("focal points (direction)", () => {
  it("lists the shops without a focal point and assigns one, shop by shop", async () => {
    const queries: Array<Record<string, unknown>> = []
    const assignments: unknown[] = []
    cleanups = [
      registerEndpoint("/api/v1/points-focaux", { method: "GET", handler: () => MEMBERS }),
      registerEndpoint("/api/v1/points-focaux/boutiques", {
        method: "GET",
        handler: event => {
          queries.push(getQuery(event))
          return { total: 1, page: 1, taille: 30, pages: 1, elements: [SHOP] }
        },
      }),
      registerEndpoint("/api/v1/points-focaux/boutiques/shop-1", {
        method: "PUT",
        handler: async event => {
          assignments.push(await readBody(event))
          return { ...SHOP, pointFocal: { id: "pf-1", nom: "Awa Ngono", actif: true, roles: ["point_focal"] } }
        },
      }),
    ]
    const wrapper = await mountSuspended(FocalPointsWorkspace)
    await vi.waitFor(() => expect(wrapper.find("[data-testid='focal-assign-shop-1']").exists()).toBe(true))
    expect(queries[0]).toMatchObject({ pointFocal: "sans", page: "1" })

    // An inactive focal point is never offered for a new assignment.
    const options = wrapper.findAll("[data-testid='focal-assign-select-shop-1'] option").map(option => option.text())
    expect(options).toContain("Awa Ngono")
    expect(options).not.toContain("Paul Ewane")

    await wrapper.get("[data-testid='focal-assign-select-shop-1']").setValue("pf-1")
    await vi.waitFor(() => expect(assignments).toEqual([{ membreId: "pf-1" }]))

    await wrapper.get("[data-testid='focal-scope-pf-1']").trigger("click")
    await vi.waitFor(() => expect(queries.at(-1)).toMatchObject({ pointFocal: "pf-1" }))
  })
})

describe("my shops (focal point)", () => {
  it("shows the orders of its shop with the customer's contact details", async () => {
    cleanups = [
      registerEndpoint("/api/v1/points-focaux/mes-boutiques", { method: "GET", handler: () => [SHOP] }),
      registerEndpoint("/api/v1/points-focaux/boutiques/shop-1/commandes", {
        method: "GET",
        handler: () => ({
          total: 1,
          page: 1,
          taille: 30,
          pages: 1,
          elements: [
            {
              id: "sc-1",
              reference: "SC-1001",
              statut: "livree",
              modeLivraison: "katihub",
              totalNetProduits: 45000,
              creeLe: "2026-10-21T10:00:00.000Z",
              expeditions: [],
              lignes: [{ produitNomCapture: "Routeur AX3000", quantite: 1, totalNetFcfa: 45000, quantiteRetournee: 0 }],
              commande: {
                reference: "CMD-1001",
                adresseFigee: { ville: "Bafoussam", quartier: "Tamdja", repere: "Face pharmacie" },
                telephoneLivraison: "+237 690 11 22 33",
                client: { courriel: "client@example.cm", nom: "Marie Fotso", telephone: "+237 677 00 00 00" },
              },
            },
          ],
        }),
      }),
    ]
    const wrapper = await mountSuspended(FocalShopsWorkspace)
    await vi.waitFor(() => expect(wrapper.find("[data-testid='focal-order-SC-1001']").exists()).toBe(true))
    const order = wrapper.get("[data-testid='focal-order-SC-1001']").text()
    expect(order).toContain("Marie Fotso")
    expect(order).toContain("+237 690 11 22 33")
    expect(order).toContain("Bafoussam · Tamdja · Face pharmacie")
    expect(order).toContain("1 × Routeur AX3000")
  })

  it("explains that no shop is assigned yet", async () => {
    cleanups = [registerEndpoint("/api/v1/points-focaux/mes-boutiques", { method: "GET", handler: () => [] })]
    const wrapper = await mountSuspended(FocalShopsWorkspace)
    await vi.waitFor(() => expect(wrapper.text()).toContain("No shop is assigned to you yet"))
  })
})

describe("dispute customer", () => {
  it("gives the customer's phones, e-mail and delivery address", async () => {
    const wrapper = await mountSuspended(DisputeCustomer, {
      props: {
        demande: {
          id: "d1",
          reference: "LIT-1",
          objet: "Colis abîmé",
          categorie: "livraison",
          statut: "en_arbitrage",
          client: { courriel: "client@example.cm", profil: { nom: "Marie Fotso", telephone: "+237 677 00 00 00" } },
          boutique: { id: "shop-1", nom: "Tech Bafoussam" },
          commande: {
            id: "c1",
            reference: "CMD-1001",
            adresseFigee: { ville: "Bafoussam", quartier: "Tamdja" },
            telephoneLivraison: "+237 690 11 22 33",
          },
          expedition: null,
        },
      },
    })
    expect(wrapper.get("[data-testid='dispute-customer-phone']").text()).toBe("+237 690 11 22 33 · +237 677 00 00 00")
    expect(wrapper.text()).toContain("Bafoussam · Tamdja")
    expect(wrapper.text()).toContain("client@example.cm")
  })
})

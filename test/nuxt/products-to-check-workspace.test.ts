import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"
import ProductsToCheckWorkspace from "@/components/operations/ProductsToCheckWorkspace.vue"

const PRODUCT = {
  id: "p1",
  nom: "Peigne chauffant",
  slug: "peigne-chauffant",
  marque: null,
  categorie: "Beauté",
  statut: "actif",
  descriptionCourte: "Lisse en quelques minutes.",
  motifDecision: null,
  aControlerDepuis: "2026-11-07T09:30:00.000Z",
  creeLe: "2026-11-07T09:26:00.000Z",
  nouveau: true,
  proposeParBoutique: { id: "b1", nom: "OGA SHOP", slug: "oga-shop" },
  images: [],
  offres: [{ id: "o1", titre: "Peigne chauffant", libelleVariante: null, prixFcfa: 7500 }],
}

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach(cleanup => cleanup())
  cleanups = []
  useNuxtApp().$queryClient.clear()
})

describe("products to check workspace", () => {
  it("lists what a shop published without validation, and marks it seen in one click", async () => {
    const seen: string[] = []
    cleanups = [
      registerEndpoint("/api/v1/marketplace/moderation/produits-a-controler", {
        method: "GET",
        handler: () => [PRODUCT],
      }),
      registerEndpoint("/api/v1/marketplace/moderation/produits/p1/vu", {
        method: "POST",
        handler: () => {
          seen.push("p1")
          return { id: "p1", statut: "actif", motifDecision: null, aControlerDepuis: null }
        },
      }),
    ]
    const wrapper = await mountSuspended(ProductsToCheckWorkspace)
    await flushPromises()

    await vi.waitFor(() => expect(wrapper.find("[data-testid='product-to-check-p1']").exists()).toBe(true))
    const card = wrapper.get("[data-testid='product-to-check-p1']")
    expect(card.text()).toContain("Peigne chauffant")
    expect(card.text()).toContain("OGA SHOP")
    expect(card.text()).toContain("New")
    expect(card.find("[data-testid='product-check-hide']").exists()).toBe(true)
    expect(card.find("[data-testid='product-check-restore']").exists()).toBe(false)

    await card.get("[data-testid='product-check-seen']").trigger("click")
    await vi.waitFor(() => expect(seen).toEqual(["p1"]))
    wrapper.unmount()
  })
})

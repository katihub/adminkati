import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import SellerOnboardingWorkspace from "@/components/operations/SellerOnboardingWorkspace.vue"

const seller = {
  id: "seller-1",
  type: "entreprise",
  nomLegal: "Marché Central",
  niu: "M012345678",
  rccm: "RC/DLA/2026/B/42",
  statutVerification: "soumis",
  statut: "inactif",
  commissionBps: 800,
  motifStatut: null,
  creeLe: "2026-10-10T08:00:00.000Z",
  boutiques: [{ id: "shop-1", nom: "Marché Central", slug: "marche-central", statut: "inactive" }],
}

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach(cleanup => cleanup())
  cleanups = []
  useNuxtApp().$queryClient.clear()
})

/**
 * La liste des candidatures ne defile que si sa colonne reste en flex :
 * en `block`, la zone de defilement s'etire a toute la liste et la colonne
 * coupe ce qui depasse (11 novembre 2026).
 */
describe("seller onboarding list scroll", () => {
  it.each([
    ["without a selected application", "/operations", ["flex"], ["hidden"]],
    ["with a selected application", "/operations?candidature=seller-1", ["hidden", "lg:flex"], ["lg:block", "block"]],
  ])("keeps the list column a flex column %s", async (_label, route, present, absent) => {
    cleanups = [
      registerEndpoint("/api/v1/vendeurs", {
        method: "GET",
        handler: () => ({ total: 1, page: 1, taille: 50, pages: 1, elements: [seller] }),
      }),
      registerEndpoint("/api/v1/vendeurs/seller-1", {
        method: "GET",
        handler: () => ({ ...seller, documents: [], boutiques: [{ ...seller.boutiques[0], membres: [] }] }),
      }),
    ]
    useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
      userId: "u1",
      membreId: "m1",
      nom: "Admin",
      courriel: "admin@example.com",
      roles: ["direction"],
    })
    const wrapper = await mountSuspended(SellerOnboardingWorkspace, { route })
    await flushPromises()

    const classes = wrapper.get("aside").classes()
    expect(classes).toEqual(expect.arrayContaining([...present, "flex-col", "min-h-0"]))
    for (const name of absent) expect(classes).not.toContain(name)
    wrapper.unmount()
  })
})

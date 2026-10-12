import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { getQuery, readBody } from "h3"
import { describe, expect, it } from "vitest"
import { defineComponent, h } from "vue"
import {
  useMarketplaceCatalogueModerationMutations,
  useMarketplaceOfferReviews,
  useMarketplaceProductReviews,
  useSellerReviewDetail,
  useSellerReviewList,
  useSellerReviewMutations,
} from "@/composables/useMarketplaceModeration"

const seller = {
  id: "seller-1",
  type: "entreprise",
  nomLegal: "Marché Central",
  niu: "M012345678",
  rccm: "RC/DLA/2026/B/42",
  statutVerification: "en_verification" as const,
  statut: "inactif" as const,
  commissionBps: 800,
  motifStatut: null,
  creeLe: "2026-10-10T08:00:00.000Z",
  boutiques: [{ id: "shop-1", nom: "Marché Central", slug: "marche-central", statut: "inactive" }],
}

describe("marketplace moderation API integration", () => {
  it("fetches seller applications with filters and a stable detail URL", async () => {
    let observedQuery: Record<string, unknown> | undefined
    const listCleanup = registerEndpoint("/api/v1/vendeurs", {
      method: "GET",
      handler: event => {
        observedQuery = getQuery(event)
        return { total: 1, page: 1, taille: 25, pages: 1, elements: [seller] }
      },
    })
    const detailCleanup = registerEndpoint("/api/v1/vendeurs/seller-1", {
      method: "GET",
      handler: () => ({ ...seller, documents: [], boutiques: [{ ...seller.boutiques[0], membres: [] }] }),
    })
    let list: ReturnType<typeof useSellerReviewList> | undefined
    let detail: ReturnType<typeof useSellerReviewDetail> | undefined
    const Probe = defineComponent({
      setup() {
        list = useSellerReviewList({ q: "central", verification: "en_verification", page: 1, taille: 25 })
        detail = useSellerReviewDetail("seller-1")
        return () => h("div")
      },
    })

    const wrapper = await mountSuspended(Probe)
    await flushPromises()

    expect(observedQuery).toEqual({ q: "central", verification: "en_verification", page: "1", taille: "25" })
    expect(list?.data.value?.elements[0]?.nomLegal).toBe("Marché Central")
    expect(detail?.data.value?.id).toBe("seller-1")

    listCleanup()
    detailCleanup()
    wrapper.unmount()
    useNuxtApp().$queryClient.clear()
  })

  it("sends document and seller application decisions with their exact backend contracts", async () => {
    const commands: Array<{ path: string; body?: unknown }> = []
    const cleanups = [
      registerEndpoint("/api/v1/vendeurs/seller-1/documents/document-1/prise-en-charge", {
        method: "POST",
        handler: () => {
          commands.push({ path: "claim-document" })
          return { ok: true }
        },
      }),
      registerEndpoint("/api/v1/vendeurs/seller-1/documents/document-1/decision", {
        method: "POST",
        handler: async event => {
          commands.push({ path: "decide-document", body: await readBody(event) })
          return { ok: true }
        },
      }),
      registerEndpoint("/api/v1/vendeurs/seller-1/decision-dossier", {
        method: "POST",
        handler: async event => {
          commands.push({ path: "decide-application", body: await readBody(event) })
          return { ok: true }
        },
      }),
    ]
    let mutations: ReturnType<typeof useSellerReviewMutations> | undefined
    const Probe = defineComponent({
      async setup() {
        mutations = useSellerReviewMutations()
        await mutations.claimDocument.mutateAsync({ sellerId: "seller-1", documentId: "document-1" })
        await mutations.decideDocument.mutateAsync({
          sellerId: "seller-1",
          documentId: "document-1",
          decision: "refuse",
          motif: "Document illisible",
        })
        await mutations.decideApplication.mutateAsync({
          sellerId: "seller-1",
          decision: "modification_demandee",
          motif: "NIU à corriger",
        })
        return () => h("div")
      },
    })

    const wrapper = await mountSuspended(Probe)
    await flushPromises()

    expect(commands).toEqual([
      { path: "claim-document" },
      { path: "decide-document", body: { decision: "refuse", motif: "Document illisible" } },
      { path: "decide-application", body: { decision: "modification_demandee", motif: "NIU à corriger" } },
    ])

    cleanups.forEach(cleanup => cleanup())
    wrapper.unmount()
    useNuxtApp().$queryClient.clear()
  })

  it("reads both catalogue queues and sends claim and decision commands", async () => {
    const product = { id: "product-1", nom: "Téléphone", statut: "soumis" }
    const offer = { id: "offer-revision-1", titre: "Offre Douala", statut: "soumise" }
    const commands: Array<{ path: string; body?: unknown }> = []
    const cleanups = [
      registerEndpoint("/api/v1/marketplace/moderation/produits", { method: "GET", handler: () => [product] }),
      registerEndpoint("/api/v1/marketplace/moderation/offres", { method: "GET", handler: () => [offer] }),
      registerEndpoint("/api/v1/marketplace/moderation/produits/product-1/prise-en-charge", {
        method: "POST",
        handler: () => {
          commands.push({ path: "claim-product" })
          return { ok: true }
        },
      }),
      registerEndpoint("/api/v1/marketplace/moderation/produits/product-1/decision", {
        method: "POST",
        handler: async event => {
          commands.push({ path: "decide-product", body: await readBody(event) })
          return { ok: true }
        },
      }),
      registerEndpoint("/api/v1/marketplace/moderation/offres/offer-revision-1/prise-en-charge", {
        method: "POST",
        handler: () => {
          commands.push({ path: "claim-offer" })
          return { ok: true }
        },
      }),
      registerEndpoint("/api/v1/marketplace/moderation/offres/offer-revision-1/decision", {
        method: "POST",
        handler: async event => {
          commands.push({ path: "decide-offer", body: await readBody(event) })
          return { ok: true }
        },
      }),
    ]
    let products: ReturnType<typeof useMarketplaceProductReviews> | undefined
    let offers: ReturnType<typeof useMarketplaceOfferReviews> | undefined
    let mutations: ReturnType<typeof useMarketplaceCatalogueModerationMutations> | undefined
    const Probe = defineComponent({
      async setup() {
        products = useMarketplaceProductReviews()
        offers = useMarketplaceOfferReviews()
        mutations = useMarketplaceCatalogueModerationMutations()
        await mutations.claimProduct.mutateAsync("product-1")
        await mutations.decideProduct.mutateAsync({ id: "product-1", decision: "actif" })
        await mutations.claimOffer.mutateAsync("offer-revision-1")
        await mutations.decideOffer.mutateAsync({
          id: "offer-revision-1",
          decision: "refusee",
          motif: "Prix incohérent",
        })
        return () => h("div")
      },
    })

    const wrapper = await mountSuspended(Probe)
    await flushPromises()

    expect(products?.data.value).toEqual([product])
    expect(offers?.data.value).toEqual([offer])
    expect(commands).toEqual([
      { path: "claim-product" },
      { path: "decide-product", body: { decision: "actif" } },
      { path: "claim-offer" },
      { path: "decide-offer", body: { decision: "refusee", motif: "Prix incohérent" } },
    ])

    cleanups.forEach(cleanup => cleanup())
    wrapper.unmount()
    useNuxtApp().$queryClient.clear()
  })
})

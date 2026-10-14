import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody } from "h3"
import { afterEach, describe, expect, it } from "vitest"
import MarketplaceCatalogueModerationWorkspace from "@/components/operations/MarketplaceCatalogueModerationWorkspace.vue"

const image = (id: string, url: string) => ({
  id,
  url,
  texteAlternatif: null,
  ordre: 0,
  statut: "proposee",
  typeMime: "image/webp",
  tailleOctets: 204_800,
  creeLe: "2026-10-14T08:00:00.000Z",
})

const revision = (statut: string) => ({
  id: "content-1",
  numero: 2,
  statut,
  metaTitre: "Samsung Galaxy A15 128 Go au meilleur prix",
  metaDescription: "Le Galaxy A15 128 Go, neuf et garanti 12 mois, livré à Douala sous 48 h par KatiHub.",
  soumisLe: "2026-10-14T08:00:00.000Z",
  motifDecision: null,
  produit: { id: "product-1", nom: "Samsung Galaxy A15", slug: "galaxy-a15", metaTitre: null, metaDescription: null },
  boutique: { id: "shop-1", nom: "Maison Kati" },
  images: [
    { imageId: "img-b", texteAlternatif: "Vue de face", image: image("img-b", "https://cdn.test/b.webp") },
    { imageId: "img-gone", texteAlternatif: null, image: null },
  ],
})

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach(cleanup => cleanup())
  cleanups = []
  useNuxtApp().$queryClient.clear()
})

function endpoints(statut: string, commands: Array<{ path: string; body?: unknown }>) {
  cleanups = [
    registerEndpoint("/api/v1/marketplace/moderation/produits", { method: "GET", handler: () => [] }),
    registerEndpoint("/api/v1/marketplace/moderation/offres", { method: "GET", handler: () => [] }),
    registerEndpoint("/api/v1/marketplace/moderation/contenus-produits", {
      method: "GET",
      handler: () => [revision(statut)],
    }),
    registerEndpoint("/api/v1/marketplace/moderation/contenus-produits/content-1/prise-en-charge", {
      method: "POST",
      handler: () => {
        commands.push({ path: "claim" })
        return { ok: true }
      },
    }),
    registerEndpoint("/api/v1/marketplace/moderation/contenus-produits/content-1/decision", {
      method: "POST",
      handler: async event => {
        commands.push({ path: "decide", body: await readBody(event) })
        return { ok: true }
      },
    }),
  ]
}

async function openContents() {
  const wrapper = await mountSuspended(MarketplaceCatalogueModerationWorkspace)
  await flushPromises()
  await wrapper.get('[data-testid="catalogue-queue-contents"]').trigger("click")
  await flushPromises()
  return wrapper
}

describe("product sheet moderation", () => {
  it("shows the proposed SEO next to the current one and the gallery in publication order", async () => {
    endpoints("soumise", [])
    const wrapper = await openContents()

    const seo = wrapper.get('[data-testid="content-review-seo"]').text()
    expect(seo).toContain("Samsung Galaxy A15 128 Go au meilleur prix")
    expect(seo).toContain("42/70")
    expect(seo).toContain("Not set")

    const gallery = wrapper.get('[data-testid="content-review-gallery"]')
    const items = gallery.findAll("li")
    expect(items).toHaveLength(2)
    expect(items[0]!.text()).toContain("Main image")
    expect(items[0]!.text()).toContain("Vue de face")
    expect(items[0]!.get("img").attributes("src")).toBe("https://cdn.test/b.webp")
    expect(items[1]!.text()).toContain("File not found")
    wrapper.unmount()
  })

  it("claims a submitted sheet, then approves one under review", async () => {
    const commands: Array<{ path: string; body?: unknown }> = []
    endpoints("soumise", commands)
    let wrapper = await openContents()
    await wrapper.get('[data-testid="catalogue-claim"]').trigger("click")
    await flushPromises()
    wrapper.unmount()
    cleanups.forEach(cleanup => cleanup())
    useNuxtApp().$queryClient.clear()

    endpoints("en_verification", commands)
    wrapper = await openContents()
    await wrapper.get('[data-testid="catalogue-approve"]').trigger("click")
    await flushPromises()

    expect(commands).toEqual([{ path: "claim" }, { path: "decide", body: { decision: "approuvee" } }])
    wrapper.unmount()
  })
})

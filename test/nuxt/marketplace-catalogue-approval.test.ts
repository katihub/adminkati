import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import MarketplaceCatalogueModerationWorkspace from "@/components/operations/MarketplaceCatalogueModerationWorkspace.vue"

const product = (id: string, nom: string) => ({
  id,
  slug: id,
  nom,
  description: null,
  marque: "HP",
  categorie: "Ordinateurs portables",
  statut: "soumis",
  motifDecision: null,
  creeLe: "2026-11-03T08:00:00.000Z",
  proposeParBoutique: { id: "shop-1", nom: "NowTech", slug: "nowtech", vendeurId: "v1" },
  images: [{ id: `${id}-img`, url: `https://cdn.test/${id}.webp`, texteAlternatif: "Vue de face", statut: "proposee" }],
  revisionsContenu: [{ id: `${id}-rev`, statut: "soumise" }],
})

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach(cleanup => cleanup())
  cleanups = []
  useNuxtApp().$queryClient.clear()
  document.body.innerHTML = ""
})

function endpoints(approvals: unknown[]) {
  cleanups = [
    registerEndpoint("/api/v1/marketplace/moderation/produits", {
      method: "GET",
      handler: () => [product("p1", "HP ProBook 460"), product("p2", "HP OMEN 16")],
    }),
    registerEndpoint("/api/v1/marketplace/moderation/offres", { method: "GET", handler: () => [] }),
    registerEndpoint("/api/v1/marketplace/moderation/contenus-produits", { method: "GET", handler: () => [] }),
    registerEndpoint("/api/v1/marketplace/moderation/produits/approbation", {
      method: "POST",
      handler: async event => {
        const body = (await readBody(event)) as { produitIds: string[] }
        approvals.push(body)
        return { approuves: body.produitIds, echecs: [] }
      },
    }),
  ]
}

describe("catalogue approval in one click", () => {
  it("shows the photos the shop sent with the product under review", async () => {
    endpoints([])
    const wrapper = await mountSuspended(MarketplaceCatalogueModerationWorkspace)
    await flushPromises()
    const gallery = wrapper.get("[data-testid='moderation-images']")
    expect(gallery.find("img").attributes("src")).toBe("https://cdn.test/p1.webp")
    expect(gallery.text()).toContain("Proposed")
  })

  it("approves a submitted product in one click, without claiming it first", async () => {
    const approvals: unknown[] = []
    endpoints(approvals)
    const wrapper = await mountSuspended(MarketplaceCatalogueModerationWorkspace)
    await flushPromises()
    const approve = wrapper.get("[data-testid='catalogue-approve']")
    expect(approve.attributes("disabled")).toBeUndefined()
    await approve.trigger("click")
    await vi.waitFor(() => expect(approvals).toEqual([{ produitIds: ["p1"] }]))
  })

  it("approves the whole queue after a confirmation", async () => {
    const approvals: unknown[] = []
    endpoints(approvals)
    const wrapper = await mountSuspended(MarketplaceCatalogueModerationWorkspace, { attachTo: document.body })
    await flushPromises()
    const button = wrapper.get("[data-testid='catalogue-approve-all']")
    expect(button.text()).toContain("Approve all (2)")
    await button.trigger("click")
    await flushPromises()
    await vi.waitFor(() =>
      expect(document.body.querySelector("[data-testid='catalogue-approve-all-confirm']")).not.toBeNull(),
    )
    document.body.querySelector<HTMLButtonElement>("[data-testid='catalogue-approve-all-confirm']")!.click()
    await vi.waitFor(() => expect(approvals).toEqual([{ produitIds: ["p1", "p2"] }]))
  })
})

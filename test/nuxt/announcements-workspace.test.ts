import type { AnnonceAdmin } from "@/types/api/vitrine"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import ContentPage from "@/pages/content.vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

const annonces: AnnonceAdmin[] = [
  { id: 1, texte: "Livraison rapide partout au Cameroun", ordre: 10, active: true },
  { id: 2, texte: "Paiement sécurisé", ordre: 20, active: false },
]

function seedSession(roles: string[]) {
  useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
    userId: "u1",
    membreId: "m1",
    nom: "Admin",
    courriel: "admin@example.com",
    roles,
  })
}

function seedAnnonces() {
  useNuxtApp().$queryClient.setQueryData(apiQueryKeys.announcements.all, annonces)
}

describe("announcements workspace", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("shows read-only announcement content to comptoir and hides every write control", async () => {
    seedSession(["comptoir"])
    seedAnnonces()
    const wrapper = await mountSuspended(ContentPage, { route: "/content?tab=annonces", attachTo: document.body })
    await flushPromises()

    expect(wrapper.get('[data-testid="announcements-workspace"]').text()).toContain(annonces[0]!.texte)
    expect(wrapper.get('[data-testid="announcements-workspace"]').text()).toContain(annonces[1]!.texte)
    expect(wrapper.find('input[placeholder*="Livraison"]').exists()).toBe(false)
    expect(wrapper.find('button[aria-label*="Monter"]').exists()).toBe(false)
    expect(wrapper.find("button").text()).not.toMatch(/Ajouter|Modifier|Activer|Désactiver/)

    wrapper.unmount()
  })

  it("creates an announcement from the direction workspace with the entered text", async () => {
    seedSession(["direction"])
    seedAnnonces()
    let body: unknown
    const cleanup = registerEndpoint("/api/v1/vitrine/administration/annonces", {
      method: "POST",
      handler: async event => {
        body = await readBody(event)
        return { id: 3, texte: "Une équipe à votre écoute 24/7", ordre: 30, active: true }
      },
    })
    const wrapper = await mountSuspended(ContentPage, { route: "/content?tab=annonces", attachTo: document.body })
    await flushPromises()

    const input = wrapper.get('[data-testid="announcements-workspace"] input')
    await input.setValue("Une équipe à votre écoute 24/7")
    await wrapper.get('[data-testid="announcements-workspace"] form').trigger("submit")
    await vi.waitFor(() => expect(body).toEqual({ texte: "Une équipe à votre écoute 24/7" }))

    cleanup()
    wrapper.unmount()
  })

  it("edits, deactivates and reorders announcements through the administration API", async () => {
    seedSession(["direction"])
    let rows = annonces.map(row => ({ ...row }))
    const patchBodies: Array<{ id: number; body: unknown }> = []
    let orderedIds: number[] = []
    const cleanupList = registerEndpoint("/api/v1/vitrine/administration/annonces", {
      method: "GET",
      handler: () => rows,
    })
    const cleanupFirst = registerEndpoint("/api/v1/vitrine/administration/annonces/1", {
      method: "PATCH",
      handler: async event => {
        const body = await readBody(event)
        patchBodies.push({ id: 1, body })
        rows = rows.map(row => (row.id === 1 ? { ...row, ...body } : row))
        return rows.find(row => row.id === 1)
      },
    })
    const cleanupReorder = registerEndpoint("/api/v1/vitrine/administration/annonces/reordonner", {
      method: "POST",
      handler: async event => {
        orderedIds = (await readBody<{ ids: number[] }>(event)).ids
        rows = orderedIds.map(id => rows.find(row => row.id === id)!)
        return rows
      },
    })
    const wrapper = await mountSuspended(ContentPage, { route: "/content?tab=annonces", attachTo: document.body })
    await flushPromises()

    const first = wrapper.get('[data-testid="announcement-1"]')
    await first.get("button:not([aria-label])").trigger("click")
    await first.get("input").setValue("Livraison modifiée")
    await first
      .findAll("button")
      .find(button => button.text() === "Save")!
      .trigger("click")
    await vi.waitFor(() => expect(patchBodies[0]).toEqual({ id: 1, body: { texte: "Livraison modifiée" } }))

    await first
      .findAll("button")
      .find(button => button.text() === "Deactivate")!
      .trigger("click")
    await vi.waitFor(() => expect(patchBodies[1]).toEqual({ id: 1, body: { active: false } }))
    await first.get('button[aria-label="Move announcement down"]').trigger("click")
    await vi.waitFor(() => expect(orderedIds).toEqual([2, 1]))

    cleanupList()
    cleanupFirst()
    cleanupReorder()
    wrapper.unmount()
  })
})

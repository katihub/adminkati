import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import ReportedReviewsWorkspace from "@/components/operations/ReportedReviewsWorkspace.vue"

const REVIEW = {
  id: "a1",
  note: 1,
  commentaire: "Livraison jamais arrivée.",
  statut: "publie",
  dimension: "vendeur",
  creeLe: "2026-10-12T08:00:00.000Z",
  signaleLe: "2026-10-14T08:00:00.000Z",
  modereLe: null,
  auteur: "Paul E.",
  ville: "Douala",
  ligne: {
    offreTitreCapture: "Samsung Galaxy A15",
    sousCommande: { reference: "CM-X-1", boutique: { nom: "TechMall", slug: "techmall" } },
  },
  signalements: [
    { id: "s1", auteurType: "vendeur", motif: "Le client a bien été livré", creeLe: "2026-10-14T08:00:00.000Z" },
    {
      id: "s2",
      auteurType: "equipe",
      motif: "À vérifier avec la preuve de livraison",
      creeLe: "2026-10-14T09:00:00.000Z",
    },
  ],
}

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach(cleanup => cleanup())
  cleanups = []
  useNuxtApp().$queryClient.clear()
})

describe("reported reviews workspace", () => {
  it("shows a reported review that is still published, its reports, and needs a reason to decide", async () => {
    const decisions: unknown[] = []
    cleanups = [
      registerEndpoint("/api/v1/marketplace/reputation/avis/a-moderer", { method: "GET", handler: () => [REVIEW] }),
      registerEndpoint("/api/v1/marketplace/reputation/avis/a1/moderation", {
        method: "POST",
        handler: async event => {
          decisions.push(await readBody(event))
          return { ok: true }
        },
      }),
    ]
    const wrapper = await mountSuspended(ReportedReviewsWorkspace)
    await flushPromises()

    await vi.waitFor(() => expect(wrapper.find("[data-testid='reported-review-a1']").exists()).toBe(true))
    const card = wrapper.get("[data-testid='reported-review-a1']")
    expect(card.text()).toContain("Still published")
    expect(card.text()).toContain("2 reports")
    expect(card.text()).toContain("The shop")
    expect(card.text()).toContain("KatiHub")

    const hide = wrapper.get("[data-testid='reported-review-hide-a1']")
    expect(hide.attributes("disabled")).toBeDefined()
    await wrapper.get("[data-testid='reported-review-reason-a1']").setValue("Preuve de livraison signée par le client")
    await hide.trigger("click")
    await vi.waitFor(() =>
      expect(decisions).toEqual([{ statut: "masque", motif: "Preuve de livraison signée par le client" }]),
    )
    wrapper.unmount()
  })
})

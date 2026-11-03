import type { SellerConversation, SellerThread } from "@/composables/useSellerMessaging"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import SellerMessagingWorkspace from "@/components/operations/SellerMessagingWorkspace.vue"

const ID = "33333333-3333-4333-8333-333333333333"
const shop = { id: "b1", nom: "NowTech", slug: "nowtech" }
const conversation: SellerConversation = {
  id: ID,
  sujet: "Reversement de septembre",
  statut: "ouverte",
  dernierMessageLe: "2026-11-03T10:00:00.000Z",
  creeLe: "2026-11-03T09:00:00.000Z",
  boutique: shop,
  nonLus: 2,
}
const thread: SellerThread = {
  ...conversation,
  messages: [
    {
      id: "m1",
      auteurType: "vendeur",
      auteurNom: "Paul (NowTech)",
      contenu: "Quand est versé mon solde ?",
      creeLe: "2026-11-03T09:00:00.000Z",
    },
  ],
}
let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach(cleanup => cleanup())
  cleanups = []
})

describe("seller messages in operations", () => {
  it("lists the conversations with unread counts, opens a thread, replies and marks it resolved", async () => {
    const replies: unknown[] = []
    const statuses: unknown[] = []
    cleanups.push(
      registerEndpoint("/api/v1/messagerie-vendeurs", () => [conversation]),
      registerEndpoint(`/api/v1/messagerie-vendeurs/${ID}`, () => thread),
      registerEndpoint(`/api/v1/messagerie-vendeurs/${ID}/messages`, {
        method: "POST",
        handler: async event => {
          replies.push(await readBody(event))
          return thread
        },
      }),
      registerEndpoint(`/api/v1/messagerie-vendeurs/${ID}/statut`, {
        method: "POST",
        handler: async event => {
          statuses.push(await readBody(event))
          return { ...thread, statut: "resolue" }
        },
      }),
    )
    const wrapper = await mountSuspended(SellerMessagingWorkspace)
    await vi.waitFor(() => expect(wrapper.find(`[data-testid='seller-conversation-${ID}']`).exists()).toBe(true))
    expect(wrapper.get(`[data-testid='seller-conversation-unread-${ID}']`).text()).toBe("2")
    expect(wrapper.text()).toContain("NowTech")

    await wrapper.get(`[data-testid='seller-conversation-${ID}']`).trigger("click")
    await vi.waitFor(() => expect(wrapper.text()).toContain("Quand est versé mon solde ?"))

    await wrapper.get("[data-testid='seller-thread-reply']").setValue("Le virement part demain.")
    await wrapper.get("form").trigger("submit")
    await vi.waitFor(() => expect(replies).toEqual([{ contenu: "Le virement part demain." }]))

    await wrapper.get("[data-testid='seller-thread-status']").trigger("click")
    await flushPromises()
    await vi.waitFor(() => expect(statuses).toEqual([{ statut: "resolue" }]))
  })

  it("says when there is no conversation", async () => {
    cleanups.push(registerEndpoint("/api/v1/messagerie-vendeurs", () => []))
    const wrapper = await mountSuspended(SellerMessagingWorkspace)
    await vi.waitFor(() => expect(wrapper.text()).toContain("No conversation here."))
  })
})

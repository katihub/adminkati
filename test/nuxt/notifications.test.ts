import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { afterEach, describe, expect, it, vi } from "vitest"
import NotificationBell from "@/components/admin/NotificationBell/NotificationBell.vue"
import NotificationsPage from "@/pages/notifications.vue"

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach(cleanup => cleanup())
  cleanups = []
})

const PAGE = {
  elements: [
    {
      id: "n2",
      type: "messagerie.vendeur",
      titre: "Nouveau message : Reversement",
      texte: "Paul (NowTech) : Toujours rien reçu",
      lien: "/operations?tab=seller-messages",
      creeLe: new Date().toISOString(),
      lu: false,
    },
    {
      id: "n1",
      type: "commande.nouvelle",
      titre: "Nouvelle commande KM-1",
      texte: "NowTech · 150 000 XAF",
      lien: "/orders",
      creeLe: new Date(Date.now() - 3_600_000).toISOString(),
      lu: true,
    },
  ],
  nonLues: 1,
  suivant: null,
}

function api(calls: string[]) {
  cleanups.push(
    registerEndpoint("/api/v1/notifications-app/equipe/compteur", () => ({ nonLues: 3 })),
    registerEndpoint("/api/v1/notifications-app/equipe", () => PAGE),
    registerEndpoint("/api/v1/notifications-app/equipe/n2/lue", {
      method: "POST",
      handler: () => {
        calls.push("lue:n2")
        return { nonLues: 0 }
      },
    }),
    registerEndpoint("/api/v1/notifications-app/equipe/tout-lu", {
      method: "POST",
      handler: () => {
        calls.push("tout-lu")
        return { nonLues: 0 }
      },
    }),
  )
}

describe("the team notifications", () => {
  it("shows the unread count on the bell", async () => {
    api([])
    const wrapper = await mountSuspended(NotificationBell)
    await vi.waitFor(() => expect(wrapper.find("[data-testid='notification-badge']").text()).toBe("3"))
    expect(wrapper.get("[data-testid='notification-bell']").attributes("aria-label")).toBe("Notifications, 3 unread")
  })

  it("lists the history, marks a notification read when opened, and marks everything read", async () => {
    const calls: string[] = []
    api(calls)
    const wrapper = await mountSuspended(NotificationsPage)
    await vi.waitFor(() => expect(wrapper.findAll("[data-testid='notification-item']")).toHaveLength(2))
    const [unread, read] = wrapper.findAll("[data-testid='notification-item']")
    expect(unread!.attributes("data-unread")).toBe("true")
    expect(read!.attributes("data-unread")).toBeUndefined()
    expect(wrapper.text()).toContain("Paul (NowTech) : Toujours rien reçu")

    await unread!.trigger("click")
    await vi.waitFor(() => expect(calls).toContain("lue:n2"))
    await wrapper.get("[data-testid='notifications-mark-all']").trigger("click")
    await vi.waitFor(() => expect(calls).toContain("tout-lu"))
  })
})

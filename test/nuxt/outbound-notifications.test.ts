import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { getQuery } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import OutboundNotificationsWorkspace from "@/components/operations/OutboundNotificationsWorkspace.vue"

const ABANDONED = {
  id: "33333333-3333-4333-8333-333333333333",
  evenement: "litige.ouvert",
  destinataire: "vendeur@boutique.cm",
  destinataireType: "vendeur",
  sujet: "Nouveau litige DC-1",
  objetType: "demande_client_marketplace",
  objetId: "d1",
  statut: "abandonnee",
  tentatives: 8,
  prochaineTentativeLe: "2026-10-13T08:00:00.000Z",
  derniereErreur: "quota depasse",
  fournisseur: null,
  envoyeeLe: null,
  creeLe: "2026-10-13T07:00:00.000Z",
}

function registerApi() {
  const calls = { list: vi.fn(), retry: vi.fn(), dispatch: vi.fn() }
  const cleanups = [
    registerEndpoint("/api/v1/notifications/synthese", {
      method: "GET",
      handler: () => ({ en_attente: 4, en_cours: 0, envoyee: 120, abandonnee: 1, attentePlusAncienneMinutes: 12 }),
    }),
    registerEndpoint("/api/v1/notifications", {
      method: "GET",
      handler: event => {
        calls.list(getQuery(event))
        return { elements: [ABANDONED], total: 1, page: 1, taille: 30, pages: 1 }
      },
    }),
    registerEndpoint(`/api/v1/notifications/${ABANDONED.id}/relancer`, {
      method: "POST",
      handler: () => {
        calls.retry()
        return { ...ABANDONED, statut: "en_attente", tentatives: 0 }
      },
    }),
    registerEndpoint("/api/v1/notifications/traiter", {
      method: "POST",
      handler: () => {
        calls.dispatch()
        return { prises: 0, envoyees: 0, reprogrammees: 0, abandonnees: 0, ignore: "fournisseur_absent" }
      },
    }),
  ]
  return { calls, cleanup: () => cleanups.forEach(cleanup => cleanup()) }
}

describe("outbound notifications workspace", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("summarises the queue and surfaces the abandoned notification with its last error", async () => {
    const { cleanup } = registerApi()
    const wrapper = await mountSuspended(OutboundNotificationsWorkspace)
    await vi.waitFor(() => expect(wrapper.find("[data-testid='outbound-notifications-list']").exists()).toBe(true))

    expect(wrapper.get("[data-testid='outbound-notifications-count-abandonnee']").text()).toContain("1")
    expect(wrapper.get("[data-testid='outbound-notifications-count-abandonnee']").classes()).toContain("border-red-300")
    expect(wrapper.text()).toContain("quota depasse")

    wrapper.unmount()
    cleanup()
  })

  it("filters by status and retries an abandoned notification", async () => {
    const { calls, cleanup } = registerApi()
    const wrapper = await mountSuspended(OutboundNotificationsWorkspace)
    await vi.waitFor(() =>
      expect(wrapper.find(`[data-testid='outbound-notification-retry-${ABANDONED.id}']`).exists()).toBe(true),
    )

    // Filters render in status order after "all": the fifth one is "abandoned".
    await wrapper.findAll("[role='group'] button")[4]!.trigger("click")
    await vi.waitFor(() =>
      expect(calls.list).toHaveBeenLastCalledWith(expect.objectContaining({ statut: "abandonnee" })),
    )
    await vi.waitFor(() =>
      expect(wrapper.find(`[data-testid='outbound-notification-retry-${ABANDONED.id}']`).exists()).toBe(true),
    )

    await wrapper.get(`[data-testid='outbound-notification-retry-${ABANDONED.id}']`).trigger("click")
    await vi.waitFor(() => expect(calls.retry).toHaveBeenCalledTimes(1))

    wrapper.unmount()
    cleanup()
  })

  it("explains that nothing leaves while no email provider is configured", async () => {
    const { calls, cleanup } = registerApi()
    const wrapper = await mountSuspended(OutboundNotificationsWorkspace)

    await wrapper.get("[data-testid='outbound-notifications-dispatch']").trigger("click")
    await vi.waitFor(() => expect(calls.dispatch).toHaveBeenCalledTimes(1))
    await vi.waitFor(() => expect(wrapper.find("[role='status']").exists()).toBe(true))
    expect(wrapper.get("[role='status']").text().length).toBeGreaterThan(10)

    wrapper.unmount()
    cleanup()
  })
})

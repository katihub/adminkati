import type { DemandeAssistanceDetail, DemandeAssistanceResume, DemandesAssistancePage } from "@/types/api/assistant"
import type { Role } from "@/types/session"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { getQuery, readBody, setResponseStatus } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import OperationsPage from "@/pages/operations.vue"

const BASE = "/api/v1/assistant/administration/demandes"
const CUSTOMER_REQUESTS_ROUTE = "/operations?tab=customer-requests"
const requestId = "demande-42"
const clientId = "7b4f5d9e-0c7a-4f1f-a9ae-555555555555"

const summary: DemandeAssistanceResume = {
  id: requestId,
  reference: "AS-000042",
  statut: "nouvelle",
  question: "Livrez-vous à Bafoussam ?",
  nom: "Awa Ngono",
  telephone: "690 11 90 47",
  courriel: "awa@example.com",
  clientId,
  creeLe: "2026-09-12T08:30:00.000Z",
  reponduLe: null,
}

function detail(overrides: Partial<DemandeAssistanceDetail> = {}): DemandeAssistanceDetail {
  return {
    ...summary,
    question: "Livrez-vous à Bafoussam ? J'aimerais une livraison avant samedi.",
    reponse: null,
    reponduPar: null,
    ficheCle: null,
    conversation: {
      messages: [
        {
          rang: 2,
          auteur: "assistant",
          texte: "Je ne sais pas répondre à cette question.",
          creeLe: "2026-09-12T08:29:30.000Z",
        },
        { rang: 1, auteur: "visiteur", texte: "Livrez-vous à Bafoussam ?", creeLe: "2026-09-12T08:29:00.000Z" },
      ],
    },
    ...overrides,
  }
}

function page(overrides: Partial<DemandesAssistancePage> = {}): DemandesAssistancePage {
  return {
    elements: [summary],
    total: 1,
    page: 1,
    taille: 20,
    compteurs: { nouvelle: 3, repondue: 12, close: 7 },
    ...overrides,
  }
}

function seedSession(roles: Role[]) {
  useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
    userId: "u1",
    membreId: "m1",
    nom: "Ada",
    courriel: "ada@example.com",
    roles,
  })
}

const cleanups: (() => void)[] = []

function endpoint(path: string, options: Parameters<typeof registerEndpoint>[1]) {
  cleanups.push(registerEndpoint(path, options))
}

function serveList(list: () => DemandesAssistancePage = page, observed: Record<string, unknown>[] = []) {
  endpoint(BASE, {
    method: "GET",
    handler: event => {
      observed.push(getQuery(event))
      return list()
    },
  })
  return observed
}

function serveDetail(body: () => DemandeAssistanceDetail) {
  endpoint(`${BASE}/${requestId}`, { method: "GET", handler: () => body() })
}

async function mountAt(query = "") {
  const route = query ? `${CUSTOMER_REQUESTS_ROUTE}&${query}` : CUSTOMER_REQUESTS_ROUTE
  const wrapper = await mountSuspended(OperationsPage, { route, attachTo: document.body })
  await flushPromises()
  return wrapper
}

function body(selector: string) {
  return document.body.querySelector<HTMLElement>(`[data-testid='${selector}']`)
}

/** Opened from the keyboard, as reka allows; its content is teleported under `document.body`. */
async function openDetailMenu(wrapper: Awaited<ReturnType<typeof mountAt>>) {
  await wrapper.get("[data-testid='assistant-detail-menu-trigger']").trigger("keydown", { key: "Enter" })
  await flushPromises()
}

describe("assistant requests workspace", () => {
  afterEach(() => {
    while (cleanups.length > 0) cleanups.pop()?.()
    useNuxtApp().$queryClient.clear()
  })

  it("lists the new requests first, with every status counter from the page envelope", async () => {
    seedSession(["comptoir"])
    const observed = serveList()

    const wrapper = await mountAt()

    await vi.waitFor(() => expect(wrapper.findAll("[data-testid='assistant-list-item']")).toHaveLength(1))
    expect(observed[0]).toEqual({ statut: "nouvelle", page: "1", taille: "20" })
    expect(wrapper.get("[data-testid='assistant-status-nouvelle']").attributes("aria-pressed")).toBe("true")
    expect(wrapper.get("[data-testid='assistant-status-count-nouvelle']").text()).toBe("3")
    expect(wrapper.get("[data-testid='assistant-status-count-repondue']").text()).toBe("12")
    expect(wrapper.get("[data-testid='assistant-status-count-close']").text()).toBe("7")
    expect(wrapper.get("[data-testid='assistant-list-item']").text()).toContain("AS-000042")
    expect(wrapper.find("[data-testid='assistant-detail-empty']").exists()).toBe(true)

    wrapper.unmount()
  })

  it("switches status through the URL and starts that status from its first page", async () => {
    seedSession(["comptoir"])
    const observed = serveList(() => page({ total: 45 }))

    const wrapper = await mountAt("page=2")
    await vi.waitFor(() => expect(observed).toContainEqual({ statut: "nouvelle", page: "2", taille: "20" }))

    await wrapper.get("[data-testid='assistant-status-repondue']").trigger("click")

    await vi.waitFor(() => expect(useRoute().query).toEqual({ tab: "customer-requests", statut: "repondue" }))
    await vi.waitFor(() => expect(observed).toContainEqual({ statut: "repondue", page: "1", taille: "20" }))

    wrapper.unmount()
  })

  it("opens the request named by ?demande= with its contacts, question and ordered conversation", async () => {
    seedSession(["comptoir"])
    serveList(() => page({ elements: [] }))
    serveDetail(() => detail())

    const wrapper = await mountAt(`statut=close&demande=${requestId}`)

    await vi.waitFor(() => expect(wrapper.find("[data-testid='assistant-detail-content']").exists()).toBe(true))
    expect(wrapper.get("[data-testid='assistant-detail-reference']").text()).toBe("AS-000042")
    expect(wrapper.get("[data-testid='assistant-detail-status']").attributes("data-status")).toBe("nouvelle")
    expect(wrapper.get("[data-testid='assistant-detail-question']").text()).toContain("avant samedi")

    await wrapper.get("[data-testid='assistant-detail-contact-trigger']").trigger("click")
    await flushPromises()
    expect(body("assistant-detail-phone")?.getAttribute("href")).toBe("tel:690119047")
    expect(body("assistant-detail-email")?.getAttribute("href")).toBe("mailto:awa@example.com")
    expect(body("assistant-detail-customer-link")?.getAttribute("href")).toBe(`/users?id=${clientId}`)
    expect(
      wrapper
        .findAll("[data-testid='assistant-conversation-message']")
        .map(message => message.attributes("data-author")),
    ).toEqual(["visiteur", "assistant"])

    wrapper.unmount()
  })

  it("says the conversation expired when the backend purged it", async () => {
    seedSession(["comptoir"])
    serveList()
    serveDetail(() => detail({ conversation: null, clientId: null }))

    const wrapper = await mountAt(`demande=${requestId}`)

    await vi.waitFor(() => expect(wrapper.find("[data-testid='assistant-conversation-expired']").exists()).toBe(true))
    expect(wrapper.find("[data-testid='assistant-conversation-message']").exists()).toBe(false)

    await wrapper.get("[data-testid='assistant-detail-contact-trigger']").trigger("click")
    await flushPromises()
    expect(body("assistant-detail-customer-link")).toBeNull()

    wrapper.unmount()
  })

  it("sends a plain reply with exactly the trimmed text, and shows the answer the backend returns", async () => {
    seedSession(["comptoir"])
    serveList()
    let current = detail()
    serveDetail(() => current)
    const bodies: unknown[] = []
    endpoint(`${BASE}/${requestId}/reponse`, {
      method: "POST",
      handler: async event => {
        bodies.push(await readBody(event))
        current = detail({
          statut: "repondue",
          reponse: "Oui, sous 48 heures.",
          reponduLe: "2026-09-12T09:00:00.000Z",
          reponduPar: { id: "m1", nom: "Ada" },
        })
        return current
      },
    })

    const wrapper = await mountAt(`demande=${requestId}`)
    await vi.waitFor(() => expect(wrapper.find("[data-testid='assistant-reply-text']").exists()).toBe(true))

    expect(wrapper.get("[data-testid='assistant-reply-send']").attributes("disabled")).toBeDefined()
    await wrapper.get("[data-testid='assistant-reply-text']").setValue("  Oui, sous 48 heures.  ")
    expect(wrapper.get("[data-testid='assistant-reply-counter']").text()).toBe("24 / 4000")
    await wrapper.get("form").trigger("submit")
    await flushPromises()

    await vi.waitFor(() => expect(bodies).toEqual([{ reponse: "Oui, sous 48 heures." }]))
    await vi.waitFor(() =>
      expect(wrapper.get("[data-testid='assistant-detail-answer-text']").text()).toBe("Oui, sous 48 heures."),
    )
    expect(wrapper.get("[data-testid='assistant-detail-status']").attributes("data-status")).toBe("repondue")
    expect((wrapper.get("[data-testid='assistant-reply-text']").element as HTMLTextAreaElement).value).toBe("")

    wrapper.unmount()
  })

  it("withholds the fiche switch from comptoir, whom the backend refuses it", async () => {
    seedSession(["comptoir"])
    serveList()
    serveDetail(() => detail())

    const wrapper = await mountAt(`demande=${requestId}`)
    await vi.waitFor(() => expect(wrapper.find("[data-testid='assistant-reply-form']").exists()).toBe(true))

    expect(wrapper.find("[data-testid='assistant-reply-save-fiche']").exists()).toBe(false)

    wrapper.unmount()
  })

  it("lets direction save the reply as a fiche, off by default and titled from the question", async () => {
    seedSession(["direction"])
    serveList()
    serveDetail(() => detail())
    const bodies: unknown[] = []
    endpoint(`${BASE}/${requestId}/reponse`, {
      method: "POST",
      handler: async event => {
        bodies.push(await readBody(event))
        return detail({ statut: "repondue", reponse: "Oui, sous 48 heures.", ficheCle: "livraison-bafoussam" })
      },
    })

    const wrapper = await mountAt(`demande=${requestId}`)
    await vi.waitFor(() => expect(wrapper.find("[data-testid='assistant-reply-save-fiche']").exists()).toBe(true))

    const toggle = wrapper.get("[data-testid='assistant-reply-save-fiche']")
    expect(toggle.attributes("aria-pressed")).toBe("false")
    expect(wrapper.find("[data-testid='assistant-reply-fiche-title']").exists()).toBe(false)

    await toggle.trigger("click")
    await flushPromises()

    const title = wrapper.get("[data-testid='assistant-reply-fiche-title']")
    expect((title.element as HTMLInputElement).value).toBe(
      "Livrez-vous à Bafoussam ? J'aimerais une livraison avant samedi.",
    )
    await title.setValue("Livraison à Bafoussam")
    await wrapper.get("[data-testid='assistant-reply-fiche-domain']").setValue("livraison")
    await wrapper.get("[data-testid='assistant-reply-text']").setValue("Oui, sous 48 heures.")
    await wrapper.get("form").trigger("submit")
    await flushPromises()

    await vi.waitFor(() =>
      expect(bodies).toEqual([
        {
          reponse: "Oui, sous 48 heures.",
          enregistrerCommeFiche: true,
          fiche: { titre: "Livraison à Bafoussam", domaine: "livraison" },
        },
      ]),
    )

    wrapper.unmount()
  })

  it("offers a WhatsApp link from the header menu, pre-filled with the sent answer", async () => {
    seedSession(["comptoir"])
    serveList()
    serveDetail(() => detail({ statut: "repondue", reponse: "Oui, sous 48 heures." }))

    const wrapper = await mountAt(`demande=${requestId}`)
    await vi.waitFor(() => expect(wrapper.find("[data-testid='assistant-detail-menu-trigger']").exists()).toBe(true))
    await openDetailMenu(wrapper)

    const link = body("assistant-detail-menu-whatsapp")
    expect(link?.tagName).toBe("A")
    expect(link?.getAttribute("href")).toBe("https://wa.me/237690119047?text=Oui%2C%20sous%2048%20heures.")
    expect(link?.getAttribute("target")).toBe("_blank")
    expect(link?.getAttribute("rel")).toContain("noopener")

    wrapper.unmount()
  })

  it("leaves WhatsApp out of the header menu when the visitor left no usable phone number", async () => {
    seedSession(["comptoir"])
    serveList()
    serveDetail(() => detail({ telephone: null }))

    const wrapper = await mountAt(`demande=${requestId}`)
    await vi.waitFor(() => expect(wrapper.find("[data-testid='assistant-detail-menu-trigger']").exists()).toBe(true))
    await openDetailMenu(wrapper)

    expect(body("assistant-detail-menu-whatsapp")).toBeNull()

    wrapper.unmount()
  })

  it("shows the backend's sentence on a 409 and refreshes the request to its closed state", async () => {
    seedSession(["comptoir"])
    serveList()
    let current = detail()
    serveDetail(() => current)
    endpoint(`${BASE}/${requestId}/reponse`, {
      method: "POST",
      handler: event => {
        current = detail({ statut: "close" })
        setResponseStatus(event, 409)
        return { message: "Cette demande est close, elle ne peut plus recevoir de réponse." }
      },
    })

    const wrapper = await mountAt(`demande=${requestId}`)
    await vi.waitFor(() => expect(wrapper.find("[data-testid='assistant-reply-text']").exists()).toBe(true))

    await wrapper.get("[data-testid='assistant-reply-text']").setValue("Oui, sous 48 heures.")
    await wrapper.get("form").trigger("submit")
    await flushPromises()

    await vi.waitFor(() =>
      expect(wrapper.get("[data-testid='assistant-action-error']").text()).toBe(
        "Cette demande est close, elle ne peut plus recevoir de réponse.",
      ),
    )
    await vi.waitFor(() => expect(wrapper.find("[data-testid='assistant-closed-notice']").exists()).toBe(true))
    expect(wrapper.find("[data-testid='assistant-reply-form']").exists()).toBe(false)

    await openDetailMenu(wrapper)
    expect(body("assistant-detail-menu-close")).toBeNull()

    wrapper.unmount()
  })

  it("closes a request only after confirmation", async () => {
    seedSession(["comptoir"])
    serveList()
    let current = detail()
    serveDetail(() => current)
    let closeCalls = 0
    endpoint(`${BASE}/${requestId}/cloture`, {
      method: "POST",
      handler: () => {
        closeCalls += 1
        current = detail({ statut: "close" })
        return current
      },
    })

    const wrapper = await mountAt(`demande=${requestId}`)
    await vi.waitFor(() => expect(wrapper.find("[data-testid='assistant-detail-menu-trigger']").exists()).toBe(true))

    await openDetailMenu(wrapper)
    body("assistant-detail-menu-close")?.click()
    await flushPromises()
    expect(closeCalls).toBe(0)

    body("assistant-close-confirm")?.click()
    await flushPromises()

    await vi.waitFor(() => expect(closeCalls).toBe(1))
    await vi.waitFor(() =>
      expect(wrapper.get("[data-testid='assistant-detail-status']").attributes("data-status")).toBe("close"),
    )
    expect(wrapper.find("[data-testid='assistant-closed-notice']").exists()).toBe(true)

    wrapper.unmount()
  })
})

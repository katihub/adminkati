import type { KatiExpressCourier } from "@/composables/useKatiExpress"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import KatiExpressWorkspace from "@/components/operations/KatiExpressWorkspace.vue"

/** REGISTERING A KATI COURIER FROM KATI EXPRESS (9 November 2026). */
const courier: KatiExpressCourier = {
  id: "a2",
  nom: "Jean Mbarga",
  telephone: "699112233",
  verifie: false,
  aVerifier: true,
  plafondEspecesFcfa: null,
  missionsEnCours: 0,
  aEncaisserFcfa: 0,
  especesNonRemisesFcfa: 0,
  villes: [],
  villeResidence: "Douala",
  quartierResidence: "Bépanda",
  parrainNom: "Paul",
  parrainLien: "Oncle",
  parrainTelephone: "677000000",
  villeLivraison: "Douala",
  quartiersLivraison: ["Akwa", "Bonapriso"],
  immatriculation: "LT 123 AB",
}
const LOCALITIES = [
  {
    ville: "Douala",
    quartiers: [
      { id: "q1", nom: "Akwa" },
      { id: "q2", nom: "Bonapriso" },
      { id: "q3", nom: "Bépanda" },
    ],
  },
]

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach(cleanup => cleanup())
  cleanups = []
  useNuxtApp().$queryClient.clear()
  document.body.innerHTML = ""
})

function signIn(roles: string[]) {
  useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
    type: "equipe",
    userId: "u1",
    membreId: "m1",
    nom: "Paul",
    courriel: "p@k.cm",
    roles,
  })
}

function fill(testid: string, value: string) {
  const element = document.querySelector<HTMLElement>(`[data-testid='${testid}']`)
  const field =
    element instanceof HTMLSelectElement || element instanceof HTMLInputElement
      ? element
      : element?.querySelector<HTMLInputElement | HTMLSelectElement>("select, input")
  if (!field) throw new Error(`missing ${testid}`)
  field.value = value
  field.dispatchEvent(new Event(field instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }))
}

describe("Kati Express couriers", () => {
  it("shows a focal point its couriers only, without the dispatch board", async () => {
    let boardCalls = 0
    cleanups = [
      registerEndpoint("/api/v1/marketplace/kati-express/expeditions", {
        method: "GET",
        handler: () => {
          boardCalls++
          return {}
        },
      }),
      registerEndpoint("/api/v1/marketplace/kati-express/livreurs", { method: "GET", handler: () => [courier] }),
    ]
    signIn(["point_focal"])
    const wrapper = await mountSuspended(KatiExpressWorkspace)
    await flushPromises()
    await vi.waitFor(() => expect(wrapper.find("[data-testid='courier-to-check']").exists()).toBe(true))
    expect(wrapper.find("[data-testid='kati-express-list']").exists()).toBe(false)
    expect(wrapper.text()).toContain("Bépanda, Douala")
    expect(wrapper.text()).toContain("Paul · Oncle · 677000000")
    expect(wrapper.text()).toContain("Vehicle LT 123 AB")
    expect(boardCalls).toBe(0)
    wrapper.unmount()
  })

  it("registers a courier without a sponsor, with the chosen delivery neighbourhoods", async () => {
    const bodies: unknown[] = []
    cleanups = [
      registerEndpoint("/api/v1/marketplace/kati-express/livreurs", {
        method: "GET",
        handler: () => [],
      }),
      registerEndpoint("/api/v1/marketplace/localites", { method: "GET", handler: () => LOCALITIES }),
      registerEndpoint("/api/v1/marketplace/kati-express/livreurs", {
        method: "POST",
        handler: async event => {
          bodies.push(await readBody(event))
          return { id: "a3", nom: "Jean Mbarga", aVerifier: true, invitationEnvoyee: true }
        },
      }),
    ]
    signIn(["point_focal"])
    const wrapper = await mountSuspended(KatiExpressWorkspace, { attachTo: document.body })
    await flushPromises()
    await wrapper.get("[data-testid='kati-express-register-courier']").trigger("click")
    await vi.waitFor(() => expect(document.querySelector("[data-testid='courier-form']")).not.toBeNull())

    document.querySelector<HTMLButtonElement>("[data-testid='courier-submit']")!.click()
    await vi.waitFor(() =>
      expect(document.querySelector("[data-testid='courier-form-error']")?.textContent).toContain("full name"),
    )

    fill("courier-name", "Jean Mbarga")
    fill("courier-birth-date", "1998-04-12")
    fill("courier-birth-place", "Bafoussam")
    fill("courier-email", "Jean.Mbarga@test.cm")
    fill("courier-phone", "699112233")
    fill("courier-plate", "lt 123 ab")
    await vi.waitFor(() =>
      expect(
        document.querySelector(
          "[data-testid='courier-residence-city'] option[value='Douala'], select[data-testid='courier-residence-city'] option[value='Douala']",
        ),
      ).not.toBeNull(),
    )
    fill("courier-residence-city", "Douala")
    await flushPromises()
    fill("courier-residence-district", "Bépanda")
    await flushPromises()
    await vi.waitFor(() => expect(document.querySelector("[data-testid='courier-district-Akwa']")).not.toBeNull())
    document.querySelector<HTMLInputElement>("[data-testid='courier-district-Akwa']")!.click()
    await flushPromises()
    document.querySelector<HTMLButtonElement>("[data-testid='courier-submit']")!.click()

    await vi.waitFor(() => expect(bodies).toHaveLength(1))
    expect(bodies[0]).toEqual({
      nom: "Jean Mbarga",
      dateNaissance: "1998-04-12",
      lieuNaissance: "Bafoussam",
      villeResidence: "Douala",
      quartierResidence: "Bépanda",
      courriel: "jean.mbarga@test.cm",
      telephone: "699112233",
      villeLivraison: "Douala",
      quartiersLivraison: ["Akwa"],
      immatriculation: "LT 123 AB",
    })
    wrapper.unmount()
  })
})

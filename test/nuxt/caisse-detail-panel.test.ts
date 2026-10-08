import type { CaisseDetail } from "@/types/api/caisse"
import type { TeamDirectoryPage } from "@/types/api/equipe"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import CaisseDetailPanel from "@/components/caisse/DetailPanel.vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

const ROSTER: TeamDirectoryPage = {
  total: 3,
  page: 1,
  taille: 200,
  pages: 1,
  elements: [
    {
      id: "membre-porteur",
      courriel: "awa@example.com",
      nom: "Awa Ngo",
      telephone: null,
      roles: ["livreur"],
      comptoirs: [],
      actif: true,
      creeLe: "2026-01-01T00:00:00.000Z",
      invitLe: null,
      premiereConnexionLe: null,
      desactiveLe: null,
    },
    {
      id: "membre-compteur",
      courriel: "paul@example.com",
      nom: "Paul Eto",
      telephone: null,
      roles: ["comptoir"],
      comptoirs: [],
      actif: true,
      creeLe: "2026-01-01T00:00:00.000Z",
      invitLe: null,
      premiereConnexionLe: null,
      desactiveLe: null,
    },
    {
      id: "membre-validateur",
      courriel: "marie@example.com",
      nom: "Marie Biya",
      telephone: null,
      roles: ["direction"],
      comptoirs: [],
      actif: true,
      creeLe: "2026-01-01T00:00:00.000Z",
      invitLe: null,
      premiereConnexionLe: null,
      desactiveLe: null,
    },
  ],
}

function seedRoster() {
  useNuxtApp().$queryClient.setQueryData(apiQueryKeys.team.list({ taille: 200 }), { pages: [ROSTER], pageParams: [1] })
}

function seedSession(membreId: string) {
  useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
    userId: "u1",
    membreId,
    nom: "Session Member",
    courriel: "session@example.com",
    roles: ["direction"],
  })
}

function makeCaisse(overrides: Partial<CaisseDetail> = {}): CaisseDetail {
  return {
    id: "caisse-1",
    porteurId: "membre-porteur",
    journee: "2026-09-08T00:00:00.000Z",
    statut: "ouverte",
    montantAttendu: 15_000,
    montantCompte: null,
    ecart: null,
    compteePar: null,
    compteeLe: null,
    valideePar: null,
    valideeLe: null,
    note: null,
    creeLe: "2026-09-08T08:00:00.000Z",
    ecarts: [],
    encaissements: [],
    ...overrides,
  }
}

describe("caisse detail panel", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("shows the resolved porteur name and a placeholder for the not-yet-counted amount", async () => {
    seedRoster()
    const wrapper = await mountSuspended(CaisseDetailPanel, { props: { caisse: makeCaisse() } })
    await flushPromises()

    expect(wrapper.get("[data-testid='caisse-detail-porteur']").text()).toBe("Awa Ngo")
    expect(wrapper.get("[data-testid='caisse-detail-counted']").text()).not.toMatch(/\d/)

    wrapper.unmount()
  })

  it("shows the counted amount and resolved counter name once counted", async () => {
    seedRoster()
    const caisse = makeCaisse({
      statut: "comptee",
      montantCompte: 15_000,
      ecart: 0,
      compteePar: "membre-compteur",
      compteeLe: "2026-09-08T20:00:00.000Z",
    })
    const wrapper = await mountSuspended(CaisseDetailPanel, { props: { caisse } })
    await flushPromises()

    expect(wrapper.get("[data-testid='caisse-detail-counted']").text()).toContain("15,000")
    expect(wrapper.get("[data-testid='caisse-detail-counted-by']").text()).toBe("Paul Eto")

    wrapper.unmount()
  })

  it("shows the resolved validator name once validated", async () => {
    seedRoster()
    const caisse = makeCaisse({
      statut: "validee",
      montantCompte: 15_000,
      ecart: 0,
      compteePar: "membre-compteur",
      valideePar: "membre-validateur",
    })
    const wrapper = await mountSuspended(CaisseDetailPanel, { props: { caisse } })
    await flushPromises()

    expect(wrapper.get("[data-testid='caisse-detail-validated-by']").text()).toBe("Marie Biya")

    wrapper.unmount()
  })

  it("renders each encaissement with the collector's resolved name and a link to its order", async () => {
    seedRoster()
    const caisse = makeCaisse({
      encaissements: [
        {
          id: "e1",
          commandeId: "cmd-1",
          montant: 15_000,
          moyen: "especes",
          lieu: "porte",
          encaissePar: "membre-porteur",
          remiseCaisseId: "caisse-1",
          note: null,
          creeLe: "2026-09-08T10:00:00.000Z",
          commande: { reference: "NT-000042" },
        },
      ],
    })
    const wrapper = await mountSuspended(CaisseDetailPanel, { props: { caisse } })
    await flushPromises()

    const row = wrapper.get("[data-testid='caisse-encaissement-row']")
    expect(row.text()).toContain("Awa Ngo")
    const link = wrapper.get("[data-testid='caisse-encaissement-order-link']")
    expect(link.attributes("href")).toContain("order=NT-000042")
    expect(link.text()).toContain("NT-000042")

    wrapper.unmount()
  })

  it("shows an empty state when there are no encaissements", async () => {
    seedRoster()
    const wrapper = await mountSuspended(CaisseDetailPanel, { props: { caisse: makeCaisse() } })
    await flushPromises()

    expect(wrapper.find("[data-testid='caisse-encaissements-empty']").exists()).toBe(true)

    wrapper.unmount()
  })

  it("renders a named discrepancy with the arbiter's resolved name", async () => {
    seedRoster()
    const caisse = makeCaisse({
      statut: "litige",
      montantCompte: 14_500,
      ecart: -500,
      compteePar: "membre-compteur",
      ecarts: [
        {
          id: "ec1",
          remiseCaisseId: "caisse-1",
          montant: -500,
          motif: "erreur_rendu_monnaie",
          commentaire: "Rendu excessif",
          arbitrePar: "membre-validateur",
          creeLe: "2026-09-08T20:10:00.000Z",
        },
      ],
    })
    const wrapper = await mountSuspended(CaisseDetailPanel, { props: { caisse } })
    await flushPromises()

    const row = wrapper.get("[data-testid='caisse-ecart-row']")
    expect(row.text()).toContain("Marie Biya")
    expect(row.text()).toContain("Rendu excessif")

    wrapper.unmount()
  })

  it("distinguishes a litige with no named discrepancy yet from a caisse with none by definition", async () => {
    seedRoster()

    const litige = makeCaisse({
      statut: "litige",
      montantCompte: 14_500,
      ecart: -500,
      compteePar: "membre-compteur",
      ecarts: [],
    })
    const litigeWrapper = await mountSuspended(CaisseDetailPanel, { props: { caisse: litige } })
    await flushPromises()
    expect(litigeWrapper.find("[data-testid='caisse-ecarts-needed']").exists()).toBe(true)
    litigeWrapper.unmount()

    const validee = makeCaisse({
      statut: "validee",
      montantCompte: 15_000,
      ecart: 0,
      compteePar: "membre-compteur",
      valideePar: "membre-validateur",
      ecarts: [],
    })
    const valideeWrapper = await mountSuspended(CaisseDetailPanel, { props: { caisse: validee } })
    await flushPromises()
    expect(valideeWrapper.find("[data-testid='caisse-ecarts-needed']").exists()).toBe(false)
    valideeWrapper.unmount()
  })

  it("offers the count action for ouverte and litige caisses, but not comptee or validee", async () => {
    seedRoster()
    seedSession("membre-validateur")

    for (const statut of ["ouverte", "litige"] as const) {
      const wrapper = await mountSuspended(CaisseDetailPanel, {
        props: { caisse: makeCaisse({ statut, compteePar: statut === "litige" ? "membre-compteur" : null }) },
      })
      await flushPromises()
      expect(wrapper.find("[data-testid='caisse-count-dialog-trigger']").exists()).toBe(true)
      wrapper.unmount()
    }

    for (const statut of ["comptee", "validee"] as const) {
      const wrapper = await mountSuspended(CaisseDetailPanel, {
        props: { caisse: makeCaisse({ statut, compteePar: "membre-compteur", montantCompte: 15_000, ecart: 0 }) },
      })
      await flushPromises()
      expect(wrapper.find("[data-testid='caisse-count-dialog-trigger']").exists()).toBe(false)
      wrapper.unmount()
    }
  })

  it("disables the count action for the caisse's own porteur, with the duty reason", async () => {
    seedRoster()
    seedSession("membre-porteur")

    const wrapper = await mountSuspended(CaisseDetailPanel, { props: { caisse: makeCaisse({ statut: "ouverte" }) } })
    await flushPromises()

    const trigger = wrapper.get("[data-testid='caisse-count-dialog-trigger']")
    expect(trigger.attributes("disabled")).toBeDefined()
    expect(trigger.attributes("title")).toBe("You opened this caisse — someone else must count it")

    wrapper.unmount()
  })

  it("enables the count action for anyone other than the porteur", async () => {
    seedRoster()
    seedSession("membre-compteur")

    const wrapper = await mountSuspended(CaisseDetailPanel, { props: { caisse: makeCaisse({ statut: "ouverte" }) } })
    await flushPromises()

    expect(wrapper.get("[data-testid='caisse-count-dialog-trigger']").attributes("disabled")).toBeUndefined()

    wrapper.unmount()
  })

  it("offers the validate action for comptee and litige caisses, but not ouverte or validee", async () => {
    seedRoster()
    seedSession("membre-validateur")

    for (const statut of ["comptee", "litige"] as const) {
      const wrapper = await mountSuspended(CaisseDetailPanel, {
        props: {
          caisse: makeCaisse({
            statut,
            montantCompte: 14_500,
            ecart: statut === "litige" ? -500 : 0,
            compteePar: "membre-compteur",
            ecarts:
              statut === "litige"
                ? [
                    {
                      id: "ec1",
                      remiseCaisseId: "caisse-1",
                      montant: 500,
                      motif: "erreur_saisie",
                      commentaire: null,
                      arbitrePar: "membre-validateur",
                      creeLe: "2026-09-08T20:10:00.000Z",
                    },
                  ]
                : [],
          }),
        },
      })
      await flushPromises()
      expect(wrapper.find("[data-testid='caisse-validate-dialog-trigger']").exists()).toBe(true)
      wrapper.unmount()
    }

    for (const statut of ["ouverte", "validee"] as const) {
      const wrapper = await mountSuspended(CaisseDetailPanel, {
        props: {
          caisse: makeCaisse({
            statut,
            compteePar: statut === "validee" ? "membre-compteur" : null,
            valideePar: statut === "validee" ? "membre-validateur" : null,
          }),
        },
      })
      await flushPromises()
      expect(wrapper.find("[data-testid='caisse-validate-dialog-trigger']").exists()).toBe(false)
      wrapper.unmount()
    }
  })

  it("disables validate with the missing-discrepancy reason for a litige with no named ecarts", async () => {
    seedRoster()
    seedSession("membre-validateur")

    const wrapper = await mountSuspended(CaisseDetailPanel, {
      props: {
        caisse: makeCaisse({
          statut: "litige",
          montantCompte: 14_500,
          ecart: -500,
          compteePar: "membre-compteur",
          ecarts: [],
        }),
      },
    })
    await flushPromises()

    const trigger = wrapper.get("[data-testid='caisse-validate-dialog-trigger']")
    expect(trigger.attributes("disabled")).toBeDefined()
    expect(trigger.attributes("title")).toBe("Name the discrepancy before validating")

    wrapper.unmount()
  })

  /**
   * DEUX PAIRES D'YEUX, PAS TROIS. Seul celui qui a rapporté l'argent ne peut
   * pas arrêter la caisse. Exiger un troisième arbitre laissait la caisse du
   * soir ouverte dans un comptoir tenu par une seule personne — et une caisse
   * qu'on ne peut pas fermer est pire que ce que l'arbitre protégeait.
   */
  it("disables validate for the porteur alone, and lets whoever counted close the day", async () => {
    seedRoster()
    const caisse = makeCaisse({ statut: "comptee", montantCompte: 15_000, ecart: 0, compteePar: "membre-compteur" })

    seedSession("membre-porteur")
    const porteurWrapper = await mountSuspended(CaisseDetailPanel, { props: { caisse } })
    await flushPromises()
    expect(porteurWrapper.get("[data-testid='caisse-validate-dialog-trigger']").attributes("title")).toBe(
      "You opened this caisse — someone else must validate it",
    )
    porteurWrapper.unmount()

    seedSession("membre-compteur")
    const compteurWrapper = await mountSuspended(CaisseDetailPanel, { props: { caisse } })
    await flushPromises()
    expect(compteurWrapper.get("[data-testid='caisse-validate-dialog-trigger']").attributes("title")).toBeUndefined()
    expect(compteurWrapper.get("[data-testid='caisse-validate-dialog-trigger']").attributes("disabled")).toBeUndefined()
    compteurWrapper.unmount()
  })
})

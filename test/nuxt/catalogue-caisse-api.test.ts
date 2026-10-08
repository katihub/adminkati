import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { getQuery, readBody } from "h3"
import { describe, expect, it } from "vitest"
import { defineComponent, h } from "vue"
import { useCaisse, useCaisseEncours, useCaisseMutations, useCaisses } from "@/composables/useCaisse"
import { useCatalogue, useCatalogueMutations, useCatalogueProposal } from "@/composables/useCatalogue"
import { apiQueryKeys } from "@/utils/api-query-keys"

const caisseListItem = {
  id: "caisse-42",
  porteurId: "member-7",
  journee: "2026-09-02",
  statut: "ouverte" as const,
  montantAttendu: 125_000,
  montantCompte: null,
  ecart: null,
  compteePar: null,
  compteeLe: null,
  valideePar: null,
  valideeLe: null,
  note: null,
  creeLe: "2026-09-02T08:00:00.000Z",
  ecarts: [],
  _count: { encaissements: 0 },
}
const caisseDetail = { ...caisseListItem, encaissements: [] }
const caisseCountResult = {
  id: "caisse-42",
  porteurId: "member-7",
  journee: "2026-09-02",
  statut: "comptee" as const,
  montantAttendu: 125_000,
  montantCompte: 125_000,
  ecart: 0,
  compteePar: "member-8",
  compteeLe: "2026-09-02T18:00:00.000Z",
  valideePar: null,
  valideeLe: null,
  note: null,
  creeLe: "2026-09-02T08:00:00.000Z",
}
const caisseValidationResult = {
  ...caisseCountResult,
  statut: "validee" as const,
  valideePar: "member-9",
  valideeLe: "2026-09-02T19:00:00.000Z",
}
const ingestionState = {
  genereLe: "2026-09-02T06:00:00.000Z",
  ingereLe: "2026-09-02T06:05:00.000Z",
  nombreProduits: 240,
  nombreCategories: 18,
  devise: "XAF",
  prixNuls: 2,
  ruptures: 14,
}
const proposal = {
  id: 9,
  lot_id: 7,
  type: "modification",
  produit_id: 42,
  slug: "telephone-test",
  nom: "Telephone test",
  champs: { prix: { avant: 100_000, apres: 125_000 } },
  statut: "en_attente",
  detectee_le: "2026-09-02T06:10:00.000Z",
  decidee_le: null,
  decidee_par: null,
  motif: null,
}

describe("catalogue and caisse API integration", () => {
  it("fetches ingestion state and paginated proposals", async () => {
    let observedQuery: Record<string, unknown> | undefined
    const stateCleanup = registerEndpoint("/api/v1/catalogue/etat", {
      method: "GET",
      handler: () => ingestionState,
    })
    const proposalCleanup = registerEndpoint("/api/v1/catalogue/administration/propositions", {
      method: "GET",
      handler: event => {
        observedQuery = getQuery(event)
        return { total: 1, page: 2, taille: 25, propositions: [proposal] }
      },
    })
    let catalogue: ReturnType<typeof useCatalogue> | undefined
    const Probe = defineComponent({
      setup() {
        catalogue = useCatalogue({ page: 2, taille: 25, statut: "en_attente" })
        return () => h("div")
      },
    })

    const wrapper = await mountSuspended(Probe)
    await flushPromises()

    expect(observedQuery).toEqual({ page: "2", taille: "25", statut: "en_attente" })
    expect(catalogue?.state.data.value).toEqual(ingestionState)
    expect(catalogue?.proposals.data.value?.total).toBe(1)

    stateCleanup()
    proposalCleanup()
    wrapper.unmount()
  })

  it("fetches a proposal directly by id for stable deep links", async () => {
    const cleanup = registerEndpoint("/api/v1/catalogue/administration/propositions/9", {
      method: "GET",
      handler: () => proposal,
    })
    let detail: ReturnType<typeof useCatalogueProposal> | undefined
    const Probe = defineComponent({
      setup() {
        detail = useCatalogueProposal(9)
        return () => h("div")
      },
    })

    const wrapper = await mountSuspended(Probe)
    await flushPromises()

    expect(detail?.data.value?.id).toBe(9)
    expect(detail?.data.value?.champs.prix).toEqual({ avant: 100_000, apres: 125_000 })

    cleanup()
    wrapper.unmount()
  })

  it("sends proposal decisions and invalidates catalogue and product data only after success", async () => {
    const queryClient = useNuxtApp().$queryClient
    queryClient.setQueryData(apiQueryKeys.catalogue.proposals({ page: 1 }), { total: 1 })
    queryClient.setQueryData(apiQueryKeys.products.all, { total: 1 })
    const observed: unknown[] = []
    const acceptCleanup = registerEndpoint("/api/v1/catalogue/administration/propositions/9/accepter", {
      method: "POST",
      handler: () => {
        observed.push("accept")
        return { id: 9, statut: "acceptee", produitId: 42 }
      },
    })
    const refuseCleanup = registerEndpoint("/api/v1/catalogue/administration/propositions/10/refuser", {
      method: "POST",
      handler: async event => {
        observed.push(await readBody(event))
        return { id: 10, statut: "refusee" }
      },
    })
    let mutations: ReturnType<typeof useCatalogueMutations> | undefined
    const Probe = defineComponent({
      async setup() {
        mutations = useCatalogueMutations()
        await mutations.accept.mutateAsync(9)
        await mutations.refuse.mutateAsync({ id: 10, input: { motif: "Pas conforme" } })
        return () => h("div")
      },
    })

    const wrapper = await mountSuspended(Probe)
    await flushPromises()

    expect(observed).toEqual(["accept", { motif: "Pas conforme" }])
    expect(mutations?.refuse.data.value).toEqual({ id: 10, statut: "refusee" })
    expect(queryClient.getQueryState(apiQueryKeys.catalogue.proposals({ page: 1 }))?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(apiQueryKeys.products.all)?.isInvalidated).toBe(true)

    acceptCleanup()
    refuseCleanup()
    wrapper.unmount()
    queryClient.clear()
  })

  it("reads caisse surfaces and sends reconciliation commands", async () => {
    const listCleanup = registerEndpoint("/api/v1/caisses", { method: "GET", handler: () => [caisseListItem] })
    const balanceCleanup = registerEndpoint("/api/v1/caisses/encours", {
      method: "GET",
      handler: () => [{ porteurId: "member-7", _sum: { montantAttendu: 125_000 } }],
    })
    const detailCleanup = registerEndpoint("/api/v1/caisses/caisse-42", { method: "GET", handler: () => caisseDetail })
    const commands: unknown[] = []
    const countCleanup = registerEndpoint("/api/v1/caisses/caisse-42/compter", {
      method: "POST",
      handler: async event => {
        commands.push(await readBody(event))
        return caisseCountResult
      },
    })
    const discrepancyCleanup = registerEndpoint("/api/v1/caisses/caisse-42/ecart", {
      method: "POST",
      handler: async event => {
        commands.push(await readBody(event))
        return { id: "ecart-1" }
      },
    })
    const validateCleanup = registerEndpoint("/api/v1/caisses/caisse-42/valider", {
      method: "POST",
      handler: () => {
        commands.push("validate")
        return caisseValidationResult
      },
    })
    let result: ReturnType<typeof useCaisse> | undefined
    let list: ReturnType<typeof useCaisses> | undefined
    let balance: ReturnType<typeof useCaisseEncours> | undefined
    let mutations: ReturnType<typeof useCaisseMutations> | undefined
    const Probe = defineComponent({
      async setup() {
        result = useCaisse("caisse-42")
        list = useCaisses()
        balance = useCaisseEncours()
        mutations = useCaisseMutations()
        await mutations.count.mutateAsync({ id: "caisse-42", input: { montantCompte: 125_000 } })
        await mutations.nameDiscrepancy.mutateAsync({
          id: "caisse-42",
          input: { montant: 1_000, motif: "non_explique" },
        })
        await mutations.validate.mutateAsync("caisse-42")
        return () => h("div")
      },
    })
    const wrapper = await mountSuspended(Probe)
    await flushPromises()

    expect(result?.data.value).toEqual(caisseDetail)
    expect(list?.data.value).toEqual([caisseListItem])
    expect(balance?.data.value).toEqual([{ porteurId: "member-7", _sum: { montantAttendu: 125_000 } }])
    expect(commands).toEqual([{ montantCompte: 125_000 }, { montant: 1_000, motif: "non_explique" }, "validate"])

    listCleanup()
    balanceCleanup()
    detailCleanup()
    countCleanup()
    discrepancyCleanup()
    validateCleanup()
    wrapper.unmount()
  })
})

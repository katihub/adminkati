import type { CatalogueProposal } from "@/types/api/catalogue"
import type { H3Event } from "h3"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { createError, getQuery, readBody } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import ContentPage from "@/pages/content.vue"

const proposal: CatalogueProposal = {
  id: 9,
  lot_id: 7,
  type: "modification" as const,
  produit_id: 42,
  slug: "telephone-test",
  nom: "Telephone test",
  champs: { prix: { avant: 100_000, apres: 125_000 } },
  statut: "en_attente" as const,
  detectee_le: "2026-09-02T06:10:00.000Z",
  decidee_le: null,
  decidee_par: null,
  motif: null,
}

const taxonomy = {
  rayons: [],
  categories: [
    {
      id: 17,
      nom: "Computers",
      slug: "computers",
      parent_id: null,
      niveau: 1,
      rayon: null,
      compte_total: 1,
      masquee: false,
    },
  ],
  marques: [],
}

function seedSession(roles: string[]) {
  useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
    userId: "u1",
    membreId: "m1",
    nom: "Admin",
    courriel: "admin@example.com",
    roles,
  })
}

function proposalList(proposals: CatalogueProposal[] = [proposal]) {
  return { total: proposals.length, page: 1, taille: 50, propositions: proposals }
}

function registerProposalEndpoints(
  list: typeof proposalList,
  detail: CatalogueProposal,
  observedQueries: Record<string, unknown>[],
  observedBodies: unknown[],
) {
  const listCleanup = registerEndpoint("/api/v1/catalogue/administration/propositions", {
    method: "GET",
    handler: event => {
      observedQueries.push(getQuery(event))
      return list()
    },
  })
  const detailCleanup = registerEndpoint(`/api/v1/catalogue/administration/propositions/${detail.id}`, {
    method: "GET",
    handler: () => detail,
  })
  const taxonomyCleanup = registerEndpoint("/api/v1/catalogue/administration/taxonomie", {
    method: "GET",
    handler: () => taxonomy,
  })
  const acceptCleanup = registerEndpoint(`/api/v1/catalogue/administration/propositions/${detail.id}/accepter`, {
    method: "POST",
    handler: () => ({ id: detail.id, statut: "acceptee", produitId: detail.produit_id }),
  })
  const refuseCleanup = registerEndpoint(`/api/v1/catalogue/administration/propositions/${detail.id}/refuser`, {
    method: "POST",
    handler: async (event: H3Event) => {
      observedBodies.push(await readBody(event))
      return { id: detail.id, statut: "refusee" }
    },
  })

  return () => {
    listCleanup()
    detailCleanup()
    taxonomyCleanup()
    acceptCleanup()
    refuseCleanup()
  }
}

describe("content propositions workspace", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("renders the first available proposal and writes its selection into the URL", async () => {
    seedSession(["direction"])
    const observedQueries: Record<string, unknown>[] = []
    const cleanup = registerProposalEndpoints(proposalList, proposal, observedQueries, [])

    const wrapper = await mountSuspended(ContentPage, {
      route: "/content?tab=propositions",
      attachTo: document.body,
    })
    await flushPromises()

    expect(document.body.querySelector("[data-testid='proposal-workspace']")).not.toBeNull()
    expect(document.body.querySelector("[data-testid='proposal-detail-name']")?.textContent).toContain("Telephone test")
    const detailHeader = document.body.querySelector("[data-testid='proposal-detail-header']")
    const acceptTrigger = document.body.querySelector("[data-testid='proposal-accept-trigger']")
    expect(detailHeader?.contains(acceptTrigger)).toBe(true)
    expect(document.body.querySelector("[data-testid='proposal-detail-scroll']")).not.toBeNull()
    await vi.waitFor(() => expect(useRoute().query.proposal).toBe("9"))
    expect(observedQueries[0]).toEqual({ statut: "toutes", page: "1", taille: "50" })

    cleanup()
    wrapper.unmount()
  })

  it("renders proposals when a changed field has no before or after value", async () => {
    seedSession(["comptoir"])
    const nullableProposal = {
      ...proposal,
      champs: {
        slug: null,
        images: { avant: null, apres: ["https://example.com/image.jpg"] },
      },
    }
    const cleanup = registerProposalEndpoints(() => proposalList([nullableProposal]), nullableProposal, [], [])

    const wrapper = await mountSuspended(ContentPage, {
      route: `/content?tab=propositions&proposal=${nullableProposal.id}`,
      attachTo: document.body,
    })
    await flushPromises()

    expect(document.body.querySelectorAll("[data-testid='proposal-change-row']")).toHaveLength(2)
    expect(document.body.querySelector("[data-testid='proposal-changes-table']")?.textContent).toContain("Slug")
    expect(document.body.querySelector("[data-testid='proposal-changes-table']")?.textContent).toContain("Images")

    cleanup()
    wrapper.unmount()
  })

  it("keeps the selected history page and sends its status to the backend", async () => {
    seedSession(["comptoir"])
    const observedQueries: Record<string, unknown>[] = []
    const historical = { ...proposal, type: "disparition" as const, statut: "refusee" as const, motif: "Pas conforme" }
    const cleanup = registerProposalEndpoints(
      () => ({ total: 1, page: 2, taille: 25, propositions: [historical] }),
      historical,
      observedQueries,
      [],
    )

    const wrapper = await mountSuspended(ContentPage, {
      route: `/content?tab=propositions&proposal=${historical.id}&proposalStatus=refusee&proposalPage=2`,
      attachTo: document.body,
    })
    await flushPromises()

    expect(document.body.querySelector("[data-testid='proposal-detail-status']")?.textContent).toContain("Refused")
    expect(document.body.querySelector("[data-testid='proposal-detail-type']")?.getAttribute("data-variant")).toBe(
      "destructive",
    )
    expect(document.body.querySelector("[data-testid='proposal-detail-status']")?.getAttribute("data-variant")).toBe(
      "warning",
    )
    expect(observedQueries[0]).toEqual({ statut: "refusee", page: "2", taille: "50" })
    expect(document.body.querySelector("[data-testid='proposal-accept-trigger']")).toBeNull()
    expect(document.body.querySelector("[data-testid='proposal-refuse-trigger']")).toBeNull()

    cleanup()
    wrapper.unmount()
  })

  it("shows the same simple no-propositions notice when the list fetch fails as when results are empty", async () => {
    seedSession(["comptoir"])
    useNuxtApp().$queryClient.setDefaultOptions({ queries: { retry: false } })
    const cleanup = registerProposalEndpoints(
      () => {
        throw createError({ statusCode: 503, statusMessage: "Unavailable" })
      },
      proposal,
      [],
      [],
    )

    const wrapper = await mountSuspended(ContentPage, {
      route: "/content?tab=propositions",
      attachTo: document.body,
    })
    await flushPromises()

    await vi.waitFor(() => expect(document.body.querySelector("[data-testid='proposal-list-empty']")).not.toBeNull())

    cleanup()
    wrapper.unmount()
    useNuxtApp().$queryClient.setDefaultOptions({ queries: { retry: 1 } })
  })

  it("requires a refusal reason and sends it after the Director confirms", async () => {
    seedSession(["direction"])
    const observedQueries: Record<string, unknown>[] = []
    const observedBodies: unknown[] = []
    const cleanup = registerProposalEndpoints(proposalList, proposal, observedQueries, observedBodies)

    const wrapper = await mountSuspended(ContentPage, {
      route: `/content?tab=propositions&proposal=${proposal.id}`,
      attachTo: document.body,
    })
    await flushPromises()

    await wrapper.get("[data-testid='proposal-refuse-trigger']").trigger("click")
    const refuseConfirm = () =>
      document.body.querySelector<HTMLButtonElement>("[data-testid='proposal-refuse-confirm']")
    expect(refuseConfirm()?.disabled).toBe(true)

    const refuseInput = document.body.querySelector<HTMLTextAreaElement>("[data-testid='proposal-refuse-input']")
    if (!refuseInput) throw new Error("Refusal input was not teleported into the document")
    refuseInput.value = "Pas conforme"
    refuseInput.dispatchEvent(new Event("input", { bubbles: true }))
    await flushPromises()
    expect(refuseConfirm()?.disabled).toBe(false)
    refuseConfirm()?.click()
    await flushPromises()

    expect(observedBodies).toEqual([{ motif: "Pas conforme" }])

    cleanup()
    wrapper.unmount()
  })

  it("moves to the next visible pending proposal after acceptance", async () => {
    seedSession(["direction"])
    const nextProposal: CatalogueProposal = { ...proposal, id: 10, nom: "Second proposal", slug: "second-proposal" }
    let accepted = false
    const listCleanup = registerEndpoint("/api/v1/catalogue/administration/propositions", {
      method: "GET",
      handler: () => proposalList(accepted ? [nextProposal] : [proposal, nextProposal]),
    })
    const detailCleanup = registerEndpoint(`/api/v1/catalogue/administration/propositions/${proposal.id}`, {
      method: "GET",
      handler: () => (accepted ? { ...proposal, statut: "acceptee" as const } : proposal),
    })
    const nextDetailCleanup = registerEndpoint(`/api/v1/catalogue/administration/propositions/${nextProposal.id}`, {
      method: "GET",
      handler: () => nextProposal,
    })
    const taxonomyCleanup = registerEndpoint("/api/v1/catalogue/administration/taxonomie", {
      method: "GET",
      handler: () => taxonomy,
    })
    const acceptCleanup = registerEndpoint(`/api/v1/catalogue/administration/propositions/${proposal.id}/accepter`, {
      method: "POST",
      handler: () => {
        accepted = true
        return { id: proposal.id, statut: "acceptee", produitId: proposal.produit_id }
      },
    })

    const wrapper = await mountSuspended(ContentPage, {
      route: `/content?tab=propositions&proposalStatus=en_attente&proposal=${proposal.id}`,
      attachTo: document.body,
    })
    await flushPromises()

    await wrapper.get("[data-testid='proposal-accept-trigger']").trigger("click")
    document.body.querySelector<HTMLButtonElement>("[data-testid='proposal-accept-confirm']")?.click()
    await flushPromises()

    await vi.waitFor(() => expect(useRoute().query.proposal).toBe(String(nextProposal.id)))
    expect(document.body.querySelector("[data-testid='proposal-detail-name']")?.textContent).toContain(
      "Second proposal",
    )

    listCleanup()
    detailCleanup()
    nextDetailCleanup()
    taxonomyCleanup()
    acceptCleanup()
    wrapper.unmount()
  })

  it("refetches and converges when another Director decides first", async () => {
    seedSession(["direction"])
    let current = proposal
    const listCleanup = registerEndpoint("/api/v1/catalogue/administration/propositions", {
      method: "GET",
      handler: () => proposalList(current.statut === "en_attente" ? [current] : []),
    })
    const detailCleanup = registerEndpoint(`/api/v1/catalogue/administration/propositions/${proposal.id}`, {
      method: "GET",
      handler: () => current,
    })
    const taxonomyCleanup = registerEndpoint("/api/v1/catalogue/administration/taxonomie", {
      method: "GET",
      handler: () => taxonomy,
    })
    const acceptCleanup = registerEndpoint(`/api/v1/catalogue/administration/propositions/${proposal.id}/accepter`, {
      method: "POST",
      handler: () => {
        current = {
          ...proposal,
          statut: "acceptee",
          decidee_le: "2026-09-05T10:00:00.000Z",
          decidee_par: "Other Director",
        }
        throw createError({ statusCode: 409, statusMessage: "Already decided" })
      },
    })

    const wrapper = await mountSuspended(ContentPage, {
      route: `/content?tab=propositions&proposal=${proposal.id}`,
      attachTo: document.body,
    })
    await flushPromises()

    await wrapper.get("[data-testid='proposal-accept-trigger']").trigger("click")
    document.body.querySelector<HTMLButtonElement>("[data-testid='proposal-accept-confirm']")?.click()

    await vi.waitFor(() => {
      expect(document.body.querySelector("[data-testid='proposal-detail-status']")?.textContent).toContain("Accepted")
      expect(document.body.querySelector("[data-testid='proposal-accept-trigger']")).toBeNull()
    })

    listCleanup()
    detailCleanup()
    taxonomyCleanup()
    acceptCleanup()
    wrapper.unmount()
  })

  it("does not expose decision controls to Comptoir", async () => {
    seedSession(["comptoir"])
    const cleanup = registerProposalEndpoints(proposalList, proposal, [], [])

    const wrapper = await mountSuspended(ContentPage, {
      route: `/content?tab=propositions&proposal=${proposal.id}`,
      attachTo: document.body,
    })
    await flushPromises()

    expect(document.body.querySelector("[data-testid='proposal-read-only']")).not.toBeNull()
    expect(document.body.querySelector("[data-testid='proposal-accept-trigger']")).toBeNull()
    expect(document.body.querySelector("[data-testid='proposal-refuse-trigger']")).toBeNull()

    cleanup()
    wrapper.unmount()
  })
})

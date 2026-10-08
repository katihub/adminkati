import type { TeamDirectoryPage, TeamMember } from "@/types/api/equipe"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { getMethod, getQuery, readBody } from "h3"
import { afterEach, describe, expect, it } from "vitest"
import { defineComponent, h } from "vue"
import { useTeam } from "@/composables/useTeam"
import { useTeamMutations } from "@/composables/useTeamMutations"
import { apiQueryKeys } from "@/utils/api-query-keys"

const member: TeamMember = {
  id: "7b4f5d9e-0c7a-4f1f-a9ae-111111111111",
  courriel: "team@example.com",
  nom: "Team member",
  telephone: null,
  roles: ["comptoir"],
  comptoirs: [],
  actif: true,
  creeLe: "2026-09-02T00:00:00.000Z",
  invitLe: "2026-09-01T00:00:00.000Z",
  premiereConnexionLe: null,
  desactiveLe: null,
}

function makePage(overrides: Partial<TeamDirectoryPage> = {}): TeamDirectoryPage {
  return {
    total: 1,
    page: 1,
    taille: 50,
    pages: 1,
    elements: [member],
    ...overrides,
  }
}

describe("team API integration", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("walks the team annuaire pages and exposes the canonical invitation timestamp", async () => {
    const secondMember = { ...member, id: "7b4f5d9e-0c7a-4f1f-a9ae-222222222222", nom: "Second member" }
    const requestedPages: unknown[] = []
    const cleanup = registerEndpoint("/api/v1/equipe/membres/annuaire", {
      method: "GET",
      handler: event => {
        const query = getQuery(event)
        requestedPages.push(query.page)
        return query.page === "2"
          ? makePage({ page: 2, pages: 2, total: 2, taille: 1, elements: [secondMember] })
          : makePage({ pages: 2, total: 2, taille: 1, elements: [member] })
      },
    })
    let query: ReturnType<typeof useTeam> | undefined
    const Probe = defineComponent({
      setup() {
        query = useTeam({ taille: 50 })
        return () => h("div")
      },
    })

    const wrapper = await mountSuspended(Probe)
    await flushPromises()
    await query?.fetchNextPage()
    await flushPromises()

    expect(requestedPages).toEqual(["1", "2"])
    expect(query?.data.value?.pages.flatMap(page => page.elements)).toEqual([member, secondMember])

    cleanup()
    wrapper.unmount()
  })

  it("sends nullable team updates, deactivation, and reactivation, then invalidates list and detail queries", async () => {
    const queryClient = useNuxtApp().$queryClient
    const listKey = apiQueryKeys.team.list({ taille: 50 })
    const detailKey = apiQueryKeys.team.detail(member.id)
    queryClient.setQueryData(listKey, makePage())
    queryClient.setQueryData(detailKey, member)
    const observed: { method: string; body?: unknown }[] = []
    const updateCleanup = registerEndpoint(`/api/v1/equipe/membres/${member.id}`, {
      method: "PATCH",
      handler: async event => {
        observed.push({ method: getMethod(event), body: await readBody(event) })
        return member
      },
    })
    const deactivateCleanup = registerEndpoint(`/api/v1/equipe/membres/${member.id}`, {
      method: "DELETE",
      handler: event => {
        observed.push({ method: getMethod(event) })
        return { id: member.id, actif: false, desactiveLe: "2026-09-02T01:00:00.000Z" }
      },
    })
    const reactivateCleanup = registerEndpoint(`/api/v1/equipe/membres/${member.id}/reactiver`, {
      method: "POST",
      handler: event => {
        observed.push({ method: getMethod(event) })
        return member
      },
    })
    let mutations: ReturnType<typeof useTeamMutations> | undefined
    const Probe = defineComponent({
      async setup() {
        mutations = useTeamMutations()
        await mutations.update.mutateAsync({ id: member.id, input: { telephone: null, comptoirs: ["Akwa"] } })
        await mutations.deactivate.mutateAsync(member.id)
        await mutations.reactivate.mutateAsync(member.id)
        return () => h("div")
      },
    })

    const wrapper = await mountSuspended(Probe)
    await flushPromises()

    expect(observed).toEqual([
      { method: "PATCH", body: { telephone: null, comptoirs: ["Akwa"] } },
      { method: "DELETE" },
      { method: "POST" },
    ])
    expect(mutations).not.toHaveProperty("create")
    expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(detailKey)?.isInvalidated).toBe(true)

    updateCleanup()
    deactivateCleanup()
    reactivateCleanup()
    wrapper.unmount()
  })
})

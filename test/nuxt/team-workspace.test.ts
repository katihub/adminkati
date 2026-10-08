import type { TeamDirectoryPage, TeamMember } from "@/types/api/equipe"
import type { Role } from "@/types/session"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody } from "h3"
import { afterEach, describe, expect, it } from "vitest"
import TeamPage from "@/pages/team.vue"
import { apiQueryKeys } from "@/utils/api-query-keys"
import { makeComptoirPoints } from "./comptoirs-fixture"

const memberId = "7b4f5d9e-0c7a-4f1f-a9ae-222222222222"

const member: TeamMember = {
  id: memberId,
  courriel: "team@example.com",
  nom: "Team member",
  telephone: "677000001",
  roles: ["comptoir"],
  comptoirs: [],
  actif: true,
  creeLe: "2026-09-02T00:00:00.000Z",
  invitLe: "2026-09-01T00:00:00.000Z",
  premiereConnexionLe: null,
  desactiveLe: null,
}

function seedSession(roles: Role[], membreId = "other-member") {
  useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
    userId: "user-1",
    membreId,
    nom: "Current member",
    courriel: "current@example.com",
    roles,
    comptoirs: [],
  })
  useNuxtApp().$queryClient.setQueryData(
    apiQueryKeys.pointsOfSale.all,
    makeComptoirPoints([
      { cle: "Akwa", libelle: "Akwa" },
      { cle: "Centre-ville", libelle: "Centre-ville" },
    ]),
  )
}

function seedDirectory(elements: TeamMember[] = [member]) {
  const page: TeamDirectoryPage = {
    total: elements.length,
    page: 1,
    taille: 50,
    pages: 1,
    elements,
  }
  useNuxtApp().$queryClient.setQueryData(apiQueryKeys.team.list({ tri: "nom", taille: 50 }), {
    pages: [page],
    pageParams: [1],
  })
}

describe("team workspace page", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("opens the first member for every active role without adding an id to the route", async () => {
    seedSession(["preparation"])
    seedDirectory()
    useNuxtApp().$queryClient.setQueryData(apiQueryKeys.team.detail(memberId), member)

    const wrapper = await mountSuspended(TeamPage, { route: "/team" })
    await flushPromises()

    expect(wrapper.get("[data-testid='team-detail-content']").text()).toContain("Team member")
    expect(wrapper.get("[data-testid='team-list-item']").text()).toContain("Team member")
    expect(wrapper.get("[data-testid='team-list-item']").attributes("aria-pressed")).toBe("true")
    expect(useRoute().query.id).toBeUndefined()
    expect(wrapper.find("[data-testid='team-management-actions']").exists()).toBe(false)

    wrapper.unmount()
  })

  it("lets direction edit profile details in place while keeping email read-only", async () => {
    seedSession(["direction"])
    seedDirectory()
    useNuxtApp().$queryClient.setQueryData(apiQueryKeys.team.detail(memberId), member)

    const wrapper = await mountSuspended(TeamPage, { route: `/team?id=${memberId}` })
    await flushPromises()

    expect(wrapper.find("[data-testid='team-management-actions']").exists()).toBe(true)
    await wrapper.get("[data-testid='people-profile-title-input']").setValue("Updated member")
    await flushPromises()

    expect(wrapper.find("[data-testid='team-member-email-input']").exists()).toBe(false)
    expect(wrapper.find("[data-testid='team-deactivate-button']").exists()).toBe(true)

    wrapper.unmount()
  })

  it("hides role and lifecycle controls when a director views their own member row", async () => {
    const selfId = "7b4f5d9e-0c7a-4f1f-a9ae-333333333333"
    const self = { ...member, id: selfId }
    seedSession(["direction"], self.id)
    seedDirectory([self])
    useNuxtApp().$queryClient.setQueryData(apiQueryKeys.team.detail(self.id), self)

    const wrapper = await mountSuspended(TeamPage, { route: `/team?id=${self.id}` })
    await flushPromises()

    expect(wrapper.find("[data-testid='team-member-roles']").exists()).toBe(false)
    expect(wrapper.find("[data-testid='team-deactivate-button']").exists()).toBe(false)

    wrapper.unmount()
  })

  /**
   * LE PÉRIMÈTRE REMPLACE LA VILLE. Le champ libre ne décidait de rien ; les
   * comptoirs cochés décident de ce que le membre pourra encaisser, et c'est la
   * direction seule qui les coche.
   */
  it("lets direction tick a member's counters and sends the whole list", async () => {
    let body: unknown = null
    // Le téléphone est déjà à la forme que le backend exige : sans cela, la
    // fiche refuse d'enregistrer pour une raison qui n'a rien à voir.
    const reachable: TeamMember = { ...member, telephone: "+237 677 00 00 01" }
    const cleanup = registerEndpoint(`/api/v1/equipe/membres/${memberId}`, {
      method: "PATCH",
      handler: async event => {
        body = await readBody(event)
        return { ...reachable, comptoirs: ["Centre-ville"] }
      },
    })
    seedSession(["direction"])
    seedDirectory([reachable])
    useNuxtApp().$queryClient.setQueryData(apiQueryKeys.team.detail(memberId), reachable)

    const wrapper = await mountSuspended(TeamPage, { route: `/team?id=${memberId}`, attachTo: document.body })
    await flushPromises()

    const box = wrapper.get("[data-testid='team-member-comptoir'][data-comptoir='Centre-ville']")
    await box.setValue(true)
    await flushPromises()
    await wrapper.get("[data-testid='team-member-save']").trigger("click")
    await flushPromises()
    await flushPromises()

    expect(body).toMatchObject({ comptoirs: ["Centre-ville"] })
    expect(wrapper.find("[data-testid='team-member-city-input']").exists()).toBe(false)

    cleanup()
    wrapper.unmount()
  })

  it("shows a member with no counter as covering the whole shop, for a reader who cannot edit", async () => {
    seedSession(["preparation"])
    seedDirectory()
    useNuxtApp().$queryClient.setQueryData(apiQueryKeys.team.detail(memberId), member)

    const wrapper = await mountSuspended(TeamPage, { route: `/team?id=${memberId}` })
    await flushPromises()

    expect(wrapper.get("[data-testid='team-readonly-comptoirs']").text()).toBe("Whole shop")
    expect(wrapper.get("[data-testid='team-list-item-comptoirs']").text()).toBe("Whole shop")

    wrapper.unmount()
  })

  it("keeps an inactive selected member open and offers reactivation", async () => {
    const inactive = { ...member, actif: false, desactiveLe: "2026-09-08T12:00:00.000Z" }
    seedSession(["direction"])
    seedDirectory([inactive])
    useNuxtApp().$queryClient.setQueryData(apiQueryKeys.team.detail(memberId), inactive)

    const wrapper = await mountSuspended(TeamPage, { route: `/team?id=${memberId}` })
    await flushPromises()

    expect(wrapper.find("[data-testid='team-reactivate-button']").exists()).toBe(true)
    expect(wrapper.find("[data-testid='team-deactivate-button']").exists()).toBe(false)

    wrapper.unmount()
  })
})

import type { TeamMember } from "@/types/api/equipe"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody } from "h3"
import { afterEach, describe, expect, it } from "vitest"
import TeamPasswordDialog from "@/components/team/PasswordDialog.vue"

const member: TeamMember = {
  id: "7b4f5d9e-0c7a-4f1f-a9ae-333333333333",
  courriel: "agent@katimarket.com",
  nom: "Agent Kati",
  telephone: null,
  roles: ["comptoir"],
  comptoirs: [],
  actif: true,
  creeLe: "2026-11-18T08:00:00.000Z",
  premiereConnexionLe: null,
  desactiveLe: null,
}

function query<T extends Element>(testId: string) {
  return document.body.querySelector<T>(`[data-testid='${testId}']`)
}

async function fill(testId: string, value: string) {
  const input = query<HTMLInputElement>(testId)!
  input.value = value
  input.dispatchEvent(new Event("input"))
  await flushPromises()
}

describe("team password dialog", () => {
  afterEach(() => {
    useNuxtApp().$queryClient.clear()
    document.body.innerHTML = ""
  })

  it("updates the selected member password after confirmation", async () => {
    let body: unknown
    const cleanup = registerEndpoint(`/api/v1/equipe/membres/${member.id}/mot-de-passe`, {
      method: "PUT",
      handler: async event => {
        body = await readBody(event)
        return { motDePasseModifie: true }
      },
    })
    const wrapper = await mountSuspended(TeamPasswordDialog, { props: { member }, attachTo: document.body })

    query<HTMLButtonElement>("team-password-trigger")?.click()
    await flushPromises()
    await fill("team-password", "Nouveau-2026")
    await fill("team-password-confirmation", "Nouveau-2026")
    query<HTMLButtonElement>("team-password-submit")?.click()
    await flushPromises()
    await flushPromises()

    expect(body).toEqual({ motDePasse: "Nouveau-2026" })
    expect(query("team-password-success")?.textContent).toContain("updated")

    cleanup()
    wrapper.unmount()
  })

  it("keeps mismatched passwords in the browser", async () => {
    let calls = 0
    const cleanup = registerEndpoint(`/api/v1/equipe/membres/${member.id}/mot-de-passe`, {
      method: "PUT",
      handler: () => {
        calls += 1
        return { motDePasseModifie: true }
      },
    })
    const wrapper = await mountSuspended(TeamPasswordDialog, { props: { member }, attachTo: document.body })

    query<HTMLButtonElement>("team-password-trigger")?.click()
    await flushPromises()
    await fill("team-password", "Nouveau-2026")
    await fill("team-password-confirmation", "Different-2026")
    query<HTMLButtonElement>("team-password-submit")?.click()
    await flushPromises()

    expect(calls).toBe(0)
    expect(query("team-password-error")?.textContent).toContain("match")

    cleanup()
    wrapper.unmount()
  })
})

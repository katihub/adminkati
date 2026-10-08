import type { HireTeamMemberInput, HireTeamMemberResult } from "@/types/api/equipe"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody } from "h3"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import TeamHireDialog from "@/components/team/HireDialog.vue"
import { makeComptoirPoints, seedDirectionWithComptoirs } from "./comptoirs-fixture"

const MEMBERS_PATH = "/api/v1/equipe/membres"

function hired(overrides: Partial<HireTeamMemberResult> = {}): HireTeamMemberResult {
  return {
    id: "7b4f5d9e-0c7a-4f1f-a9ae-333333333333",
    courriel: "essai@nowtech.local",
    nom: "Essai Embauche",
    telephone: null,
    roles: ["comptoir"],
    comptoirs: [],
    actif: true,
    creeLe: "2026-09-12T08:00:00.000Z",
    invitLe: "2026-09-12T08:00:00.000Z",
    premiereConnexionLe: null,
    desactiveLe: null,
    invitationEnvoyee: true,
    ...overrides,
  }
}

function query<T extends Element>(testId: string) {
  return document.body.querySelector<T>(`[data-testid='${testId}']`)
}

async function openDialog() {
  query<HTMLButtonElement>("team-hire-trigger")?.click()
  await flushPromises()
}

async function fill(testId: string, value: string) {
  const input = query<HTMLInputElement>(testId)!
  input.value = value
  input.dispatchEvent(new Event("input"))
  await flushPromises()
}

async function pickRole(role: string) {
  document.body.querySelector<HTMLButtonElement>(`[data-testid='team-hire-role'][data-role='${role}']`)?.click()
  await flushPromises()
}

async function tickComptoir(cle: string) {
  const box = document.body.querySelector<HTMLInputElement>(
    `[data-testid='team-hire-comptoir'][data-comptoir='${cle}']`,
  )!
  box.checked = !box.checked
  box.dispatchEvent(new Event("change"))
  await flushPromises()
}

async function submit() {
  query<HTMLButtonElement>("team-hire-submit")?.click()
  await flushPromises()
  await flushPromises()
}

async function openAndFillRequiredFields() {
  await openDialog()
  await fill("team-hire-email", "essai@nowtech.local")
  await fill("team-hire-name", "Essai Embauche")
  await pickRole("comptoir")
}

describe("team hire dialog", () => {
  beforeEach(() =>
    seedDirectionWithComptoirs(
      makeComptoirPoints([
        { cle: "Akwa", libelle: "Akwa" },
        { cle: "Centre-ville", libelle: "Centre-ville" },
        // Un comptoir fermé ne se propose pas : personne ne doit être rattaché à un
        // comptoir que le client ne peut plus atteindre.
        { cle: "Bonaberi", libelle: "Bonabéri", active: false },
      ]),
    ),
  )

  afterEach(() => {
    useNuxtApp().$queryClient.clear()
    // Chaque `attachTo: document.body` laisse son hôte derrière lui ; sans ce
    // nettoyage le test suivant clique sur le déclencheur du test précédent.
    document.body.innerHTML = ""
  })

  it("posts the trimmed hire payload and omits the optional fields left blank", async () => {
    let body: HireTeamMemberInput | null = null
    const cleanup = registerEndpoint(MEMBERS_PATH, {
      method: "POST",
      handler: async event => {
        body = await readBody(event)
        return hired()
      },
    })

    const wrapper = await mountSuspended(TeamHireDialog, { attachTo: document.body })
    await openDialog()
    await fill("team-hire-email", "  Essai@NowTech.local  ")
    await fill("team-hire-name", "  Essai Embauche  ")
    await pickRole("comptoir")
    await submit()

    expect(body).toEqual({ courriel: "essai@nowtech.local", nom: "Essai Embauche", roles: ["comptoir"] })

    cleanup()
    wrapper.unmount()
  })

  /**
   * LA LISTE VIDE N'EST PAS « RIEN », C'EST TOUTE LA BOUTIQUE. Une case décochée
   * ressemble à une privation ; le formulaire dit en une phrase le contraire,
   * visible d'emblée plutôt que cachée dans une infobulle.
   */
  it("says in the dialog what an empty list of counters means, before anything is ticked", async () => {
    const wrapper = await mountSuspended(TeamHireDialog, { attachTo: document.body })
    await openDialog()

    expect(query("team-hire-comptoirs-hint")?.textContent?.trim()).toBe(
      "No counter ticked: the member covers the whole shop.",
    )
    // Ce n'est pas une infobulle : aucun survol n'est nécessaire pour la lire.
    expect(query("team-hire-comptoirs-hint")?.getAttribute("title")).toBeNull()

    wrapper.unmount()
  })

  it("offers the published counters only, never a closed one", async () => {
    const wrapper = await mountSuspended(TeamHireDialog, { attachTo: document.body })
    await openDialog()

    const offered = [...document.body.querySelectorAll("[data-testid='team-hire-comptoir']")].map(box =>
      box.getAttribute("data-comptoir"),
    )

    expect(offered).toEqual(["Akwa", "Centre-ville"])

    wrapper.unmount()
  })

  it("sends the optional phone, the ticked counters and every picked role once they are filled", async () => {
    let body: HireTeamMemberInput | null = null
    const cleanup = registerEndpoint(MEMBERS_PATH, {
      method: "POST",
      handler: async event => {
        body = await readBody(event)
        return hired()
      },
    })

    const wrapper = await mountSuspended(TeamHireDialog, { attachTo: document.body })
    await openDialog()
    await fill("team-hire-email", "essai@nowtech.local")
    await fill("team-hire-name", "Essai Embauche")
    await pickRole("comptoir")
    await pickRole("livreur")
    await fill("team-hire-phone", "+237 677 00 00 01")
    await tickComptoir("Akwa")
    await submit()

    expect(body).toEqual({
      courriel: "essai@nowtech.local",
      nom: "Essai Embauche",
      roles: ["comptoir", "livreur"],
      telephone: "+237 677 00 00 01",
      comptoirs: ["Akwa"],
    })

    cleanup()
    wrapper.unmount()
  })

  it("refuses a phone that does not match the backend shape before any request leaves", async () => {
    let calls = 0
    const cleanup = registerEndpoint(MEMBERS_PATH, {
      method: "POST",
      handler: () => {
        calls += 1
        return hired()
      },
    })

    const wrapper = await mountSuspended(TeamHireDialog, { attachTo: document.body })
    await openAndFillRequiredFields()
    await fill("team-hire-phone", "677000001")
    await submit()

    expect(calls).toBe(0)
    expect(query("team-hire-phone-error")).not.toBeNull()
    // La forme attendue est annoncée avant la faute, pas seulement après.
    expect(query<HTMLInputElement>("team-hire-phone")?.placeholder).toBe("+237 6XX XX XX XX")
    expect(query("team-hire-phone-hint")).not.toBeNull()

    await fill("team-hire-phone", "+237 677 00 00 01")
    await submit()

    expect(calls).toBe(1)

    cleanup()
    wrapper.unmount()
  })

  it("refuses to submit without a role, and never posts an empty roles array", async () => {
    let calls = 0
    const cleanup = registerEndpoint(MEMBERS_PATH, {
      method: "POST",
      handler: () => {
        calls += 1
        return hired()
      },
    })

    const wrapper = await mountSuspended(TeamHireDialog, { attachTo: document.body })
    await openDialog()
    await fill("team-hire-email", "essai@nowtech.local")
    await fill("team-hire-name", "Essai Embauche")
    await submit()

    expect(calls).toBe(0)
    expect(query("team-hire-roles-error")).not.toBeNull()

    cleanup()
    wrapper.unmount()
  })

  /**
   * LE POINT DE TOUT L'ÉCRAN : `invitationEnvoyee` est rendu exprès par le
   * backend, et une issue unique pour les deux cas ferait croire au salarié
   * qu'un courriel l'attend.
   */
  it("says the invitation left when the backend reports it did", async () => {
    const cleanup = registerEndpoint(MEMBERS_PATH, {
      method: "POST",
      handler: () => hired({ invitationEnvoyee: true }),
    })

    const wrapper = await mountSuspended(TeamHireDialog, { attachTo: document.body })
    await openAndFillRequiredFields()
    await submit()

    expect(query("team-hire-result")?.querySelector("[data-invitation-sent='true']")).not.toBeNull()
    expect(query("team-hire-result-title")?.textContent?.trim()).toBe("Invitation sent")
    expect(query("team-hire-result-body")?.textContent).toContain("essai@nowtech.local")

    cleanup()
    wrapper.unmount()
  })

  it("tells the director to warn the member when the invitation never left", async () => {
    const cleanup = registerEndpoint(MEMBERS_PATH, {
      method: "POST",
      handler: () => hired({ invitationEnvoyee: false, invitLe: null }),
    })

    const wrapper = await mountSuspended(TeamHireDialog, { attachTo: document.body })
    await openAndFillRequiredFields()
    await submit()

    expect(query("team-hire-result")?.querySelector("[data-invitation-sent='false']")).not.toBeNull()
    expect(query("team-hire-result-title")?.textContent?.trim()).toBe("Invitation not sent")
    expect(query("team-hire-result-body")?.textContent).toContain("tell them yourself")
    expect(query("team-hire-result-body")?.textContent).toContain("essai@nowtech.local")

    cleanup()
    wrapper.unmount()
  })

  it("surfaces the backend's own French refusal instead of a generic failure", async () => {
    const cleanup = registerEndpoint(MEMBERS_PATH, {
      method: "POST",
      handler: event => {
        event.node.res.statusCode = 409
        return { statusCode: 409, message: "Ce courriel est deja pris" }
      },
    })

    const wrapper = await mountSuspended(TeamHireDialog, { attachTo: document.body })
    await openAndFillRequiredFields()
    await submit()

    expect(query("team-hire-error")?.textContent).toContain("Ce courriel est deja pris")
    expect(query("team-hire-result")).toBeNull()

    cleanup()
    wrapper.unmount()
  })
})

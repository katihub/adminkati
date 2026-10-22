import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import SiteTextsWorkspace from "@/components/site-texts/Workspace.vue"

type Command = { method: string; path: string; body?: unknown }

const PAGE = {
  titre: "Conditions générales de vente",
  intro: "Les règles.",
  sections: [{ titre: "Prix", paragraphes: ["En francs CFA."] }],
}
const PUBLISHED = {
  id: "v1",
  contenuCle: "cgv",
  numero: 1,
  statut: "publie",
  fr: PAGE,
  en: null,
  anglais: "absent",
  nature: "mineur",
  resume: null,
  commentaireRenvoi: null,
  baseVersionId: null,
  soumisLe: null,
  publieLe: "2026-10-22T08:00:00.000Z",
  modifieLe: "2026-10-22T08:00:00.000Z",
}
const DRAFT = {
  ...PUBLISHED,
  id: "v2",
  numero: null,
  statut: "soumis",
  publieLe: null,
  en: { ...PAGE, titre: "General terms of sale" },
  anglais: "a_jour",
  baseVersionId: "v1",
  resume: "Traduction",
}

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach(cleanup => cleanup())
  cleanups = []
  document.body.innerHTML = ""
  useNuxtApp().$queryClient.clear()
})

function api(commands: Command[], options: { rights?: object; draft?: object | null } = {}) {
  const record =
    (method: string, path: string, answer: unknown = { ok: true }) =>
    async (event: Parameters<typeof readBody>[0]) => {
      commands.push({
        method,
        path,
        body:
          method === "DELETE" || path.endsWith("publier") || path.endsWith("soumettre")
            ? undefined
            : await readBody(event),
      })
      return answer
    }
  const draft = options.draft === undefined ? DRAFT : options.draft
  cleanups = [
    registerEndpoint("/api/v1/contenus/droits", {
      method: "GET",
      handler: () => options.rights ?? { rediger: true, publier: true, reglages: true },
    }),
    registerEndpoint("/api/v1/contenus/reglages", { method: "GET", handler: () => ({ rolesRedaction: ["comptoir"] }) }),
    registerEndpoint("/api/v1/contenus/reglages", { method: "PATCH", handler: record("PATCH", "reglages") }),
    registerEndpoint("/api/v1/contenus", {
      method: "GET",
      handler: () => [
        {
          cle: "cgv",
          type: "legal",
          titre: PAGE.titre,
          publiee: { numero: 1, publieLe: PUBLISHED.publieLe, anglais: "absent" },
          enCours: draft
            ? {
                id: "v2",
                statut: (draft as { statut: string }).statut,
                anglais: "a_jour",
                modifieLe: PUBLISHED.modifieLe,
                commentaireRenvoi: null,
                redigeParNom: "Awa",
              }
            : null,
        },
      ],
    }),
    registerEndpoint("/api/v1/contenus/cgv", {
      method: "GET",
      handler: () => ({
        cle: "cgv",
        type: "legal",
        publiee: PUBLISHED,
        enCours: draft,
        historique: [{ ...PUBLISHED }],
        defaut: null,
        variables: [],
      }),
    }),
    registerEndpoint("/api/v1/contenus/cgv/brouillon", { method: "POST", handler: record("POST", "brouillon", DRAFT) }),
    registerEndpoint("/api/v1/contenus/versions/v2", { method: "PUT", handler: record("PUT", "v2", DRAFT) }),
    registerEndpoint("/api/v1/contenus/versions/v2/soumettre", {
      method: "POST",
      handler: record("POST", "soumettre"),
    }),
    registerEndpoint("/api/v1/contenus/versions/v2/publier", { method: "POST", handler: record("POST", "publier") }),
    registerEndpoint("/api/v1/contenus/versions/v2/renvoyer", { method: "POST", handler: record("POST", "renvoyer") }),
  ]
}

const byTestId = (id: string) => document.querySelector<HTMLElement>(`[data-testid='${id}']`)
async function click(id: string) {
  await vi.waitFor(() => expect((byTestId(id) as HTMLButtonElement | null)?.disabled).toBe(false))
  byTestId(id)!.click()
  await flushPromises()
}
async function type(id: string, value: string) {
  await vi.waitFor(() => expect(byTestId(id)).not.toBeNull())
  const input = byTestId(id) as HTMLInputElement | HTMLTextAreaElement
  input.value = value
  input.dispatchEvent(new Event("input"))
  await flushPromises()
}
async function mount() {
  await mountSuspended(SiteTextsWorkspace, { attachTo: document.body })
  await flushPromises()
  await click("site-text-cgv")
}

describe("site texts workspace", () => {
  it("lets the direction publish a submitted version", async () => {
    const commands: Command[] = []
    api(commands)
    await mount()
    expect(byTestId("site-text-cgv")?.textContent).toContain("Conditions générales de vente")
    await vi.waitFor(() => expect(byTestId("site-text-status")?.textContent).toBeTruthy())
    await click("site-text-publish")
    await vi.waitFor(() => expect(commands.some(command => command.path === "publier")).toBe(true))
    expect(commands).toContainEqual({ method: "POST", path: "publier", body: undefined })
  })

  it("saves the writer's changes in both languages, then submits; a writer cannot publish", async () => {
    const commands: Command[] = []
    api(commands, {
      rights: { rediger: true, publier: false, reglages: false },
      draft: { ...DRAFT, statut: "brouillon" },
    })
    await mount()
    await vi.waitFor(() => expect(byTestId("site-text-save")).not.toBeNull())
    expect(byTestId("site-text-publish")).toBeNull()
    await type("site-text-fr-title", "CGV 2026")
    await click("site-text-save")
    expect(commands).toContainEqual({
      method: "PUT",
      path: "v2",
      body: expect.objectContaining({
        fr: expect.objectContaining({ titre: "CGV 2026" }),
        en: expect.objectContaining({ titre: "General terms of sale" }),
        nature: "mineur",
      }),
    })
    await click("site-text-submit")
    await vi.waitFor(() => expect(commands.some(command => command.path === "soumettre")).toBe(true))
  })

  it("sends a version back only with a comment", async () => {
    const commands: Command[] = []
    api(commands)
    await mount()
    await click("site-text-send-back")
    await click("site-text-send-back-confirm")
    expect(commands.some(command => command.path === "renvoyer")).toBe(false)
    await type("site-text-send-back-comment", "Préciser le délai de retour")
    await click("site-text-send-back-confirm")
    expect(commands).toContainEqual({
      method: "POST",
      path: "renvoyer",
      body: { commentaire: "Préciser le délai de retour" },
    })
  })

  it("opens a draft from the live version when none is in progress", async () => {
    const commands: Command[] = []
    api(commands, { draft: null })
    await mount()
    await click("site-text-open-draft")
    expect(commands).toContainEqual({ method: "POST", path: "brouillon", body: {} })
  })

  it("lets the direction choose which roles may write", async () => {
    const commands: Command[] = []
    api(commands)
    await mountSuspended(SiteTextsWorkspace, { attachTo: document.body })
    await vi.waitFor(() =>
      expect((byTestId("site-texts-role-comptoir") as HTMLInputElement | null)?.checked).toBe(true),
    )
    ;(byTestId("site-texts-role-preparation") as HTMLInputElement).click()
    await click("site-texts-save-roles")
    expect(commands).toContainEqual({
      method: "PATCH",
      path: "reglages",
      body: { rolesRedaction: ["comptoir", "preparation"] },
    })
  })

  it("tells a member without the right that they cannot write", async () => {
    api([], { rights: { rediger: false, publier: false, reglages: false } })
    await mountSuspended(SiteTextsWorkspace, { attachTo: document.body })
    await vi.waitFor(() => expect(byTestId("site-texts-forbidden")).not.toBeNull())
    expect(byTestId("site-text-cgv")).toBeNull()
  })

  it("shows the direction which shops have read the latest important change of the seller contract", async () => {
    api([])
    cleanups.push(
      registerEndpoint("/api/v1/contenus", {
        method: "GET",
        handler: () => [
          {
            cle: "contrat-vendeurs",
            type: "legal",
            titre: "Contrat avec les vendeurs",
            publiee: { numero: 4, publieLe: PUBLISHED.publieLe, anglais: "absent" },
            enCours: null,
          },
        ],
      }),
      registerEndpoint("/api/v1/contenus/contrat-vendeurs", {
        method: "GET",
        handler: () => ({
          cle: "contrat-vendeurs",
          type: "legal",
          publiee: { ...PUBLISHED, contenuCle: "contrat-vendeurs", numero: 4 },
          enCours: null,
          historique: [],
          defaut: null,
          variables: [],
        }),
      }),
      registerEndpoint("/api/v1/contenus/contrat-vendeurs/lectures", {
        method: "GET",
        handler: () => ({
          version: { numero: 4, publieLe: PUBLISHED.publieLe, resume: null },
          boutiques: [
            { id: "b1", nom: "TechMall", statut: "active", luLe: "2026-10-22T12:00:00.000Z", par: "lecture" },
            { id: "b2", nom: "ModeCM", statut: "active", luLe: null, par: null },
          ],
        }),
      }),
    )
    await mountSuspended(SiteTextsWorkspace, { attachTo: document.body })
    await click("site-text-contrat-vendeurs")
    await vi.waitFor(() => expect(byTestId("site-text-contract-readings")?.textContent).toContain("ModeCM"))
    expect(byTestId("site-text-contract-readings")?.textContent).toMatch(/1\D+2/)
  })

  it("edits an e-mail not customised yet from its original text, with its variables", async () => {
    const commands: Command[] = []
    api(commands)
    const EMAIL = {
      sujet: "Retour autorisé — {commande}",
      paragraphes: ["Votre demande de retour (dossier {dossier}) est acceptée."],
      bouton: "Voir ma commande",
    }
    const EMAIL_EN = {
      sujet: "Return approved — {commande}",
      paragraphes: ["Your return request (case {dossier}) is approved."],
      bouton: "View my order",
    }
    const draft = {
      ...DRAFT,
      id: "v9",
      contenuCle: "courriel.retour.autorise",
      statut: "brouillon",
      fr: EMAIL,
      en: EMAIL_EN,
      baseVersionId: null,
    }
    cleanups.push(
      registerEndpoint("/api/v1/contenus", {
        method: "GET",
        handler: () => [
          {
            cle: "courriel.retour.autorise",
            type: "courriel",
            titre: "Client — Retour autorisé",
            publiee: null,
            enCours: null,
          },
        ],
      }),
      registerEndpoint("/api/v1/contenus/courriel.retour.autorise", {
        method: "GET",
        handler: () => ({
          cle: "courriel.retour.autorise",
          type: "courriel",
          publiee: null,
          enCours: commands.some(c => c.path === "brouillon-email") ? draft : null,
          historique: [],
          defaut: { fr: EMAIL, en: EMAIL_EN },
          variables: ["dossier", "commande"],
        }),
      }),
      registerEndpoint("/api/v1/contenus/courriel.retour.autorise/brouillon", {
        method: "POST",
        handler: async (event: Parameters<typeof readBody>[0]) => {
          commands.push({ method: "POST", path: "brouillon-email", body: await readBody(event) })
          return draft
        },
      }),
      registerEndpoint("/api/v1/contenus/versions/v9", {
        method: "PUT",
        handler: async (event: Parameters<typeof readBody>[0]) => {
          commands.push({ method: "PUT", path: "v9", body: await readBody(event) })
          return draft
        },
      }),
    )
    await mountSuspended(SiteTextsWorkspace, { attachTo: document.body })
    await click("site-text-courriel.retour.autorise")
    await vi.waitFor(() => expect(byTestId("site-text-live")?.textContent).toMatch(/original|origine/))
    await click("site-text-open-draft")
    await type("site-text-fr-subject", "Bonne nouvelle : retour accepté — {commande}")
    expect(document.body.textContent).toContain("{dossier}")
    await click("site-text-save")
    await vi.waitFor(() =>
      expect(commands).toContainEqual({
        method: "PUT",
        path: "v9",
        body: expect.objectContaining({
          fr: expect.objectContaining({ sujet: "Bonne nouvelle : retour accepté — {commande}" }),
        }),
      }),
    )
  })
})

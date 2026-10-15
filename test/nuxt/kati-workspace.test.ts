import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { getQuery, readBody } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import KatiClients from "@/components/operations/kati/KatiClients.vue"
import KatiOverview from "@/components/operations/kati/KatiOverview.vue"
import KatiPolicy from "@/components/operations/kati/KatiPolicy.vue"
import KatiSponsorships from "@/components/operations/kati/KatiSponsorships.vue"

type Command = { method: string; path: string; body?: unknown }

const RULES = {
  katiParFcfa: 10,
  gainClientBps: 100,
  commissionParrainBps: 50,
  assiette: "produits",
  liberationApresLivraisonJours: 5,
  parrainageDureeMois: 12,
  plafondCommissionsMensuelKati: 200000,
  depenseMinimumKati: 10000,
  depensePlafondBps: 5000,
  expirationGainsMois: 12,
  rechargeActive: false,
  rechargeMinimumFcfa: 1000,
  rechargeMaximumFcfa: 500000,
}
const policy = (id: string, version: number, statut: string, regles = RULES) => ({
  id,
  version,
  statut,
  regles,
  effectiveLe: statut === "brouillon" ? null : "2026-10-17T08:00:00.000Z",
  termineeLe: null,
  approuveePar: null,
  approuveeLe: null,
  creeLe: "2026-10-17T08:00:00.000Z",
})
const person = (id: string, nom: string) => ({ id, profil: { nom } })

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach(cleanup => cleanup())
  cleanups = []
  document.body.innerHTML = ""
  useNuxtApp().$queryClient.clear()
})

const record = (commands: Command[], method: string, path: string) => async (event: Parameters<typeof readBody>[0]) => {
  commands.push({ method, path, body: await readBody(event).catch(() => undefined) })
  return { ok: true, credites: 14900 }
}
const byTestId = (id: string) => document.querySelector<HTMLElement>(`[data-testid='${id}']`)
async function type(id: string, value: string) {
  const input = byTestId(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  input.value = value
  input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? "change" : "input"))
  await flushPromises()
}

describe("KATI points administration", () => {
  it("shows every pocket, this month's cost, and runs the processing on demand", async () => {
    const commands: Command[] = []
    cleanups = [
      registerEndpoint("/api/v1/marketplace/kati/administration/indicateurs", {
        method: "GET",
        handler: () => ({
          politiqueVersion: 3,
          katiParFcfa: 10,
          kati: { disponible: 104300, enAttente: 29800, reserve: 0, utilises: 5000, annules: 14900, expires: 0 },
          valeurFcfa: { disponible: 10430, enAttente: 2980 },
          emisCeMois: { gains: 59600, commissions: 14900, ajustements: 1000, total: 75500, coutFcfa: 7550 },
          commissionsEnRevue: 2,
          parrainagesActifs: 4,
        }),
      }),
      registerEndpoint("/api/v1/marketplace/kati/traitements", {
        method: "POST",
        handler: record(commands, "POST", "jobs"),
      }),
    ]
    const wrapper = await mountSuspended(KatiOverview, { attachTo: document.body })
    await flushPromises()

    expect(wrapper.get("[data-testid='kati-pocket-available']").text()).toMatch(/104,300/)
    expect(wrapper.get("[data-testid='kati-pocket-available']").text()).toMatch(/10,430/)
    expect(wrapper.get("[data-testid='kati-month-cost']").text()).toMatch(/7,550/)
    expect(wrapper.get("[data-testid='kati-review-shortcut']").text()).toContain("2")
    await wrapper.get("[data-testid='kati-run-jobs']").trigger("click")
    await vi.waitFor(() => expect(commands).toHaveLength(1))
    await wrapper.get("[data-testid='kati-review-shortcut']").trigger("click")
    expect(wrapper.emitted("open")?.[0]).toEqual(["sponsorships"])
    wrapper.unmount()
  })

  it("searches customers, opens a sheet and records an idempotent adjustment with its reason", async () => {
    const commands: Command[] = []
    const searches: unknown[] = []
    cleanups = [
      registerEndpoint("/api/v1/marketplace/kati/administration/clients", {
        method: "GET",
        handler: event => {
          searches.push(getQuery(event))
          return [
            {
              id: "c1",
              nom: "Awa",
              courriel: "awa@katihub.cm",
              telephone: "+237 699 00 00 01",
              disponible: 5000,
              enAttente: 1000,
            },
          ]
        },
      }),
      registerEndpoint("/api/v1/marketplace/kati/administration/clients/c1", {
        method: "GET",
        handler: () => ({
          client: { id: "c1", nom: "Awa", courriel: "awa@katihub.cm", telephone: "+237 699 00 00 01", statut: "actif" },
          soldes: { disponible: 5000, enAttente: 1000, reserve: 0 },
          historique: {
            total: 1,
            page: 1,
            taille: 20,
            elements: [
              {
                id: "t1",
                type: "annulation",
                libelle: "Repris",
                creeLe: "2026-10-17T10:00:00.000Z",
                commande: "CM-1",
                commission: false,
                disponible: -400,
                enAttente: 0,
                reserve: 0,
              },
            ],
          },
          parrain: {
            id: "p1",
            statut: "actif",
            attacheLe: "2026-10-01T10:00:00.000Z",
            expireLe: "2027-10-01T10:00:00.000Z",
            source: "code",
            parrain: person("s1", "Bob"),
          },
          filleuls: [],
          code: "KATI-AWA-7Q2K",
        }),
      }),
      registerEndpoint("/api/v1/marketplace/kati/administration/clients/c1/ajustements", {
        method: "POST",
        handler: record(commands, "POST", "c1"),
      }),
    ]
    const wrapper = await mountSuspended(KatiClients, { attachTo: document.body })
    await flushPromises()

    await wrapper.get("[data-testid='kati-client-c1']").trigger("click")
    await vi.waitFor(() => expect(wrapper.find("[data-testid='kati-sheet-available']").exists()).toBe(true))
    const sheet = wrapper.get("[data-testid='kati-client-sheet']").text()
    expect(sheet).toContain("KATI-AWA-7Q2K")
    expect(sheet).toContain("Sponsored by Bob")
    expect(wrapper.get("[data-testid='kati-sheet-history']").text()).toMatch(/-400/)

    await wrapper.get("[data-testid='kati-adjust']").trigger("click")
    await vi.waitFor(() => expect(byTestId("kati-adjust-points")).not.toBeNull())
    await type("kati-adjust-direction", "retrait")
    await type("kati-adjust-points", "6000")
    await type("kati-adjust-reason", "Abus constaté par le support")
    // More than the available balance: the form refuses before calling the API.
    expect(byTestId("kati-adjust-form")!.textContent).toContain("exceeds the available balance")
    await type("kati-adjust-points", "400")
    byTestId("kati-adjust-submit")!.click()
    await vi.waitFor(() => expect(commands).toHaveLength(1))

    const body = commands[0]!.body as { sens: string; points: number; motif: string; cle: string }
    expect(body).toMatchObject({ sens: "retrait", points: 400, motif: "Abus constaté par le support" })
    expect(body.cle).toMatch(/^[0-9a-f-]{36}$/)
    wrapper.unmount()
  })

  it("validates a commission under review and cancels another with a reason", async () => {
    const commands: Command[] = []
    const commission = (id: string, reference: string) => ({
      id,
      motifRevue: "Plafond mensuel de 200000 KATI dépassé",
      creeLe: "2026-10-17T10:00:00.000Z",
      commande: { reference, totalFermeTtc: 298000 },
      parrainage: { id: "p1", parrain: person("s1", "Bob"), filleul: person("c1", "Awa") },
    })
    cleanups = [
      registerEndpoint("/api/v1/marketplace/kati/administration/parrainages", {
        method: "GET",
        handler: () => ({ attributions: [commission("a1", "CM-111"), commission("a2", "CM-222")], parrainages: [] }),
      }),
      registerEndpoint("/api/v1/marketplace/kati/administration/commissions/a1/validation", {
        method: "POST",
        handler: record(commands, "POST", "a1/validation"),
      }),
      registerEndpoint("/api/v1/marketplace/kati/administration/commissions/a2/annulation", {
        method: "POST",
        handler: record(commands, "POST", "a2/annulation"),
      }),
    ]
    const wrapper = await mountSuspended(KatiSponsorships, { attachTo: document.body })
    await flushPromises()

    expect(wrapper.get("[data-testid='kati-commission-a1']").text()).toContain("Bob → Awa")
    await wrapper.get("[data-testid='kati-commission-a1'] [data-testid='kati-commission-validate']").trigger("click")
    await vi.waitFor(() => expect(commands).toHaveLength(1))

    const cancel = () => wrapper.get("[data-testid='kati-commission-a2'] [data-testid='kati-commission-cancel']")
    await vi.waitFor(() => expect(cancel().attributes("disabled")).toBeUndefined())
    await cancel().trigger("click")
    await vi.waitFor(() => expect(byTestId("kati-reason")).not.toBeNull())
    await type("kati-reason", "Comptes liés au parrain")
    byTestId("kati-reason-submit")!.click()
    await vi.waitFor(() => expect(commands).toHaveLength(2))

    expect(commands[1]).toEqual({ method: "POST", path: "a2/annulation", body: { motif: "Comptes liés au parrain" } })
    wrapper.unmount()
  })

  it("edits the rates as percentages, saves a draft in basis points and approves it after confirmation", async () => {
    const commands: Command[] = []
    cleanups = [
      registerEndpoint("/api/v1/marketplace/kati/politiques", {
        method: "GET",
        handler: () => [policy("d2", 2, "brouillon", { ...RULES, gainClientBps: 150 }), policy("a1", 1, "active")],
      }),
      registerEndpoint("/api/v1/marketplace/kati/politiques", {
        method: "POST",
        handler: record(commands, "POST", "draft"),
      }),
      registerEndpoint("/api/v1/marketplace/kati/politiques/d2/approbation", {
        method: "POST",
        handler: record(commands, "POST", "approve"),
      }),
    ]
    const wrapper = await mountSuspended(KatiPolicy, { attachTo: document.body })
    await flushPromises()

    expect(wrapper.get("[data-testid='kati-policy-active']").text()).toContain(
      "1% to the customer, 0.5% to the sponsor",
    )
    // The form starts from the waiting draft: 150 basis points read as 1.5 %.
    expect((byTestId("kati-rule-gainPercent") as HTMLInputElement).value).toBe("1.5")
    await type("kati-rule-commissionPercent", "0.75")
    await type("kati-rule-spendCapPercent", "40")
    byTestId("kati-policy-save")!.click()
    await vi.waitFor(() => expect(commands).toHaveLength(1))
    expect((commands[0]!.body as { regles: Record<string, unknown> }).regles).toMatchObject({
      gainClientBps: 150,
      commissionParrainBps: 75,
      depensePlafondBps: 4000,
      katiParFcfa: 10,
    })
    expect((commands[0]!.body as { regles: Record<string, unknown> }).regles).not.toHaveProperty("gainPercent")

    const approve = () => wrapper.get("[data-testid='kati-policy-approve']")
    await vi.waitFor(() => expect(approve().attributes("disabled")).toBeUndefined())
    await approve().trigger("click")
    await vi.waitFor(() => expect(byTestId("kati-policy-confirm-approve")).not.toBeNull())
    byTestId("kati-policy-confirm-approve")!.click()
    await vi.waitFor(() => expect(commands).toHaveLength(2))
    expect(commands[1]!.path).toBe("approve")
    wrapper.unmount()
  })
})

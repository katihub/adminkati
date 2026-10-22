import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody } from "h3"
import { afterEach, describe, expect, it } from "vitest"
import InstallmentPlansWorkspace from "@/components/operations/InstallmentPlansWorkspace.vue"

type Command = { method: string; path: string; body?: unknown }

const RULE = {
  categorieId: "c1",
  actif: true,
  dureeMaxJours: 180,
  apportInitialBps: 1000,
  versementMinFcfa: 5000,
  seuilReservationBps: 5000,
  prixMinFcfa: 0,
  mode: "libre",
  nombreTranches: null,
  inactiviteMaxJours: 30,
}
const RULES = [
  { id: "c1", nom: "Téléphonie", slug: "telephonie", saisie: true, regle: RULE },
  {
    id: "c2",
    nom: "Électroménager",
    slug: "electromenager",
    saisie: false,
    regle: { ...RULE, categorieId: "c2", actif: false },
  },
]
const PLAN = {
  reference: "PE-4F7KM3",
  statut: "reserve",
  quantite: 1,
  prixUnitaireFcfa: 65000,
  totalProduitsFcfa: 65000,
  montantVerseFcfa: 36500,
  resteFcfa: 28500,
  echeanceLe: "2027-04-20T10:00:00.000Z",
  stockReserve: 1,
  commande: null,
  fraisLivraisonFcfa: null,
  motifCloture: null,
  creeLe: "2026-10-22T08:00:00.000Z",
  boutique: { nom: "TechMall", slug: "techmall" },
  produit: { nom: "Téléphone X", slug: "telephone-x", image: null, offreId: "o1" },
  versements: [],
  client: { nom: "Awa", courriel: "awa@example.cm", telephone: "670000000" },
  rembourse: false,
}

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach(cleanup => cleanup())
  cleanups = []
  document.body.innerHTML = ""
  useNuxtApp().$queryClient.clear()
})

function api(commands: Command[], plans: unknown[] = [PLAN]) {
  const record =
    (method: string, path: string, answer: unknown = { ok: true }) =>
    async (event: Parameters<typeof readBody>[0]) => {
      commands.push({ method, path, body: await readBody(event) })
      return answer
    }
  cleanups = [
    registerEndpoint("/api/v1/marketplace/echelonnement/parametres", {
      method: "GET",
      handler: () => ({
        id: 1,
        actif: false,
        plansOuvertsMaxParClient: 3,
        modifieLe: "2026-10-22T08:00:00.000Z",
        modifiePar: null,
      }),
    }),
    registerEndpoint("/api/v1/marketplace/echelonnement/parametres", {
      method: "PATCH",
      handler: record("PATCH", "parametres"),
    }),
    registerEndpoint("/api/v1/marketplace/echelonnement/regles", { method: "GET", handler: () => RULES }),
    registerEndpoint("/api/v1/marketplace/echelonnement/regles/c2", {
      method: "PUT",
      handler: record("PUT", "regles/c2"),
    }),
    registerEndpoint("/api/v1/marketplace/echelonnement/admin/plans", { method: "GET", handler: () => plans }),
    registerEndpoint("/api/v1/marketplace/echelonnement/admin/plans/PE-4F7KM3/defaillance", {
      method: "POST",
      handler: record("POST", "defaillance", { ...PLAN, statut: "annule_defaillance" }),
    }),
    registerEndpoint("/api/v1/marketplace/echelonnement/admin/plans/PE-4F7KM3/remboursement", {
      method: "POST",
      handler: record("POST", "remboursement", { ...PLAN, statut: "annule_defaillance", rembourse: true }),
    }),
  ]
}

const byTestId = (id: string) => document.querySelector<HTMLElement>(`[data-testid='${id}']`)
async function type(id: string, value: string) {
  const input = byTestId(id) as HTMLInputElement
  input.value = value
  input.dispatchEvent(new Event("input"))
  await flushPromises()
}
async function click(id: string) {
  byTestId(id)!.click()
  await flushPromises()
}
async function mount() {
  await mountSuspended(InstallmentPlansWorkspace, { attachTo: document.body })
  await flushPromises()
}

describe("installment plans workspace", () => {
  it("switches the mode on and caps the open plans per customer", async () => {
    const commands: Command[] = []
    api(commands)
    await mount()
    ;(byTestId("installments-active") as HTMLInputElement).click()
    await type("installments-max-plans", "5")
    await click("installments-save-settings")
    expect(commands).toContainEqual({
      method: "PATCH",
      path: "parametres",
      body: { actif: true, plansOuvertsMaxParClient: 5 },
    })
  })

  it("saves a category rule with percentages converted to basis points", async () => {
    const commands: Command[] = []
    api(commands)
    await mount()
    await click("installment-rule-edit-c2")
    ;(byTestId("installment-rule-active") as HTMLInputElement).click()
    await type("installment-rule-deposit", "15")
    await type("installment-rule-threshold", "40")
    await click("installment-rule-save")
    expect(commands).toContainEqual({
      method: "PUT",
      path: "regles/c2",
      body: expect.objectContaining({
        actif: true,
        apportInitialBps: 1500,
        seuilReservationBps: 4000,
        mode: "libre",
        nombreTranches: null,
      }),
    })
  })

  it("refuses fixed instalments without a number of instalments", async () => {
    const commands: Command[] = []
    api(commands)
    await mount()
    await click("installment-rule-edit-c2")
    const mode = byTestId("installment-rule-mode") as HTMLSelectElement
    mode.value = "tranches_fixes"
    mode.dispatchEvent(new Event("change"))
    await flushPromises()
    await type("installment-rule-instalments", "")
    await click("installment-rule-save")
    expect(commands.some(command => command.method === "PUT")).toBe(false)
    expect(byTestId("installment-rule-error")?.textContent).toBeTruthy()
  })

  it("lists plans with their customer and cancels one for failure only with a reason", async () => {
    const commands: Command[] = []
    api(commands)
    await mount()
    expect(byTestId("installment-plan-PE-4F7KM3")?.textContent).toContain("awa@example.cm")
    await click("installment-plan-failure-PE-4F7KM3")
    await click("installment-plan-failure-confirm")
    expect(commands.some(command => command.path === "defaillance")).toBe(false)
    await type("installment-plan-failure-reason", "Boutique suspendue")
    await click("installment-plan-failure-confirm")
    expect(commands).toContainEqual({ method: "POST", path: "defaillance", body: { motif: "Boutique suspendue" } })
  })

  it("marks a failed plan refunded with the payout reference", async () => {
    const commands: Command[] = []
    api(commands, [{ ...PLAN, statut: "annule_defaillance" }])
    await mount()
    expect(byTestId("installment-plan-failure-PE-4F7KM3")).toBeNull()
    await click("installment-plan-refund-PE-4F7KM3")
    await type("installment-plan-refund-note", "Payout Fapshi TX-42")
    await click("installment-plan-refund-confirm")
    expect(commands).toContainEqual({ method: "POST", path: "remboursement", body: { note: "Payout Fapshi TX-42" } })
  })
})

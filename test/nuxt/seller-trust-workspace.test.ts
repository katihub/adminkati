import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import SellerTrustWorkspace from "@/components/operations/SellerTrustWorkspace.vue"

type Command = { path: string; body?: unknown }

const SELLER_ID = "11111111-1111-4111-8111-111111111111"
const SHOP_ID = "22222222-2222-4222-8222-222222222222"
const SANCTION = {
  id: "33333333-3333-4333-8333-333333333333",
  type: "suspension",
  statut: "contestee",
  motif: "Contrefaçons signalées par trois clients.",
  preuves: [],
  scoreRisqueCapture: null,
  commenceLe: "2026-10-20T08:00:00.000Z",
  termineLe: null,
  contesteeLe: "2026-10-21T08:00:00.000Z",
  motifContestation: "Les produits viennent du distributeur officiel.",
  arbitreeLe: null,
  motifArbitrage: null,
  leveeLe: null,
  motifLevee: null,
}

function seller(overrides: object = {}) {
  return {
    id: SELLER_ID,
    nomLegal: "Tech Douala SARL",
    statut: "actif",
    statutVerification: "approuve",
    motifStatut: null,
    boutiques: [{ id: SHOP_ID, nom: "Tech Douala", statut: "suspendue" }],
    reputations: [],
    sanctions: [],
    capacites: { sanctionner: true, arbitrer: false, rehabiliter: false },
    ...overrides,
  }
}

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach(cleanup => cleanup())
  cleanups = []
  document.body.innerHTML = ""
  useNuxtApp().$queryClient.clear()
})

function api(commands: Command[], detail = seller()) {
  const record = (path: string) => async (event: Parameters<typeof readBody>[0]) => {
    commands.push({ path, body: await readBody(event) })
    return { id: SANCTION.id }
  }
  cleanups = [
    registerEndpoint("/api/v1/marketplace/reputation/vendeurs", {
      method: "GET",
      handler: () => ({ total: 1, page: 1, taille: 40, pages: 1, elements: [detail] }),
    }),
    registerEndpoint(`/api/v1/marketplace/reputation/vendeurs/${SELLER_ID}`, { method: "GET", handler: () => detail }),
    registerEndpoint(`/api/v1/marketplace/reputation/vendeurs/${SELLER_ID}/sanctions`, {
      method: "POST",
      handler: record("sanctions"),
    }),
    registerEndpoint(`/api/v1/marketplace/reputation/sanctions/${SANCTION.id}/arbitrage`, {
      method: "POST",
      handler: record("arbitrage"),
    }),
    registerEndpoint(`/api/v1/marketplace/reputation/boutiques/${SHOP_ID}/catalogue/export`, {
      method: "GET",
      handler: () => {
        commands.push({ path: "export" })
        return "boutique;reference_vendeur\r\nTech Douala;AX-01\r\n"
      },
    }),
  ]
}

async function mountWorkspace() {
  const wrapper = await mountSuspended(SellerTrustWorkspace, {
    route: `/fr/operations?tab=seller-trust&vendeur=${SELLER_ID}`,
    attachTo: document.body,
  })
  await vi.waitFor(() => expect(wrapper.find('[data-testid="seller-sanction-open"]').exists()).toBe(true))
  return wrapper
}

function field<T extends HTMLElement>(testId: string): T {
  const element = document.querySelector<T>(`[data-testid="${testId}"]`)
  if (!element) throw new Error(`${testId} missing`)
  return element
}

function type(testId: string, value: string) {
  const element = field<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(testId)
  element.value = value
  element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? "change" : "input"))
}

describe("seller trust workspace", () => {
  it("sanctions a seller from the dialog, with the reason the backend requires", async () => {
    const commands: Command[] = []
    api(commands)
    const wrapper = await mountWorkspace()

    await wrapper.find('[data-testid="seller-sanction-open"]').trigger("click")
    await vi.waitFor(() => field("seller-sanction-form"))
    type("seller-sanction-type", "suspension")
    await flushPromises()
    expect(field("seller-sanction-warning").textContent).toContain("suspendues")

    type("seller-sanction-reason", "Trop court")
    await flushPromises()
    expect(field<HTMLButtonElement>("seller-sanction-submit").disabled).toBe(false)
    type("seller-sanction-reason", "Court")
    await flushPromises()
    expect(field<HTMLButtonElement>("seller-sanction-submit").disabled).toBe(true)

    type("seller-sanction-reason", "Contrefaçons signalées par trois clients.")
    await flushPromises()
    field<HTMLButtonElement>("seller-sanction-submit").click()
    await vi.waitFor(() => expect(commands).toHaveLength(1))
    expect(commands[0]).toEqual({
      path: "sanctions",
      body: { type: "suspension", motif: "Contrefaçons signalées par trois clients.", preuves: [] },
    })
  })

  it("arbitrates an appeal with the shared decision reason", async () => {
    const commands: Command[] = []
    api(
      commands,
      seller({ sanctions: [SANCTION], capacites: { sanctionner: true, arbitrer: true, rehabiliter: true } }),
    )
    const wrapper = await mountWorkspace()

    expect(wrapper.find('[data-testid="seller-contestation"]').text()).toContain("distributeur officiel")
    const confirm = wrapper.find('[data-testid="seller-arbitrate-confirm"]')
    expect(confirm.attributes("disabled")).toBeDefined()
    await wrapper.find('[data-testid="seller-decision-reason"]').setValue("Factures du distributeur non fournies.")
    await confirm.trigger("click")
    await vi.waitFor(() => expect(commands).toHaveLength(1))
    expect(commands[0]).toEqual({
      path: "arbitrage",
      body: { decision: "confirmee", motif: "Factures du distributeur non fournies." },
    })
  })

  it("exports the catalogue of a suspended shop", async () => {
    const commands: Command[] = []
    api(commands)
    const createObjectURL = vi.fn(() => "blob:catalogue")
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }))
    const wrapper = await mountWorkspace()

    const exportButton = wrapper.find(`[data-testid="seller-catalogue-export-${SHOP_ID}"]`)
    expect(wrapper.find('[data-testid="seller-catalogue-export"]').text()).toContain("Suspendue")
    await exportButton.trigger("click")
    await vi.waitFor(() => expect(createObjectURL).toHaveBeenCalled())
    expect(commands).toEqual([{ path: "export" }])
    vi.unstubAllGlobals()
  })
})

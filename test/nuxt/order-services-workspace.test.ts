import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import OrderServicesWorkspace from "@/components/operations/OrderServicesWorkspace.vue"

type Command = { method: string; path: string; body?: unknown }

const warranty = { mois: 12, unite: "annees", heritee: false, libelle: "1 an" }
const TREE = [
  {
    id: "c1",
    nom: "Électroménager",
    slug: "electromenager",
    parentId: null,
    garantieMinimaleMois: 12,
    uniteGarantie: "annees",
    ordre: 0,
    active: true,
    produits: 3,
    garantie: warranty,
    attributsVariante: [],
    installationActive: true,
    installationPrixFcfa: 15000,
    sousCategories: [
      {
        id: "s1",
        nom: "Climatiseurs",
        slug: "electromenager-climatiseurs",
        parentId: "c1",
        garantieMinimaleMois: null,
        uniteGarantie: "mois",
        ordre: 0,
        active: true,
        produits: 1,
        garantie: { ...warranty, heritee: true },
        attributsVariante: [],
        installationActive: false,
        installationPrixFcfa: null,
      },
    ],
  },
]

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach(cleanup => cleanup())
  cleanups = []
  document.body.innerHTML = ""
  useNuxtApp().$queryClient.clear()
})

function api(commands: Command[]) {
  const record = (path: string) => async (event: Parameters<typeof readBody>[0]) => {
    commands.push({ method: "PATCH", path, body: await readBody(event) })
    return { ok: true }
  }
  cleanups = [
    registerEndpoint("/api/v1/marketplace/services-commande/reglages", {
      method: "GET",
      handler: () => ({
        id: 1,
        assuranceActive: true,
        assuranceTauxBps: 500,
        modifieLe: "2026-10-17T08:00:00.000Z",
        modifiePar: null,
      }),
    }),
    registerEndpoint("/api/v1/marketplace/services-commande/reglages", {
      method: "PATCH",
      handler: record("reglages"),
    }),
    registerEndpoint("/api/v1/marketplace/categories/administration", { method: "GET", handler: () => TREE }),
    registerEndpoint("/api/v1/marketplace/categories/s1", { method: "PATCH", handler: record("s1") }),
    registerEndpoint("/api/v1/marketplace/categories/c1", { method: "PATCH", handler: record("c1") }),
  ]
}

const byTestId = (id: string) => document.querySelector<HTMLElement>(`[data-testid='${id}']`)
async function type(id: string, value: string) {
  const input = byTestId(id) as HTMLInputElement
  input.value = value
  input.dispatchEvent(new Event("input"))
  await flushPromises()
}

describe("order services workspace", () => {
  it("sets the insurance rate as a percentage, saved in basis points", async () => {
    const commands: Command[] = []
    api(commands)
    const wrapper = await mountSuspended(OrderServicesWorkspace, { attachTo: document.body })
    await flushPromises()

    expect((byTestId("insurance-rate") as HTMLInputElement).value).toBe("5")
    await type("insurance-rate", "4.5")
    byTestId("insurance-save")!.click()
    await vi.waitFor(() => expect(commands).toHaveLength(1))
    expect(commands[0]).toEqual({
      method: "PATCH",
      path: "reglages",
      body: { assuranceActive: true, assuranceTauxBps: 450 },
    })
    wrapper.unmount()
  })

  it("offers installation for a category at a price, and stops it for another", async () => {
    const commands: Command[] = []
    api(commands)
    const wrapper = await mountSuspended(OrderServicesWorkspace, { attachTo: document.body })
    await flushPromises()

    expect(wrapper.get("[data-testid='installation-electromenager']").text()).toMatch(/15,000/)
    const offer = () => wrapper.get("[data-testid='installation-on-electromenager-climatiseurs']")
    // Without a price, a category cannot be offered.
    expect(offer().attributes("disabled")).toBeDefined()
    await type("installation-price-electromenager-climatiseurs", "20000")
    await vi.waitFor(() => expect(offer().attributes("disabled")).toBeUndefined())
    await offer().trigger("click")
    await vi.waitFor(() => expect(commands).toHaveLength(1))

    const stop = () => wrapper.get("[data-testid='installation-off-electromenager']")
    await vi.waitFor(() => expect(stop().attributes("disabled")).toBeUndefined())
    await stop().trigger("click")
    await vi.waitFor(() => expect(commands).toHaveLength(2))

    expect(commands).toEqual([
      { method: "PATCH", path: "s1", body: { installationActive: true, installationPrixFcfa: 20000 } },
      { method: "PATCH", path: "c1", body: { installationActive: false, installationPrixFcfa: 15000 } },
    ])
    wrapper.unmount()
  })
})

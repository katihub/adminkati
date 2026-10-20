import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import DeliveryFeesWorkspace from "@/components/operations/DeliveryFeesWorkspace.vue"

const GRID = [
  {
    id: "f1",
    quartierId: "q-akwa",
    quartier: "Akwa",
    ville: "Douala",
    mode: "katihub",
    montantFcfa: 2000,
    gratuitDesFcfa: 100000,
    actif: true,
    creeLe: "2026-10-15T08:00:00.000Z",
    modifieLe: "2026-10-15T08:00:00.000Z",
  },
  {
    id: "f2",
    quartierId: "q-bastos",
    quartier: "Bastos",
    ville: "Yaoundé",
    mode: "vendeur",
    montantFcfa: 1500,
    gratuitDesFcfa: null,
    actif: false,
    creeLe: "2026-10-15T08:00:00.000Z",
    modifieLe: "2026-10-15T08:00:00.000Z",
  },
]
const LOCALITIES = [
  {
    id: "c-douala",
    nom: "Douala",
    active: true,
    ordre: 0,
    quartiers: [{ id: "q-akwa", nom: "Akwa", actif: true, ordre: 0 }],
  },
  {
    id: "c-yaounde",
    nom: "YaoundÃ©",
    active: true,
    ordre: 1,
    quartiers: [{ id: "q-bastos", nom: "Bastos", actif: true, ordre: 0 }],
  },
]

type Command = { method: string; path: string; body?: unknown }
let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach(cleanup => cleanup())
  cleanups = []
  document.body.innerHTML = ""
  useNuxtApp().$queryClient.clear()
})

function api(commands: Command[], grid = GRID) {
  const record = (method: string, path: string) => async (event: Parameters<typeof readBody>[0]) => {
    commands.push({ method, path, ...(method === "DELETE" ? {} : { body: await readBody(event) }) })
    return { ok: true }
  }
  cleanups = [
    registerEndpoint("/api/v1/marketplace/livraison/tarifs/administration", { method: "GET", handler: () => grid }),
    registerEndpoint("/api/v1/marketplace/localites/administration", { method: "GET", handler: () => LOCALITIES }),
    registerEndpoint("/api/v1/marketplace/livraison/tarifs", { method: "POST", handler: record("POST", "/") }),
    registerEndpoint("/api/v1/marketplace/livraison/tarifs/f1", { method: "PATCH", handler: record("PATCH", "f1") }),
    registerEndpoint("/api/v1/marketplace/livraison/tarifs/f2", { method: "PATCH", handler: record("PATCH", "f2") }),
  ]
}

const byTestId = (id: string) => document.querySelector<HTMLElement>(`[data-testid='${id}']`)
async function setInput(id: string, value: string) {
  const input = byTestId(id) as HTMLInputElement | HTMLSelectElement
  input.value = value
  input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? "change" : "input"))
  await flushPromises()
}

describe("delivery fees workspace", () => {
  it("shows neighborhood tariff groups instead of city-only groups", async () => {
    api(
      [],
      [
        {
          id: "q1-k",
          quartierId: "quartier-akwa",
          quartier: "Akwa",
          ville: "Douala",
          mode: "katihub",
          montantFcfa: 1200,
          gratuitDesFcfa: null,
          actif: true,
        },
        {
          id: "q1-v",
          quartierId: "quartier-akwa",
          quartier: "Akwa",
          ville: "Douala",
          mode: "vendeur",
          montantFcfa: 800,
          gratuitDesFcfa: 25000,
          actif: true,
        },
      ],
    )
    const wrapper = await mountSuspended(DeliveryFeesWorkspace, { attachTo: document.body })
    await flushPromises()

    expect(wrapper.text()).toContain("Douala")
    expect(wrapper.text()).toContain("Akwa")
    wrapper.unmount()
  })

  it("offers only the two domicile modes in the tariff form", async () => {
    api([])
    const wrapper = await mountSuspended(DeliveryFeesWorkspace, { attachTo: document.body })
    await wrapper.get("[data-testid='delivery-fee-create']").trigger("click")
    await flushPromises()
    const mode = byTestId("delivery-fee-mode") as HTMLSelectElement
    expect(Array.from(mode.options).map(option => option.value)).toEqual(["katihub", "vendeur"])
    wrapper.unmount()
  })

  it("groups fees under neighbourhoods with each mode's fee, threshold and state", async () => {
    api([])
    const wrapper = await mountSuspended(DeliveryFeesWorkspace, { attachTo: document.body })
    await flushPromises()

    const akwa = wrapper.get("[data-testid='delivery-district-Akwa']").text()
    expect(akwa).toContain("Kati Express")
    expect(akwa).toMatch(/2,000/)
    expect(akwa).toContain("free from")
    expect(wrapper.get("[data-testid='delivery-fee-f2']").text()).toContain("Inactive")
    wrapper.unmount()
  })

  it("creates a tariff, edits a fee and removes a threshold, and reactivates a tariff", async () => {
    const commands: Command[] = []
    api(commands)
    const wrapper = await mountSuspended(DeliveryFeesWorkspace, { attachTo: document.body })
    await flushPromises()

    await wrapper.get("[data-testid='delivery-fee-create']").trigger("click")
    await flushPromises()
    await setInput("delivery-fee-district", "q-akwa")
    await setInput("delivery-fee-mode", "katihub")
    await setInput("delivery-fee-amount", "2500")
    byTestId("delivery-fee-submit")!.click()
    await vi.waitFor(() => expect(commands).toHaveLength(1))

    const editButton = () =>
      wrapper
        .get("[data-testid='delivery-fee-f1']")
        .findAll("button")
        .find(button => button.text() === "Edit")!
    await vi.waitFor(() => expect(editButton().attributes("disabled")).toBeUndefined())
    await editButton().trigger("click")
    await flushPromises()
    await setInput("delivery-fee-amount", "2500")
    await setInput("delivery-fee-threshold", "")
    byTestId("delivery-fee-submit")!.click()
    await vi.waitFor(() => expect(commands).toHaveLength(2))

    const activate = () =>
      wrapper
        .get("[data-testid='delivery-fee-f2']")
        .findAll("button")
        .find(button => button.text() === "Activate")!
    await vi.waitFor(() => expect(activate().attributes("disabled")).toBeUndefined())
    await activate().trigger("click")
    await vi.waitFor(() => expect(commands).toHaveLength(3))

    expect(commands).toEqual([
      { method: "POST", path: "/", body: { quartierId: "q-akwa", mode: "katihub", montantFcfa: 2500 } },
      { method: "PATCH", path: "f1", body: { montantFcfa: 2500, gratuitDesFcfa: null } },
      { method: "PATCH", path: "f2", body: { actif: true } },
    ])
    wrapper.unmount()
  })
})

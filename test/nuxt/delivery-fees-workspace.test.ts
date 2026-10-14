import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import DeliveryFeesWorkspace from "@/components/operations/DeliveryFeesWorkspace.vue"

const GRID = [
  {
    id: "f1",
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
    ville: "Yaoundé",
    mode: "vendeur",
    montantFcfa: 1500,
    gratuitDesFcfa: null,
    actif: false,
    creeLe: "2026-10-15T08:00:00.000Z",
    modifieLe: "2026-10-15T08:00:00.000Z",
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

function api(commands: Command[]) {
  const record = (method: string, path: string) => async (event: Parameters<typeof readBody>[0]) => {
    commands.push({ method, path, ...(method === "DELETE" ? {} : { body: await readBody(event) }) })
    return { ok: true }
  }
  cleanups = [
    registerEndpoint("/api/v1/marketplace/livraison/tarifs/administration", { method: "GET", handler: () => GRID }),
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
  it("groups the grid by city with each mode's fee, threshold and state", async () => {
    api([])
    const wrapper = await mountSuspended(DeliveryFeesWorkspace, { attachTo: document.body })
    await flushPromises()

    const douala = wrapper.get("[data-testid='delivery-city-Douala']").text()
    expect(douala).toContain("KatiHub delivery")
    expect(douala).toMatch(/2,000/)
    expect(douala).toContain("free from")
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
    await setInput("delivery-fee-city", "Bafoussam")
    await setInput("delivery-fee-mode", "vendeur")
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
      { method: "POST", path: "/", body: { ville: "Bafoussam", mode: "vendeur", montantFcfa: 2500 } },
      { method: "PATCH", path: "f1", body: { montantFcfa: 2500, gratuitDesFcfa: null } },
      { method: "PATCH", path: "f2", body: { actif: true } },
    ])
    wrapper.unmount()
  })
})

import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { getQuery, readBody } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import ShopAgentsWorkspace from "@/components/operations/ShopAgentsWorkspace.vue"

const agent = (id: string, nom: string, extra: Record<string, unknown> = {}) => ({
  id,
  nom,
  telephone: "+237 677 00 00 01",
  actif: true,
  verifieLe: null,
  plafondEspecesFcfa: null,
  desactiveLe: null,
  creeLe: "2026-10-15T08:00:00.000Z",
  boutique: { id: "b1", nom: "TechMall", ville: "Douala" },
  ...extra,
})
const PENDING = [agent("a1", "Paul Comptoir"), agent("a2", "Awa Livreuse")]
const ALL = [
  ...PENDING,
  agent("a3", "Jean Verified", { verifieLe: "2026-10-14T08:00:00.000Z", plafondEspecesFcfa: 200000 }),
]

type Command = { path: string; body: unknown }
let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach(cleanup => cleanup())
  cleanups = []
  document.body.innerHTML = ""
  useNuxtApp().$queryClient.clear()
})

function api(commands: Command[]) {
  const record = (path: string) => async (event: Parameters<typeof readBody>[0]) => {
    commands.push({ path, body: await readBody(event) })
    return { ok: true }
  }
  cleanups = [
    registerEndpoint("/api/v1/marketplace/expeditions/agents-boutiques", {
      method: "GET",
      handler: event => (getQuery(event).statut === "tous" ? ALL : PENDING),
    }),
    registerEndpoint("/api/v1/marketplace/expeditions/agents/a1/verification", {
      method: "POST",
      handler: record("a1"),
    }),
    registerEndpoint("/api/v1/marketplace/expeditions/agents/a2/verification", {
      method: "POST",
      handler: record("a2"),
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

describe("shop agents workspace", () => {
  it("verifies an agent with a cash ceiling, and another with the city's ceiling", async () => {
    const commands: Command[] = []
    api(commands)
    const wrapper = await mountSuspended(ShopAgentsWorkspace, { attachTo: document.body })
    await flushPromises()

    expect(wrapper.get("[data-testid='shop-agent-a1']").text()).toContain("TechMall")
    expect(wrapper.get("[data-testid='shop-agent-a1']").text()).toContain("To verify")

    await type("shop-agent-ceiling-a1", "-5")
    expect(wrapper.text()).toContain("A ceiling is a whole amount")
    await type("shop-agent-ceiling-a1", "150000")
    byTestId("shop-agent-verify-a1")!.click()
    await vi.waitFor(() => expect(commands).toHaveLength(1))

    await vi.waitFor(() => expect(byTestId("shop-agent-verify-a2")!.hasAttribute("disabled")).toBe(false))
    byTestId("shop-agent-verify-a2")!.click()
    await vi.waitFor(() => expect(commands).toHaveLength(2))

    expect(commands).toEqual([
      { path: "a1", body: { plafondEspecesFcfa: 150000 } },
      { path: "a2", body: {} },
    ])
    wrapper.unmount()
  })

  it("lists every agent with its verification and ceiling", async () => {
    api([])
    const wrapper = await mountSuspended(ShopAgentsWorkspace, { attachTo: document.body })
    await flushPromises()
    const select = byTestId("shop-agents-filter") as HTMLSelectElement
    select.value = "tous"
    select.dispatchEvent(new Event("change"))
    await vi.waitFor(() => expect(byTestId("shop-agent-a3")).not.toBeNull())
    const verified = wrapper.get("[data-testid='shop-agent-a3']").text()
    expect(verified).toContain("Verified on")
    expect(verified).toMatch(/ceiling .*200,000/)
    expect(wrapper.find("[data-testid='shop-agent-verify-a3']").exists()).toBe(false)
    wrapper.unmount()
  })
})

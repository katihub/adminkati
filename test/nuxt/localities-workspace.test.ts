import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import LocalitiesWorkspace from "@/components/operations/LocalitiesWorkspace.vue"

const LISTS = [
  {
    id: "v1",
    nom: "Douala",
    active: true,
    ordre: 0,
    quartiers: [
      { id: "q1", nom: "Akwa", actif: true, ordre: 0 },
      { id: "q2", nom: "Bonanjo", actif: false, ordre: 1 },
    ],
  },
  { id: "v2", nom: "Yaoundé", active: false, ordre: 1, quartiers: [] },
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
    commands.push({ method, path, body: await readBody(event) })
    return { ajoutes: 1, ignores: 0 }
  }
  cleanups = [
    registerEndpoint("/api/v1/marketplace/localites/administration", { method: "GET", handler: () => LISTS }),
    registerEndpoint("/api/v1/marketplace/localites/villes", { method: "POST", handler: record("POST", "villes") }),
    registerEndpoint("/api/v1/marketplace/localites/villes/v2", { method: "PATCH", handler: record("PATCH", "v2") }),
    registerEndpoint("/api/v1/marketplace/localites/villes/v1/quartiers", {
      method: "POST",
      handler: record("POST", "v1/quartiers"),
    }),
    registerEndpoint("/api/v1/marketplace/localites/quartiers/q2", { method: "PATCH", handler: record("PATCH", "q2") }),
  ]
}

const byTestId = (id: string) => document.querySelector<HTMLElement>(`[data-testid='${id}']`)
async function type(id: string, value: string) {
  const input = byTestId(id) as HTMLInputElement | HTMLTextAreaElement
  input.value = value
  input.dispatchEvent(new Event("input"))
  await flushPromises()
}

describe("localities workspace", () => {
  it("lists each city with its shown and hidden districts", async () => {
    api([])
    const wrapper = await mountSuspended(LocalitiesWorkspace, { attachTo: document.body })
    await flushPromises()

    const douala = wrapper.get("[data-testid='locality-city-Douala']").text()
    expect(douala).toContain("1 of 2 district(s) shown")
    expect(byTestId("locality-district-Bonanjo")!.className).toContain("line-through")
    expect(wrapper.get("[data-testid='locality-city-Yaoundé']").text()).toContain("Hidden")
    wrapper.unmount()
  })

  it("adds a city, adds districts in bulk, shows a hidden district and a hidden city", async () => {
    const commands: Command[] = []
    api(commands)
    const wrapper = await mountSuspended(LocalitiesWorkspace, { attachTo: document.body })
    await flushPromises()

    // An existing city is refused before sending.
    await type("locality-new-city", "douala")
    expect(wrapper.text()).toContain("This city is already listed.")
    await type("locality-new-city", "Bafoussam")
    ;(byTestId("locality-new-city")!.closest("form") as HTMLFormElement).requestSubmit()
    await vi.waitFor(() => expect(commands).toHaveLength(1))

    await type("locality-districts-Douala", "Bonamoussadi, Makepe\n  Kotto  \nmakepe")
    byTestId("locality-add-Douala")!.click()
    await vi.waitFor(() => expect(commands).toHaveLength(2))

    await vi.waitFor(() => expect(byTestId("locality-district-Bonanjo")!.hasAttribute("disabled")).toBe(false))
    byTestId("locality-district-Bonanjo")!.click()
    await vi.waitFor(() => expect(commands).toHaveLength(3))

    await vi.waitFor(() => expect(byTestId("locality-toggle-Yaoundé")!.hasAttribute("disabled")).toBe(false))
    byTestId("locality-toggle-Yaoundé")!.click()
    await vi.waitFor(() => expect(commands).toHaveLength(4))

    expect(commands).toEqual([
      { method: "POST", path: "villes", body: { nom: "Bafoussam" } },
      { method: "POST", path: "v1/quartiers", body: { noms: ["Bonamoussadi", "makepe", "Kotto"] } },
      { method: "PATCH", path: "q2", body: { active: true } },
      { method: "PATCH", path: "v2", body: { active: true } },
    ])
    wrapper.unmount()
  })
})

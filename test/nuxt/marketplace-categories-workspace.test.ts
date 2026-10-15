import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import MarketplaceCategoriesWorkspace from "@/components/operations/MarketplaceCategoriesWorkspace.vue"

const warranty = (mois: number, unite: "mois" | "annees", heritee = false) => ({
  mois,
  unite,
  heritee,
  libelle: mois % 12 === 0 && mois ? (mois === 12 ? "1 an" : `${mois / 12} ans`) : `${mois} mois`,
})

const TREE = [
  {
    id: "c1",
    nom: "Électronique",
    slug: "electronique",
    parentId: null,
    garantieMinimaleMois: 12,
    uniteGarantie: "annees",
    ordre: 0,
    active: true,
    produits: 0,
    garantie: warranty(12, "annees"),
    attributsVariante: ["Capacité", "Couleur"],
    sousCategories: [
      {
        id: "s1",
        nom: "Téléphones",
        slug: "electronique-telephones",
        parentId: "c1",
        garantieMinimaleMois: null,
        uniteGarantie: "mois",
        ordre: 0,
        active: true,
        produits: 4,
        garantie: warranty(12, "annees", true),
        attributsVariante: [],
      },
    ],
  },
  {
    id: "c2",
    nom: "Mode & Style",
    slug: "mode-style",
    parentId: null,
    garantieMinimaleMois: 0,
    uniteGarantie: "mois",
    ordre: 1,
    active: false,
    produits: 0,
    garantie: warranty(0, "mois"),
    attributsVariante: [],
    sousCategories: [],
  },
]

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach(cleanup => cleanup())
  cleanups = []
  document.body.innerHTML = ""
  useNuxtApp().$queryClient.clear()
})

function api(commands: Array<{ method: string; path: string; body?: unknown }>) {
  const record = (method: string, path: string) => async (event: Parameters<typeof readBody>[0]) => {
    commands.push({ method, path, ...(method === "DELETE" ? {} : { body: await readBody(event) }) })
    return { ok: true }
  }
  cleanups = [
    registerEndpoint("/api/v1/marketplace/categories/administration", { method: "GET", handler: () => TREE }),
    registerEndpoint("/api/v1/marketplace/categories", { method: "POST", handler: record("POST", "/") }),
    registerEndpoint("/api/v1/marketplace/categories/s1", { method: "PATCH", handler: record("PATCH", "s1") }),
    registerEndpoint("/api/v1/marketplace/categories/c2", { method: "PATCH", handler: record("PATCH", "c2") }),
    registerEndpoint("/api/v1/marketplace/categories/c2", { method: "DELETE", handler: record("DELETE", "c2") }),
  ]
}

async function mount() {
  const wrapper = await mountSuspended(MarketplaceCategoriesWorkspace, { attachTo: document.body })
  await flushPromises()
  return wrapper
}

const byTestId = (id: string) => document.querySelector<HTMLElement>(`[data-testid='${id}']`)

async function setInput(id: string, value: string) {
  const input = byTestId(id) as HTMLInputElement | HTMLSelectElement
  input.value = value
  input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? "change" : "input"))
  await flushPromises()
}

describe("marketplace categories workspace", () => {
  it("shows the tree with each node's minimum warranty, inherited or its own", async () => {
    api([])
    const wrapper = await mount()

    const electronics = wrapper.get("[data-testid='category-electronique']")
    expect(electronics.text()).toContain("Électronique")
    expect(electronics.get("[data-testid='category-warranty']").text()).toBe("1 an")
    const phones = wrapper.get("[data-testid='category-electronique-telephones']")
    expect(phones.text()).toContain("inherited")
    expect(phones.text()).toContain("4 products")
    expect(wrapper.get("[data-testid='category-mode-style']").text()).toContain("Inactive")
    wrapper.unmount()
  })

  it("creates a category with a warranty in years", async () => {
    const commands: Array<{ method: string; path: string; body?: unknown }> = []
    api(commands)
    const wrapper = await mount()

    await wrapper.get("[data-testid='category-create']").trigger("click")
    await flushPromises()
    await setInput("category-name", "Électroménager")
    await setInput("category-warranty-value", "2")
    await setInput("category-warranty-unit", "annees")
    byTestId("category-submit")!.click()
    await flushPromises()

    expect(commands).toEqual([
      {
        method: "POST",
        path: "/",
        body: { nom: "Électroménager", ordre: 0, garantie: { valeur: 2, unite: "annees" } },
      },
    ])
    wrapper.unmount()
  })

  it("lets a sub-category stop inheriting and set its own warranty", async () => {
    const commands: Array<{ method: string; path: string; body?: unknown }> = []
    api(commands)
    const wrapper = await mount()

    const phones = wrapper.get("[data-testid='category-electronique-telephones']")
    await phones
      .findAll("button")
      .find(button => button.text() === "Edit")!
      .trigger("click")
    await flushPromises()
    expect((byTestId("category-inherit") as HTMLInputElement).checked).toBe(true)
    byTestId("category-inherit")!.click()
    await flushPromises()
    await setInput("category-warranty-value", "18")
    byTestId("category-submit")!.click()
    await flushPromises()

    expect(commands).toEqual([
      {
        method: "PATCH",
        path: "s1",
        body: { nom: "Téléphones", ordre: 0, garantie: { valeur: 18, unite: "mois" }, attributsVariante: [] },
      },
    ])
    wrapper.unmount()
  })

  it("shows each node's variant attributes and saves the ones a category proposes", async () => {
    const commands: Array<{ method: string; path: string; body?: unknown }> = []
    api(commands)
    const wrapper = await mount()

    expect(wrapper.get("[data-testid='category-electronique'] [data-testid='category-attributes']").text()).toBe(
      "Capacité, Couleur",
    )
    // A sub-category without attributes of its own uses its category's.
    expect(
      wrapper.get("[data-testid='category-electronique-telephones'] [data-testid='category-attributes']").text(),
    ).toBe("the category’s")

    await wrapper
      .get("[data-testid='category-electronique-telephones']")
      .findAll("button")
      .find(button => button.text() === "Edit")!
      .trigger("click")
    await flushPromises()
    await setInput("category-attributes-input", " Capacité,  RAM , capacité, ")
    byTestId("category-submit")!.click()
    await flushPromises()

    expect(commands).toEqual([
      {
        method: "PATCH",
        path: "s1",
        body: { nom: "Téléphones", ordre: 0, garantie: null, attributsVariante: ["Capacité", "RAM"] },
      },
    ])
    wrapper.unmount()
  })

  it("reactivates and deletes an empty category, but not one that holds products", async () => {
    const commands: Array<{ method: string; path: string; body?: unknown }> = []
    api(commands)
    const wrapper = await mount()

    const buttons = (slug: string) => wrapper.get(`[data-testid='category-${slug}']`).findAll("button")
    const phonesDelete = wrapper
      .get("[data-testid='category-electronique-telephones']")
      .findAll("button")
      .find(button => button.text() === "Delete")!
    expect(phonesDelete.attributes("disabled")).toBeDefined()

    await buttons("mode-style")
      .find(button => button.text() === "Activate")!
      .trigger("click")
    const deleteButton = () => buttons("mode-style").find(button => button.text() === "Delete")!
    // The buttons stay disabled until the tree has been refetched after the change.
    await vi.waitFor(() => expect(deleteButton().attributes("disabled")).toBeUndefined())
    await deleteButton().trigger("click")
    await vi.waitFor(() => expect(byTestId("category-delete-confirm")).not.toBeNull())
    const confirm = byTestId("category-delete-confirm")!
    ;[...confirm.querySelectorAll("button")].find(button => button.textContent?.trim() === "Delete")!.click()
    await flushPromises()

    expect(commands).toEqual([
      { method: "PATCH", path: "c2", body: { active: true } },
      { method: "DELETE", path: "c2" },
    ])
    wrapper.unmount()
  })
})

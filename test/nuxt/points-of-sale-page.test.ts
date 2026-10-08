import type { PointVenteAdmin } from "@/types/api/vitrine"
import type { Role } from "@/types/session"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody, setResponseStatus } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import ContentPage from "@/pages/content.vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

const ADMIN_PATH = "/api/v1/vitrine/administration/points-vente"

function makePoint(id: number, overrides: Partial<PointVenteAdmin> = {}): PointVenteAdmin {
  return {
    id,
    cle: `Comptoir-${id}`,
    libelle: `Comptoir ${id}`,
    ville: "Douala",
    quartier: `Quartier ${id}`,
    repere: `Repère ${id}`,
    telephones: [],
    carte: null,
    horaires: null,
    latitude: null,
    longitude: null,
    ordre: id * 10,
    active: true,
    creee_le: "2026-09-01T08:00:00.000Z",
    modifiee_le: "2026-09-01T08:00:00.000Z",
    modifiee_par: null,
    ...overrides,
  }
}

function seed(roles: Role[], points: PointVenteAdmin[]) {
  const queryClient = useNuxtApp().$queryClient
  queryClient.setQueryData(["v1", "moi"], {
    userId: "u1",
    membreId: "m1",
    nom: "Admin",
    courriel: "admin@example.com",
    roles,
  })
  queryClient.setQueryData(apiQueryKeys.pointsOfSale.all, points)
}

/** Keeps the list endpoint answering with the seeded rows, so invalidations refetch something real. */
function serveList(points: () => PointVenteAdmin[]) {
  return registerEndpoint(ADMIN_PATH, { method: "GET", handler: () => points() })
}

/** The points of sale are a tab of the content workspace; `query` adds the panel's own state. */
async function mountAt(query = "") {
  const wrapper = await mountSuspended(ContentPage, {
    route: `/content?tab=points-de-vente${query}`,
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

function body(selector: string) {
  return document.body.querySelector<HTMLElement>(`[data-testid='${selector}']`)
}

const COMPLETE: Partial<PointVenteAdmin> = {
  telephones: [
    { numero: "+237 695 54 90 58", whatsapp: true },
    { numero: "+237 233 42 10 10", whatsapp: false },
  ],
  carte: "https://maps.app.goo.gl/wcGa724CqpHSeLze6",
  horaires: "8 h–19 h",
  latitude: 4.02,
  longitude: 9.69,
}

function rows(wrapper: Awaited<ReturnType<typeof mountAt>>) {
  return wrapper.findAll("[data-testid='points-of-sale-row']")
}

/** The search is the toolbar's permanent `q` chip, a plain text input. */
async function search(wrapper: Awaited<ReturnType<typeof mountAt>>, text: string) {
  await wrapper.get("[data-testid='points-of-sale-toolbar'] input").setValue(text)
}

describe("points of sale table", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("lists the counters in storefront order, one column per published detail, with + Add where one is missing", async () => {
    const points = [
      makePoint(1, { libelle: "Akwa Paris Dancing", ...COMPLETE }),
      makePoint(2, {
        libelle: "Mvog-Mbi",
        ville: "Yaoundé",
        telephones: [{ numero: "+237 699 80 11 42", whatsapp: true }],
        horaires: "Tous les jours",
        carte: COMPLETE.carte,
      }),
      makePoint(3, { libelle: "Bastos", ville: "Yaoundé", active: false, ...COMPLETE }),
    ]
    seed(["direction"], points)
    const cleanup = serveList(() => points)

    const wrapper = await mountAt()
    const [akwa, mvog] = rows(wrapper)

    expect(rows(wrapper).map(row => row.get("[data-testid='points-of-sale-row-name']").text())).toEqual([
      "Akwa Paris Dancing",
      "Mvog-Mbi",
      "Bastos",
    ])
    expect(akwa!.text()).toContain("+237 695 54 90 58")
    expect(akwa!.text()).toContain("+1")
    expect(akwa!.findAll("[data-testid^='points-of-sale-row-add-']")).toHaveLength(0)
    expect(
      mvog!.findAll("[data-testid^='points-of-sale-row-add-']").map(button => button.attributes("data-testid")),
    ).toEqual(["points-of-sale-row-add-coordonnees"])

    cleanup()
    wrapper.unmount()
  })

  it("opens the counter at the section a + Add cell names", async () => {
    const points = [makePoint(1, { ...COMPLETE, horaires: null })]
    seed(["direction"], points)
    const cleanup = serveList(() => points)

    const wrapper = await mountAt()
    await wrapper.get("[data-testid='points-of-sale-row-add-horaires']").trigger("click")

    await vi.waitFor(() =>
      expect(useRouter().currentRoute.value.query).toEqual({ tab: "points-de-vente", point: "1", section: "contact" }),
    )

    cleanup()
    wrapper.unmount()
  })

  it("narrows the table to a search, says so when nothing matches, and clears back to every counter", async () => {
    const points = [
      makePoint(1, { libelle: "Akwa", ...COMPLETE }),
      makePoint(2, { libelle: "Mvog-Mbi", ville: "Yaoundé" }),
    ]
    seed(["direction"], points)
    const cleanup = serveList(() => points)

    const wrapper = await mountAt()
    await search(wrapper, "yaounde")
    expect(rows(wrapper).map(row => row.attributes("data-id"))).toEqual(["2"])

    await search(wrapper, "Kribi")
    expect(rows(wrapper)).toHaveLength(0)
    const noResults = wrapper.get("[data-testid='points-of-sale-table'] [data-testid='taxonomy-flat-table-no-results']")
    expect(noResults.text()).toContain("No point of sale matches these filters.")

    await noResults.get("button").trigger("click")
    expect(rows(wrapper).map(row => row.attributes("data-id"))).toEqual(["1", "2"])

    cleanup()
    wrapper.unmount()
  })

  it("offers the first counter from an empty table", async () => {
    seed(["direction"], [])
    const cleanup = serveList(() => [])

    const wrapper = await mountAt()
    await wrapper.get("[data-testid='taxonomy-flat-table-empty'] button").trigger("click")

    await vi.waitFor(() => expect(useRouter().currentRoute.value.query).toEqual({ tab: "points-de-vente", new: "1" }))

    cleanup()
    wrapper.unmount()
  })

  it("shows the error card with a retry when the list cannot load", async () => {
    let fail = true
    const cleanup = registerEndpoint(ADMIN_PATH, {
      method: "GET",
      handler: event => {
        if (!fail) return [makePoint(1)]
        setResponseStatus(event, 503)
        return { message: "indisponible" }
      },
    })
    const queryClient = useNuxtApp().$queryClient
    queryClient.setDefaultOptions({ queries: { retry: false } })
    queryClient.setQueryData(["v1", "moi"], {
      userId: "u1",
      membreId: "m1",
      nom: "Admin",
      courriel: "admin@example.com",
      roles: ["direction"],
    })

    const wrapper = await mountAt()
    await vi.waitFor(() => expect(wrapper.find("[data-testid='api-error-card']").exists()).toBe(true))

    fail = false
    await wrapper.get("[data-testid='api-error-card'] button").trigger("click")
    await vi.waitFor(() => expect(rows(wrapper)).toHaveLength(1))

    queryClient.setDefaultOptions({ queries: { retry: 1 } })
    cleanup()
    wrapper.unmount()
  })
})

describe("arranging the storefront order", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  function serveReorder(onIds: (ids: number[]) => void) {
    return registerEndpoint(`${ADMIN_PATH}/reordonner`, {
      method: "POST",
      handler: async event => {
        const { ids } = await readBody<{ ids: number[] }>(event)
        onIds(ids)
        return ids.map(id => makePoint(id))
      },
    })
  }

  it("moves counters in arrange mode, keeps focus on the moved row, and saves the whole order once", async () => {
    let points = [makePoint(1), makePoint(2), makePoint(3)]
    seed(["direction"], points)
    const listCleanup = serveList(() => points)
    const sent: number[][] = []
    const reorderCleanup = serveReorder(ids => {
      sent.push(ids)
      points = ids.map(id => points.find(point => point.id === id)!)
    })

    const wrapper = await mountAt()
    expect(wrapper.find("[data-testid='points-of-sale-row-move-down']").exists()).toBe(false)
    await wrapper.get("[data-testid='points-of-sale-arrange-button']").trigger("click")

    expect(wrapper.findAll("[data-testid='points-of-sale-row-move-up']")[0]!.attributes("disabled")).toBeDefined()
    expect(wrapper.findAll("[data-testid='points-of-sale-row-move-down']")[2]!.attributes("disabled")).toBeDefined()

    const firstDown = wrapper.findAll("[data-testid='points-of-sale-row-move-down']")[0]!
    expect(firstDown.attributes("aria-label")).toBe("Move Comptoir 1 down")
    ;(firstDown.element as HTMLButtonElement).focus()
    await firstDown.trigger("click")

    await vi.waitFor(() => {
      expect(rows(wrapper).map(row => row.attributes("data-id"))).toEqual(["2", "1", "3"])
      expect(document.activeElement?.getAttribute("data-move")).toBe("1:1")
    })
    expect(wrapper.get("[data-testid='points-of-sale-arrange-announcement']").text()).toBe(
      "Comptoir 1 is now in position 2 of 3.",
    )
    expect(sent).toEqual([])

    await wrapper.get("[data-testid='points-of-sale-arrange-save']").trigger("click")
    await vi.waitFor(() => expect(wrapper.find("[data-testid='points-of-sale-arrange-bar']").exists()).toBe(false))
    expect(sent).toEqual([[2, 1, 3]])
    expect(rows(wrapper).map(row => row.attributes("data-id"))).toEqual(["2", "1", "3"])

    listCleanup()
    reorderCleanup()
    wrapper.unmount()
  })

  it("hands focus to the opposite arrow when a counter reaches the end of the list", async () => {
    const points = [makePoint(1), makePoint(2)]
    seed(["direction"], points)
    const cleanup = serveList(() => points)

    const wrapper = await mountAt()
    await wrapper.get("[data-testid='points-of-sale-arrange-button']").trigger("click")
    await wrapper.findAll("[data-testid='points-of-sale-row-move-down']")[0]!.trigger("click")

    await vi.waitFor(() => expect(document.activeElement?.getAttribute("data-move")).toBe("1:-1"))

    cleanup()
    wrapper.unmount()
  })

  it("puts the server order back on cancel, without a request", async () => {
    const points = [makePoint(1), makePoint(2)]
    seed(["direction"], points)
    const listCleanup = serveList(() => points)
    const sent: number[][] = []
    const reorderCleanup = serveReorder(ids => sent.push(ids))

    const wrapper = await mountAt()
    await wrapper.get("[data-testid='points-of-sale-arrange-button']").trigger("click")
    await wrapper.findAll("[data-testid='points-of-sale-row-move-down']")[0]!.trigger("click")
    await wrapper.get("[data-testid='points-of-sale-arrange-cancel']").trigger("click")

    expect(rows(wrapper).map(row => row.attributes("data-id"))).toEqual(["1", "2"])
    expect(wrapper.find("[data-testid='points-of-sale-arrange-bar']").exists()).toBe(false)
    expect(sent).toEqual([])

    listCleanup()
    reorderCleanup()
    wrapper.unmount()
  })

  it("puts the order back when the backend refuses it", async () => {
    const points = [makePoint(1), makePoint(2)]
    seed(["direction"], points)
    const listCleanup = serveList(() => points)
    const reorderCleanup = registerEndpoint(`${ADMIN_PATH}/reordonner`, {
      method: "POST",
      handler: event => {
        setResponseStatus(event, 400)
        return { message: "L’ordre doit porter les 3 points de vente, 2 reçus." }
      },
    })

    const wrapper = await mountAt()
    await wrapper.get("[data-testid='points-of-sale-arrange-button']").trigger("click")
    await wrapper.findAll("[data-testid='points-of-sale-row-move-down']")[0]!.trigger("click")
    await wrapper.get("[data-testid='points-of-sale-arrange-save']").trigger("click")

    await vi.waitFor(() => {
      expect(wrapper.find("[data-testid='points-of-sale-arrange-bar']").exists()).toBe(false)
      expect(rows(wrapper).map(row => row.attributes("data-id"))).toEqual(["1", "2"])
    })

    listCleanup()
    reorderCleanup()
    wrapper.unmount()
  })

  it("offers arranging only over the whole, unfiltered list", async () => {
    const points = [makePoint(1), makePoint(2)]
    seed(["direction"], points)
    const cleanup = serveList(() => points)

    const wrapper = await mountAt()
    await search(wrapper, "Comptoir 1")

    expect(wrapper.find("[data-testid='points-of-sale-arrange-button']").exists()).toBe(false)

    cleanup()
    wrapper.unmount()
  })
})

describe("points of sale for comptoir", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("reads the table and a counter's details without any way to change them", async () => {
    const point = makePoint(1, { telephones: [{ numero: "+237 695 54 90 58", whatsapp: true }] })
    seed(["comptoir"], [point])
    const cleanup = serveList(() => [point])

    const wrapper = await mountAt(`&point=${point.id}`)

    expect(rows(wrapper)).toHaveLength(1)
    expect(body("points-of-sale-panel-view")).not.toBeNull()
    expect(body("points-of-sale-panel-whatsapp")?.getAttribute("href")).toBe("https://wa.me/237695549058")
    for (const writeAffordance of [
      "points-of-sale-toolbar-add",
      "points-of-sale-arrange-button",
      "points-of-sale-row-add-horaires",
      "points-of-sale-row-active",
      "points-of-sale-row-menu",
      "points-of-sale-panel-actions",
      "points-of-sale-panel-edit-button",
      "points-of-sale-panel-delete-trigger",
      "points-of-sale-panel-active-toggle",
    ])
      expect(body(writeAffordance), writeAffordance).toBeNull()

    cleanup()
    wrapper.unmount()
  })
  it("never opens the creation form from the URL", async () => {
    seed(["comptoir"], [makePoint(1)])
    const cleanup = serveList(() => [makePoint(1)])

    const wrapper = await mountAt("&new=1")

    expect(body("points-of-sale-form")).toBeNull()

    cleanup()
    wrapper.unmount()
  })
})

/** Opened from the keyboard, as reka allows; its content is teleported under `document.body`. */
async function openRowMenu(wrapper: Awaited<ReturnType<typeof mountAt>>, index: number) {
  await rows(wrapper)[index]!.get("[data-testid='points-of-sale-row-menu']").trigger("keydown", { key: "Enter" })
  await flushPromises()
}

async function pickMenuItem(item: string) {
  await vi.waitFor(() => expect(body(`points-of-sale-menu-${item}`)).not.toBeNull())
  body(`points-of-sale-menu-${item}`)!.click()
  await flushPromises()
}

describe("row actions", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  function servePatch(id: number, onBody: (patch: unknown) => void) {
    return registerEndpoint(`${ADMIN_PATH}/${id}`, {
      method: "PATCH",
      handler: async event => {
        const patch = await readBody(event)
        onBody(patch)
        return makePoint(id, patch)
      },
    })
  }

  it("hides a counter from the storefront with its row switch", async () => {
    const points = [makePoint(1)]
    seed(["direction"], points)
    const listCleanup = serveList(() => points)
    const patches: unknown[] = []
    const patchCleanup = servePatch(1, patch => patches.push(patch))

    const wrapper = await mountAt()
    await rows(wrapper)[0]!.get("[data-testid='points-of-sale-row-active']").trigger("click")

    await vi.waitFor(() => expect(patches).toEqual([{ active: false }]))

    listCleanup()
    patchCleanup()
    wrapper.unmount()
  })

  it("puts a deactivated counter back on the storefront from its menu", async () => {
    const points = [makePoint(1, { active: false })]
    seed(["direction"], points)
    const listCleanup = serveList(() => points)
    const patches: unknown[] = []
    const patchCleanup = servePatch(1, patch => patches.push(patch))

    const wrapper = await mountAt()
    await openRowMenu(wrapper, 0)
    await pickMenuItem("toggle")

    await vi.waitFor(() => expect(patches).toEqual([{ active: true }]))

    listCleanup()
    patchCleanup()
    wrapper.unmount()
  })
})

describe("deleting a point of sale", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  const refusal =
    "« Akwa » est encore le comptoir de 12 profils et 48 commandes. Désactivez-le plutôt : il disparaît de la vitrine immédiatement et l’historique reste lisible."

  it("shows the backend's refusal in the dialog and offers to deactivate instead", async () => {
    let point = makePoint(1, { cle: "Akwa", quartier: "Akwa" })
    seed(["direction"], [point])
    const listCleanup = serveList(() => [point])
    const deleteCleanup = registerEndpoint(`${ADMIN_PATH}/${point.id}`, {
      method: "DELETE",
      handler: event => {
        setResponseStatus(event, 409)
        return { message: refusal, cle: "Akwa", references: { profils: 12, adresses: 0, commandes: 48 } }
      },
    })
    let patchBody: unknown
    const patchCleanup = registerEndpoint(`${ADMIN_PATH}/${point.id}`, {
      method: "PATCH",
      handler: async event => {
        patchBody = await readBody(event)
        point = { ...point, active: false }
        return point
      },
    })

    const wrapper = await mountAt()
    await openRowMenu(wrapper, 0)
    await pickMenuItem("delete")
    body("points-of-sale-delete-confirm")!.click()

    await vi.waitFor(() => expect(body("points-of-sale-delete-error")?.textContent?.trim()).toBe(refusal))
    expect(body("points-of-sale-delete-confirm")).toBeNull()

    body("points-of-sale-deactivate-instead")!.click()
    await vi.waitFor(() => expect(body("points-of-sale-delete-dialog")).toBeNull())
    expect(patchBody).toEqual({ active: false })

    listCleanup()
    deleteCleanup()
    patchCleanup()
    wrapper.unmount()
  })

  it("empties the table once a counter nothing refers to is deleted", async () => {
    let points = [makePoint(1)]
    seed(["direction"], points)
    const listCleanup = serveList(() => points)
    const deleteCleanup = registerEndpoint(`${ADMIN_PATH}/1`, {
      method: "DELETE",
      handler: () => {
        points = []
        return { id: 1, supprime: true }
      },
    })

    const wrapper = await mountAt()
    await openRowMenu(wrapper, 0)
    await pickMenuItem("delete")
    body("points-of-sale-delete-confirm")!.click()

    await vi.waitFor(() => expect(body("taxonomy-flat-table-empty")).not.toBeNull())
    expect(body("points-of-sale-delete-dialog")).toBeNull()

    listCleanup()
    deleteCleanup()
    wrapper.unmount()
  })
})

function typeInto(testid: string, value: string) {
  const input = body(testid) as HTMLInputElement | HTMLTextAreaElement
  input.value = value
  input.dispatchEvent(new Event("input", { bubbles: true }))
}

function activeWizardStep() {
  return ["identity", "contact-info", "review"].find(
    step => body(`points-of-sale-wizard-step-${step}`)?.getAttribute("aria-current") === "step",
  )
}

async function advanceWizard() {
  body("points-of-sale-wizard-next")!.click()
  await flushPromises()
}

describe("creating a point of sale", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("requires a valid identity before advancing to contact information", async () => {
    seed(["direction"], [])
    const cleanup = serveList(() => [])

    const wrapper = await mountAt("&new=1")
    expect(activeWizardStep()).toBe("identity")

    await advanceWizard()
    expect(activeWizardStep()).toBe("identity")
    expect(body("points-of-sale-form-ville")?.getAttribute("aria-invalid")).toBe("true")

    for (const [field, value] of Object.entries({
      libelle: "Essai",
      ville: "Douala",
      quartier: "Akwa",
      repere: "Face au rond-point",
    }))
      typeInto(`points-of-sale-form-${field}`, value)
    await flushPromises()
    await advanceWizard()

    expect(activeWizardStep()).toBe("contact-info")

    cleanup()
    wrapper.unmount()
  })

  it("keeps invalid supplied contact information out of review", async () => {
    seed(["direction"], [])
    const cleanup = serveList(() => [])

    const wrapper = await mountAt("&new=1")
    for (const [field, value] of Object.entries({
      libelle: "Essai",
      ville: "Douala",
      quartier: "Akwa",
      repere: "Face au rond-point",
    }))
      typeInto(`points-of-sale-form-${field}`, value)
    await flushPromises()
    await advanceWizard()
    typeInto("points-of-sale-form-carte", "not a maps link")
    await flushPromises()
    await advanceWizard()

    expect(activeWizardStep()).toBe("contact-info")
    expect(body("points-of-sale-form-carte")?.getAttribute("aria-invalid")).toBe("true")

    cleanup()
    wrapper.unmount()
  })

  it("reviews the entered values and returns to the requested step for correction", async () => {
    seed(["direction"], [])
    const cleanup = serveList(() => [])

    const wrapper = await mountAt("&new=1")
    for (const [field, value] of Object.entries({
      libelle: "Essai",
      ville: "Douala",
      quartier: "Akwa",
      repere: "Face au rond-point",
    }))
      typeInto(`points-of-sale-form-${field}`, value)
    await flushPromises()
    await advanceWizard()
    typeInto("points-of-sale-form-horaires", "Tous les jours, 9 h–20 h")
    await flushPromises()
    await advanceWizard()

    expect(activeWizardStep()).toBe("review")
    expect(body("points-of-sale-wizard-review")?.textContent).toContain("Tous les jours, 9 h–20 h")
    body("points-of-sale-wizard-review-edit-identity")!.click()
    await flushPromises()
    expect(activeWizardStep()).toBe("identity")
    expect((body("points-of-sale-form-libelle") as HTMLInputElement).value).toBe("Essai")

    cleanup()
    wrapper.unmount()
  })

  it("creates the counter only after review, closes it, and lists the new row", async () => {
    seed(["direction"], [])
    let points: PointVenteAdmin[] = []
    const listCleanup = serveList(() => points)
    let created: unknown
    const createCleanup = registerEndpoint(ADMIN_PATH, {
      method: "POST",
      handler: async event => {
        created = await readBody(event)
        points = [makePoint(7, created as Partial<PointVenteAdmin>)]
        return points[0]
      },
    })

    const wrapper = await mountAt("&new=1")
    expect(body("points-of-sale-drawer-title")?.textContent?.trim()).toBe("New point of sale")
    expect(body("points-of-sale-drawer-status")?.textContent?.trim()).toBe(
      "Not saved yet · will join the storefront at position 1",
    )
    for (const [field, value] of Object.entries({
      libelle: "Essai",
      ville: "Douala",
      quartier: "Akwa",
      repere: "Face au rond-point",
    }))
      typeInto(`points-of-sale-form-${field}`, value)
    await flushPromises()
    await advanceWizard()
    await advanceWizard()
    expect(activeWizardStep()).toBe("review")
    body("points-of-sale-wizard-submit")!.click()

    await vi.waitFor(() => expect(useRouter().currentRoute.value.query).toEqual({ tab: "points-de-vente" }))
    expect(created).toMatchObject({ cle: "Essai", libelle: "Essai", active: true })
    await vi.waitFor(() => expect(rows(wrapper).map(row => row.attributes("data-id"))).toEqual(["7"]))

    listCleanup()
    createCleanup()
    wrapper.unmount()
  })

  it("shows identity refusals before progressing and makes no request", async () => {
    seed(["direction"], [])
    const listCleanup = serveList(() => [])
    let requests = 0
    const createCleanup = registerEndpoint(ADMIN_PATH, {
      method: "POST",
      handler: () => {
        requests += 1
        return makePoint(1)
      },
    })

    const wrapper = await mountAt("&new=1")
    typeInto("points-of-sale-form-libelle", "Essai")
    await flushPromises()
    await advanceWizard()

    expect(requests).toBe(0)
    expect(activeWizardStep()).toBe("identity")
    expect(body("points-of-sale-form-ville")?.getAttribute("aria-invalid")).toBe("true")
    expect(body("points-of-sale-form-quartier")?.getAttribute("aria-invalid")).toBe("true")
    expect(body("points-of-sale-form-repere")?.getAttribute("aria-invalid")).toBe("true")

    listCleanup()
    createCleanup()
    wrapper.unmount()
  })
})

describe("editing a point of sale", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("opens straight into the form, counts the changes, and patches only them", async () => {
    let point = makePoint(1, { horaires: "8 h–19 h" })
    seed(["direction"], [point])
    const listCleanup = serveList(() => [point])
    let patchBody: unknown
    const patchCleanup = registerEndpoint(`${ADMIN_PATH}/1`, {
      method: "PATCH",
      handler: async event => {
        patchBody = await readBody(event)
        point = { ...point, ...(patchBody as Partial<PointVenteAdmin>) }
        return point
      },
    })

    const wrapper = await mountAt("&point=1")
    expect((body("points-of-sale-form-cle") as HTMLInputElement).readOnly).toBe(true)
    await advanceWizard()
    typeInto("points-of-sale-form-horaires", "Tous les jours, 9 h–20 h")
    await flushPromises()
    await advanceWizard()

    expect(body("points-of-sale-drawer-status")?.textContent?.trim()).toBe("1 unsaved change")
    expect(activeWizardStep()).toBe("review")
    body("points-of-sale-wizard-submit")!.click()

    await vi.waitFor(() => expect(useRouter().currentRoute.value.query).toEqual({ tab: "points-de-vente" }))
    expect(patchBody).toEqual({ horaires: "Tous les jours, 9 h–20 h" })

    listCleanup()
    patchCleanup()
    wrapper.unmount()
  })

  it("asks before closing over unsaved changes, and keeps them on Keep editing", async () => {
    const point = makePoint(1)
    seed(["direction"], [point])
    const cleanup = serveList(() => [point])

    const wrapper = await mountAt("&point=1")
    typeInto("points-of-sale-form-repere", "Derrière la station")
    await flushPromises()
    await advanceWizard()
    body("points-of-sale-drawer-cancel")!.click()
    await flushPromises()

    await vi.waitFor(() => expect(body("points-of-sale-leave-dialog")).not.toBeNull())
    body("points-of-sale-leave-keep")!.click()
    await vi.waitFor(() => expect(body("points-of-sale-leave-dialog")).toBeNull())
    body("points-of-sale-wizard-back")!.click()
    await flushPromises()
    expect((body("points-of-sale-form-repere") as HTMLTextAreaElement).value).toBe("Derrière la station")

    body("points-of-sale-drawer-cancel")!.click()
    await vi.waitFor(() => expect(body("points-of-sale-leave-discard")).not.toBeNull())
    body("points-of-sale-leave-discard")!.click()
    await vi.waitFor(() => expect(useRouter().currentRoute.value.query).toEqual({ tab: "points-de-vente" }))

    cleanup()
    wrapper.unmount()
  })

  it("opens Contact information at the map fields for a map deep link", async () => {
    const point = makePoint(1)
    seed(["direction"], [point])
    const cleanup = serveList(() => [point])

    const wrapper = await mountAt("&point=1&section=map")

    await vi.waitFor(() => expect(activeWizardStep()).toBe("contact-info"))
    expect(document.activeElement?.getAttribute("data-testid")).toBe("points-of-sale-form-carte")

    cleanup()
    wrapper.unmount()
  })

  it("says so when the counter in the link no longer exists", async () => {
    seed(["direction"], [makePoint(1)])
    const cleanup = serveList(() => [makePoint(1)])

    const wrapper = await mountAt("&point=99")

    expect(body("points-of-sale-drawer-not-found")).not.toBeNull()

    cleanup()
    wrapper.unmount()
  })
})

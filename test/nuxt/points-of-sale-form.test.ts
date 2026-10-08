import type { PointVenteAdmin } from "@/types/api/vitrine"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody, setResponseStatus } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import PointsOfSaleForm from "@/components/points-of-sale/Form.vue"

const ADMIN_PATH = "/api/v1/vitrine/administration/points-vente"

const LANDLINE_WHATSAPP = "WhatsApp only opens on a mobile (+237 6XX XX XX XX): turn WhatsApp off for a landline."

const akwa: PointVenteAdmin = {
  id: 1,
  cle: "Akwa",
  libelle: "Akwa Pharmacie des hôpitaux",
  ville: "Douala",
  quartier: "Akwa",
  repere: "À côté de la Pharmacie des hôpitaux",
  telephones: [{ numero: "+237 674 44 97 08", whatsapp: true }],
  carte: "https://maps.app.goo.gl/cHcg4skdMf96WpJb9",
  horaires: null,
  latitude: null,
  longitude: null,
  ordre: 10,
  active: true,
  creee_le: "2026-09-01T08:00:00.000Z",
  modifiee_le: "2026-09-01T08:00:00.000Z",
  modifiee_par: null,
}

const REQUIRED = { libelle: "Essai Kotto", ville: "Douala", quartier: "Kotto", repere: "Face au rond-point" }

async function mountForm(point: PointVenteAdmin | null) {
  const wrapper = await mountSuspended(PointsOfSaleForm, {
    props: { point, formId: "point-form" },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

type FormWrapper = Awaited<ReturnType<typeof mountForm>>

async function fill(wrapper: FormWrapper, values: Record<string, string>) {
  for (const [field, value] of Object.entries(values))
    await wrapper.get(`[data-testid='points-of-sale-form-${field}']`).setValue(value)
}

/** The number row at `index`, found fresh each time because adding a row re-renders the list. */
function row(wrapper: FormWrapper, index: number) {
  return wrapper.findAll("[data-testid='points-of-sale-form-telephone-row']")[index]!
}

async function submit(wrapper: FormWrapper) {
  await wrapper.get("[data-testid='points-of-sale-form']").trigger("submit")
  await flushPromises()
}

async function next(wrapper: FormWrapper) {
  await wrapper.get("[data-testid='points-of-sale-wizard-next']").trigger("click")
  await flushPromises()
}

async function goToContact(wrapper: FormWrapper, values = REQUIRED) {
  await fill(wrapper, values)
  await next(wrapper)
}

async function goToReview(wrapper: FormWrapper, values = REQUIRED) {
  await goToContact(wrapper, values)
  await next(wrapper)
}

function errors(wrapper: FormWrapper) {
  return wrapper.findAll("[data-testid='points-of-sale-form-error']").map(error => error.text())
}

function paste(input: HTMLInputElement, text: string) {
  const event = new Event("paste", { bubbles: true, cancelable: true }) as ClipboardEvent
  Object.defineProperty(event, "clipboardData", { value: { getData: () => text } })
  input.dispatchEvent(event)
}

describe("point of sale form", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("refuses a landline flagged WhatsApp and half a coordinate before any request", async () => {
    let requests = 0
    const cleanup = registerEndpoint(ADMIN_PATH, {
      method: "POST",
      handler: () => {
        requests += 1
        return akwa
      },
    })

    const wrapper = await mountForm(null)
    await goToContact(wrapper)
    await fill(wrapper, { telephone: "233 42 10 10", latitude: "4.05" })
    await next(wrapper)

    expect(requests).toBe(0)
    expect(row(wrapper, 0).text()).toContain(LANDLINE_WHATSAPP)

    // Turning WhatsApp off is the fix, and it takes the refusal away before any new submit.
    await row(wrapper, 0).get("[data-testid='points-of-sale-form-telephone-whatsapp']").trigger("click")
    expect(errors(wrapper)).not.toContain(LANDLINE_WHATSAPP)
    await next(wrapper)

    expect(requests).toBe(0)
    expect(errors(wrapper)).toEqual(["Latitude and longitude go together."])

    cleanup()
    wrapper.unmount()
  })

  it("derives the key from the label, and creates the counter with the numbers and link as they will be stored", async () => {
    let observedBody: unknown
    const cleanup = registerEndpoint(ADMIN_PATH, {
      method: "POST",
      handler: async event => {
        observedBody = await readBody(event)
        return { ...akwa, id: 9 }
      },
    })

    const wrapper = await mountForm(null)
    await fill(wrapper, { ...REQUIRED, libelle: "Akwa Paris Dancing", quartier: "Akwa" })

    expect((wrapper.get("[data-testid='points-of-sale-form-cle']").element as HTMLInputElement).value).toBe(
      "Akwa-Paris-Dancing",
    )
    await next(wrapper)
    await fill(wrapper, { telephone: "678730810" })
    expect(row(wrapper, 0).text()).toContain("Will be saved as: +237 678 73 08 10")
    expect(row(wrapper, 0).get("[data-testid='points-of-sale-form-whatsapp-preview']").attributes("href")).toBe(
      "https://wa.me/237678730810",
    )

    await wrapper.get("[data-testid='points-of-sale-form-telephone-add']").trigger("click")
    await flushPromises()
    expect(document.activeElement).toBe(row(wrapper, 1).get("[data-testid='points-of-sale-form-telephone']").element)
    await row(wrapper, 1).get("[data-testid='points-of-sale-form-telephone']").setValue("233421010")
    await row(wrapper, 1).get("[data-testid='points-of-sale-form-telephone-whatsapp']").trigger("click")
    expect(row(wrapper, 1).find("[data-testid='points-of-sale-form-whatsapp-preview']").exists()).toBe(false)

    await fill(wrapper, { carte: " https://maps.app.goo.gl/wcGa724CqpHSeLze6?g_st=ic " })
    expect(wrapper.get("[data-testid='points-of-sale-form-carte-preview']").attributes("href")).toBe(
      "https://maps.app.goo.gl/wcGa724CqpHSeLze6",
    )

    paste(wrapper.get("[data-testid='points-of-sale-form-latitude']").element as HTMLInputElement, "4.051056, 9.767868")
    await flushPromises()
    expect(wrapper.get("[data-testid='points-of-sale-form-map-preview']").attributes("href")).toBe(
      "https://www.google.com/maps/search/?api=1&query=4.051056,9.767868",
    )

    await next(wrapper)
    await submit(wrapper)

    expect(observedBody).toEqual({
      cle: "Akwa-Paris-Dancing",
      libelle: "Akwa Paris Dancing",
      ville: "Douala",
      quartier: "Akwa",
      repere: "Face au rond-point",
      telephones: [
        { numero: "+237 678 73 08 10", whatsapp: true },
        { numero: "+237 233 42 10 10", whatsapp: false },
      ],
      carte: "https://maps.app.goo.gl/wcGa724CqpHSeLze6",
      latitude: 4.051056,
      longitude: 9.767868,
      active: true,
    })

    cleanup()
    wrapper.unmount()
  })

  it("flags the same number typed twice on its second row, and a map link from another site", async () => {
    const wrapper = await mountForm(null)
    await goToContact(wrapper)
    await fill(wrapper, { telephone: "695549058", carte: "https://example.cm/maps/akwa" })
    await wrapper.get("[data-testid='points-of-sale-form-telephone-add']").trigger("click")
    await row(wrapper, 1).get("[data-testid='points-of-sale-form-telephone']").setValue("+237 695 54 90 58")
    await next(wrapper)

    expect(row(wrapper, 0).find("[data-testid='points-of-sale-form-error']").exists()).toBe(false)
    expect(row(wrapper, 1).text()).toContain("This number is already higher up in the list.")
    expect(errors(wrapper)).toContain(
      "Paste a Google Maps link over https, for example https://maps.app.goo.gl/… (the “Share” button in Google Maps).",
    )

    // Removing the duplicate clears its refusal, and focus stays in the list rather than on the page.
    await row(wrapper, 1).get("[data-testid='points-of-sale-form-telephone-remove']").trigger("click")
    await flushPromises()
    expect(wrapper.findAll("[data-testid='points-of-sale-form-telephone-row']")).toHaveLength(1)
    expect(document.activeElement).toBe(row(wrapper, 0).get("[data-testid='points-of-sale-form-telephone']").element)
    expect(errors(wrapper)).not.toContain("This number is already higher up in the list.")

    wrapper.unmount()
  })

  it("stops offering a new row at six numbers, as the backend allows", async () => {
    const wrapper = await mountForm(null)
    await goToContact(wrapper)
    for (let count = 1; count < 6; count++)
      await wrapper.get("[data-testid='points-of-sale-form-telephone-add']").trigger("click")

    expect(wrapper.findAll("[data-testid='points-of-sale-form-telephone-row']")).toHaveLength(6)
    expect(wrapper.find("[data-testid='points-of-sale-form-telephone-add']").exists()).toBe(false)

    wrapper.unmount()
  })

  it("quotes the backend's bounds when a field is too short or too long", async () => {
    const wrapper = await mountForm(null)
    await fill(wrapper, { ...REQUIRED, libelle: "A", ville: "D", repere: "Ici" })
    await next(wrapper)

    expect(errors(wrapper)).toEqual([
      "Between 2 and 80 characters.",
      "Between 2 and 60 characters.",
      "Between 4 and 240 characters.",
    ])

    await fill(wrapper, { libelle: "Akwa", ville: "Douala", repere: "Face au rond-point" })
    await next(wrapper)
    await fill(wrapper, { horaires: "x".repeat(201) })
    await next(wrapper)

    expect(errors(wrapper)).toEqual(["Between 2 and 200 characters."])

    wrapper.unmount()
  })

  it("stops following the label once the operator types a key", async () => {
    const wrapper = await mountForm(null)
    await fill(wrapper, { cle: "Akwa-2" })
    await fill(wrapper, { libelle: "Akwa Paris Dancing" })

    expect((wrapper.get("[data-testid='points-of-sale-form-cle']").element as HTMLInputElement).value).toBe("Akwa-2")

    wrapper.unmount()
  })

  it("shows the backend's refusal of a label already used in the city as written", async () => {
    const refusal = "Le comptoir « Akwa » s’appelle déjà « Akwa Pharmacie des hôpitaux » à Douala."
    const cleanup = registerEndpoint(ADMIN_PATH, {
      method: "POST",
      handler: event => {
        setResponseStatus(event, 409)
        return { message: refusal }
      },
    })

    const wrapper = await mountForm(null)
    await goToReview(wrapper, { ...REQUIRED, libelle: "Akwa Pharmacie des hôpitaux" })
    await submit(wrapper)

    await vi.waitFor(() => expect(wrapper.vm.submitError).toBe(refusal))

    cleanup()
    wrapper.unmount()
  })

  it("keeps the key read-only in edit, and patches only what changed", async () => {
    let observedBody: unknown
    const cleanup = registerEndpoint(`${ADMIN_PATH}/${akwa.id}`, {
      method: "PATCH",
      handler: async event => {
        observedBody = await readBody(event)
        return akwa
      },
    })

    const wrapper = await mountForm(akwa)

    expect(wrapper.get("[data-testid='points-of-sale-form-cle']").attributes("readonly")).toBeDefined()
    await next(wrapper)
    expect((wrapper.get("[data-testid='points-of-sale-form-telephone']").element as HTMLInputElement).value).toBe(
      "+237 674 44 97 08",
    )
    expect(wrapper.vm.saveDisabled).toBe(true)

    await fill(wrapper, { horaires: "Lundi–samedi, 8 h–19 h", longitude: "9,767868", latitude: "4.051056" })
    expect(wrapper.vm.saveDisabled).toBe(false)
    await next(wrapper)
    await submit(wrapper)

    expect(observedBody).toEqual({ horaires: "Lundi–samedi, 8 h–19 h", latitude: 4.051056, longitude: 9.767868 })

    cleanup()
    wrapper.unmount()
  })

  it("adds a second number, puts it first, and saves the whole list in that order", async () => {
    let observedBody: unknown
    const cleanup = registerEndpoint(`${ADMIN_PATH}/${akwa.id}`, {
      method: "PATCH",
      handler: async event => {
        observedBody = await readBody(event)
        return akwa
      },
    })

    const wrapper = await mountForm(akwa)
    await next(wrapper)
    const moveUp = (index: number) => row(wrapper, index).get("[data-testid='points-of-sale-form-telephone-move-up']")
    const moveDown = (index: number) =>
      row(wrapper, index).get("[data-testid='points-of-sale-form-telephone-move-down']")

    // A single number has nowhere to go.
    expect(moveUp(0).attributes("disabled")).toBeDefined()
    expect(moveDown(0).attributes("disabled")).toBeDefined()

    await wrapper.get("[data-testid='points-of-sale-form-telephone-add']").trigger("click")
    await flushPromises()
    // A new number answers on WhatsApp until told otherwise: every number the shop uses does.
    expect(
      (
        row(wrapper, 1).get("[data-testid='points-of-sale-form-telephone-whatsapp']").element as HTMLButtonElement
      ).getAttribute("aria-checked"),
    ).toBe("true")
    await row(wrapper, 1).get("[data-testid='points-of-sale-form-telephone']").setValue("694 93 39 71")

    ;(moveUp(1).element as HTMLButtonElement).focus()
    await moveUp(1).trigger("click")
    await flushPromises()

    const numbers = () =>
      wrapper
        .findAll("[data-testid='points-of-sale-form-telephone']")
        .map(input => (input.element as HTMLInputElement).value)
    expect(numbers()).toEqual(["694 93 39 71", "+237 674 44 97 08"])
    // Now first, its "up" arrow is disabled: focus moves to its "down" arrow rather than to the page.
    expect(document.activeElement).toBe(moveDown(0).element)
    expect(wrapper.get("[data-testid='points-of-sale-form-telephone-announcement']").text()).toBe(
      "The number is now in position 1 of 2.",
    )

    await next(wrapper)
    await submit(wrapper)

    expect(observedBody).toEqual({
      telephones: [
        { numero: "+237 694 93 39 71", whatsapp: true },
        { numero: "+237 674 44 97 08", whatsapp: true },
      ],
    })

    cleanup()
    wrapper.unmount()
  })
})

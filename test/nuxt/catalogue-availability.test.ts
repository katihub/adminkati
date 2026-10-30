import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import AvailabilityDialog from "@/components/catalogue/AvailabilityDialog/AvailabilityDialog.vue"

const OFFER = "aabb6652-fba0-49fb-984e-dde2dbe65876"
const PRODUCT = "ccdd6652-fba0-49fb-984e-dde2dbe65876"
let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach(cleanup => cleanup())
  cleanups = []
  document.body.innerHTML = ""
})

const field = <T extends HTMLElement>(id: string) => document.querySelector<T>(`[data-testid='${id}']`)!
async function type(id: string, value: string) {
  const element = field<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(id)
  element.value = value
  element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? "change" : "input"))
  await flushPromises()
}

function capture(path: string) {
  const bodies: unknown[] = []
  cleanups.push(
    registerEndpoint(path, {
      method: "PATCH",
      handler: async event => {
        bodies.push(await readBody(event))
        return { offres: 2, statutStock: "rupture", sansPieces: [] }
      },
    }),
  )
  return bodies
}

describe("catalogue availability dialog", () => {
  it("puts a tracked offer back in stock with its quantity and a reason", async () => {
    const bodies = capture(`/api/v1/marketplace/administration/offres/${OFFER}/disponibilite`)
    await mountSuspended(AvailabilityDialog, {
      attachTo: document.body,
      props: {
        open: true,
        target: {
          kind: "offer",
          id: OFFER,
          statutStock: "rupture",
          suiviStock: true,
          stock: { quantite: 2, quantiteReservee: 2 },
        },
      },
    })

    await type("availability-status", "en_stock")
    await type("availability-reason", "Réception de 10 pièces")
    // 2 units, all reserved: the form refuses to put it back on sale as it is.
    expect(field<HTMLButtonElement>("availability-save").disabled).toBe(true)
    await type("availability-quantity", "12")
    field<HTMLButtonElement>("availability-save").click()

    await vi.waitFor(() =>
      expect(bodies).toEqual([{ statutStock: "en_stock", quantite: 12, motif: "Réception de 10 pièces" }]),
    )
  })

  it("sets every offer of a product at once, without a quantity", async () => {
    const bodies = capture(`/api/v1/marketplace/administration/produits/${PRODUCT}/disponibilite`)
    await mountSuspended(AvailabilityDialog, {
      attachTo: document.body,
      props: { open: true, target: { kind: "product", id: PRODUCT } },
    })

    expect(document.querySelector("[data-testid='availability-quantity']")).toBeNull()
    await type("availability-status", "reapprovisionnement")
    await type("availability-reason", "Arrivage la semaine prochaine")
    field<HTMLButtonElement>("availability-save").click()

    await vi.waitFor(() =>
      expect(bodies).toEqual([{ statutStock: "reapprovisionnement", motif: "Arrivage la semaine prochaine" }]),
    )
  })
})

import type { TelephonePointVente } from "../../app/types/api/vitrine"
import { describe, expect, it } from "vitest"
import { pointVenteSchema } from "../../app/schemas/point-vente"

type Row = TelephonePointVente

const valid = {
  cle: "Akwa",
  libelle: "Akwa Pharmacie des hôpitaux",
  ville: "Douala",
  quartier: "Akwa",
  repere: "Rue Drouot, à côté de la Pharmacie des hôpitaux",
  telephones: [] as Row[],
  carte: "",
  horaires: "",
  latitude: "",
  longitude: "",
  active: true,
}

function messagesFor(input: Partial<typeof valid>, path: string) {
  const result = pointVenteSchema.safeParse({ ...valid, ...input })
  return (result.error?.issues ?? []).filter(issue => issue.path.join(".") === path).map(issue => issue.message)
}

describe("point of sale schema", () => {
  it("reads blank optional fields as not published", () => {
    expect(pointVenteSchema.parse(valid)).toMatchObject({
      telephones: [],
      carte: null,
      horaires: null,
      latitude: null,
      longitude: null,
    })
  })

  it("applies the backend's lengths to the text fields", () => {
    expect(messagesFor({ cle: "   " }, "cle")).toEqual(["validation.required"])
    expect(messagesFor({ libelle: "" }, "libelle")).toEqual(["validation.required"])
    expect(messagesFor({ cle: "x".repeat(41) }, "cle")).toEqual(["pointsOfSale.form.errors.length"])
    expect(messagesFor({ libelle: "A" }, "libelle")).toEqual(["pointsOfSale.form.errors.length"])
    expect(messagesFor({ libelle: "x".repeat(81) }, "libelle")).toEqual(["pointsOfSale.form.errors.length"])
    expect(messagesFor({ ville: "D" }, "ville")).toEqual(["pointsOfSale.form.errors.length"])
    expect(messagesFor({ repere: "Ici" }, "repere")).toEqual(["pointsOfSale.form.errors.length"])
    expect(messagesFor({ repere: "x".repeat(241) }, "repere")).toEqual(["pointsOfSale.form.errors.length"])
    expect(messagesFor({ horaires: "8" }, "horaires")).toEqual(["pointsOfSale.form.errors.length"])
    expect(messagesFor({ repere: "Ici !" }, "repere")).toEqual([])
  })

  it("stores each number in the backend's form, in the order typed, and drops empty rows", () => {
    const telephones = [
      { numero: "678730810", whatsapp: true },
      { numero: "  ", whatsapp: true },
      { numero: "+237 233 42 10 10", whatsapp: false },
    ]

    expect(pointVenteSchema.parse({ ...valid, telephones }).telephones).toEqual([
      { numero: "+237 678 73 08 10", whatsapp: true },
      { numero: "+237 233 42 10 10", whatsapp: false },
    ])
  })

  it("refuses, on its own row, a foreign number, a landline flagged WhatsApp and a repeated number", () => {
    const telephones = [
      { numero: "695549058", whatsapp: true },
      { numero: "+33 6 12 34 56 78", whatsapp: false },
      { numero: "233421010", whatsapp: true },
      { numero: "+237 695 54 90 58", whatsapp: false },
    ]

    expect(messagesFor({ telephones }, "telephones.0")).toEqual([])
    expect(messagesFor({ telephones }, "telephones.1")).toEqual(["pointsOfSale.form.errors.telephone"])
    expect(messagesFor({ telephones }, "telephones.2")).toEqual(["pointsOfSale.form.errors.whatsapp"])
    expect(messagesFor({ telephones }, "telephones.3")).toEqual(["pointsOfSale.form.errors.duplicateTelephone"])
  })

  it("accepts a Google Maps link and stores a short one without its tracking", () => {
    expect(
      pointVenteSchema.parse({ ...valid, carte: " https://maps.app.goo.gl/wcGa724CqpHSeLze6?g_st=ic " }).carte,
    ).toBe("https://maps.app.goo.gl/wcGa724CqpHSeLze6")
    expect(pointVenteSchema.parse({ ...valid, carte: "https://www.google.com/maps?q=4.05,9.70" }).carte).toBe(
      "https://www.google.com/maps?q=4.05,9.70",
    )
  })

  it("refuses a map link the backend would refuse", () => {
    for (const carte of [
      "http://maps.app.goo.gl/wcGa724CqpHSeLze6",
      "https://example.cm/maps/akwa",
      "https://maps.google.com@example.cm/akwa",
      "https://www.google.com/search?q=akwa",
      "https://maps.app.goo.gl/",
      "Carrefour Paris Dancing",
    ])
      expect(messagesFor({ carte }, "carte"), carte).toEqual(["pointsOfSale.form.errors.carte"])
  })

  it("refuses a coordinate out of range or unreadable", () => {
    expect(messagesFor({ latitude: "91", longitude: "9" }, "latitude")).toEqual(["pointsOfSale.form.errors.coordinate"])
    expect(messagesFor({ latitude: "4", longitude: "181" }, "longitude")).toEqual([
      "pointsOfSale.form.errors.coordinate",
    ])
    expect(messagesFor({ latitude: "nord", longitude: "9" }, "latitude")).toEqual([
      "pointsOfSale.form.errors.coordinate",
    ])
  })

  it("puts the pair error on the half that is still empty", () => {
    expect(messagesFor({ latitude: "4.05" }, "longitude")).toEqual(["pointsOfSale.form.errors.coordinatesPair"])
    expect(messagesFor({ longitude: "9.76" }, "latitude")).toEqual(["pointsOfSale.form.errors.coordinatesPair"])
  })
})

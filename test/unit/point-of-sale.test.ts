import type { PointVenteAdmin } from "../../app/types/api/vitrine"
import { describe, expect, it } from "vitest"
import { pointVenteContactInfoSchema, pointVenteIdentitySchema, pointVenteSchema } from "../../app/schemas/point-vente"
import {
  buildCreerPointVente,
  buildModifierPointVente,
  cleFromLibelle,
  customerDetailsText,
  filterPoints,
  isMapLink,
  mapLink,
  missingContactFields,
  moveId,
  moveItem,
  normalizeMapLink,
  sortByIds,
  splitCoordinatePair,
  toPointVenteForm,
} from "../../app/utils/point-of-sale"

function makePoint(overrides: Partial<PointVenteAdmin> = {}): PointVenteAdmin {
  return {
    id: 1,
    cle: "Akwa",
    libelle: "Akwa Pharmacie des hôpitaux",
    ville: "Douala",
    quartier: "Akwa",
    repere: "Rue Drouot, à côté de la Pharmacie des hôpitaux",
    telephones: [],
    carte: null,
    horaires: null,
    latitude: null,
    longitude: null,
    ordre: 0,
    active: true,
    creee_le: "2026-09-01T08:00:00.000Z",
    modifiee_le: "2026-09-01T08:00:00.000Z",
    modifiee_par: null,
    ...overrides,
  }
}

function parse(point: PointVenteAdmin, edits: Partial<ReturnType<typeof toPointVenteForm>> = {}) {
  return pointVenteSchema.parse({ ...toPointVenteForm(point), ...edits })
}

const TWO_NUMBERS = [
  { numero: "+237 674 44 97 08", whatsapp: true },
  { numero: "+237 694 93 39 71", whatsapp: true },
]

describe("point of sale completeness", () => {
  it("names every storefront detail still missing from a migrated counter", () => {
    expect(missingContactFields(makePoint())).toEqual(["telephones", "whatsapp", "horaires", "carte", "coordonnees"])
  })

  it("asks for a WhatsApp number when every number is a landline", () => {
    expect(missingContactFields(makePoint({ telephones: [{ numero: "+237 233 42 10 10", whatsapp: false }] }))).toEqual(
      ["whatsapp", "horaires", "carte", "coordonnees"],
    )
  })

  it("has nothing left to complete once every detail is filled", () => {
    expect(
      missingContactFields(
        makePoint({
          telephones: TWO_NUMBERS,
          carte: "https://maps.app.goo.gl/cHcg4skdMf96WpJb9",
          horaires: "Lundi–samedi, 8 h–19 h",
          latitude: 4.051056,
          longitude: 9.767868,
        }),
      ),
    ).toEqual([])
  })
})

describe("point of sale reordering", () => {
  it("moves one id a step and keeps every other id, because the backend refuses a partial order", () => {
    expect(moveId([1, 2, 3], 1, 1)).toEqual([2, 1, 3])
    expect(moveId([1, 2, 3], 3, -1)).toEqual([1, 3, 2])
  })

  it("refuses to move past either end or an unknown id", () => {
    expect(moveId([1, 2, 3], 1, -1)).toBeNull()
    expect(moveId([1, 2, 3], 3, 1)).toBeNull()
    expect(moveId([1, 2, 3], 9, 1)).toBeNull()
  })

  it("moves a number within the list without touching the original", () => {
    const numbers = [
      { numero: "a", whatsapp: true },
      { numero: "b", whatsapp: false },
      { numero: "c", whatsapp: true },
    ]

    expect(moveItem(numbers, 2, -1)?.map(row => row.numero)).toEqual(["a", "c", "b"])
    expect(moveItem(numbers, 0, -1)).toBeNull()
    expect(moveItem(numbers, 2, 1)).toBeNull()
    expect(numbers.map(row => row.numero)).toEqual(["a", "b", "c"])
  })

  it("sorts rows into the requested id order without dropping any", () => {
    const rows = [makePoint({ id: 1 }), makePoint({ id: 2 }), makePoint({ id: 3 })]

    expect(sortByIds(rows, [3, 1, 2]).map(row => row.id)).toEqual([3, 1, 2])
  })
})

describe("coordinates and map link", () => {
  it("splits what Google Maps copies into latitude and longitude", () => {
    expect(splitCoordinatePair("4.051056, 9.767868")).toEqual(["4.051056", "9.767868"])
    expect(splitCoordinatePair(" -3.8667 11.5167 ")).toEqual(["-3.8667", "11.5167"])
    expect(splitCoordinatePair("4.051056;9.767868")).toEqual(["4.051056", "9.767868"])
  })

  it("leaves a single value alone, including one typed with a French decimal comma", () => {
    expect(splitCoordinatePair("4.051056")).toBeNull()
    expect(splitCoordinatePair("4,051056")).toBeNull()
    expect(splitCoordinatePair("Akwa, Douala")).toBeNull()
  })

  it("links to the pin on Google Maps", () => {
    expect(mapLink(4.051056, 9.767868)).toBe("https://www.google.com/maps/search/?api=1&query=4.051056,9.767868")
  })

  it("strips the tracking of a short link only, as the backend does before storing it", () => {
    expect(normalizeMapLink(" https://maps.app.goo.gl/wcGa724CqpHSeLze6?g_st=ic ")).toBe(
      "https://maps.app.goo.gl/wcGa724CqpHSeLze6",
    )
    expect(normalizeMapLink("https://www.google.com/maps?q=4.05,9.70")).toBe("https://www.google.com/maps?q=4.05,9.70")
  })

  it("accepts the Google Maps hosts the backend accepts, and only under /maps/ on google.com", () => {
    expect(isMapLink("https://maps.app.goo.gl/wcGa724CqpHSeLze6")).toBe(true)
    expect(isMapLink("https://maps.google.com/?q=Akwa")).toBe(true)
    expect(isMapLink("https://www.google.com/maps/place/Akwa")).toBe(true)
    expect(isMapLink("https://www.google.com/search?q=akwa")).toBe(false)
    expect(isMapLink("https://maps.google.com@example.cm/akwa")).toBe(false)
    expect(isMapLink("https://maps.app.goo.gl/?g_st=ic")).toBe(false)
  })
})

describe("point of sale key", () => {
  it("joins the words of the label the way existing keys are spelled, within the column's length", () => {
    expect(cleFromLibelle("  Akwa  Paris Dancing ", 40)).toBe("Akwa-Paris-Dancing")
    expect(cleFromLibelle("Akwa Paris Dancing", 4)).toBe("Akwa")
  })
})

describe("point of sale payloads", () => {
  it("leaves blank optional fields out of a creation instead of sending nulls", () => {
    const values = pointVenteSchema.parse({
      ...toPointVenteForm(null),
      cle: "Essai",
      libelle: "Essai",
      ville: "Douala",
      quartier: "Essai",
      repere: "Face au rond-point",
    })

    expect(buildCreerPointVente(values)).toEqual({
      cle: "Essai",
      libelle: "Essai",
      ville: "Douala",
      quartier: "Essai",
      repere: "Face au rond-point",
      active: true,
    })
  })

  it("sends the numbers in the stored form and order, the map link, and the coordinates as numbers", () => {
    const values = pointVenteSchema.parse({
      ...toPointVenteForm(null),
      cle: "Essai",
      libelle: "Essai",
      ville: "Douala",
      quartier: "Essai",
      repere: "Face au rond-point",
      telephones: [
        { numero: "6 95 54 90 58", whatsapp: true },
        { numero: "233421010", whatsapp: false },
      ],
      carte: "https://maps.app.goo.gl/wcGa724CqpHSeLze6?g_st=ic",
      latitude: "4,051056",
      longitude: "9.767868",
    })

    expect(buildCreerPointVente(values)).toMatchObject({
      telephones: [
        { numero: "+237 695 54 90 58", whatsapp: true },
        { numero: "+237 233 42 10 10", whatsapp: false },
      ],
      carte: "https://maps.app.goo.gl/wcGa724CqpHSeLze6",
      latitude: 4.051056,
      longitude: 9.767868,
    })
  })

  it("patches nothing when the form still says what was loaded", () => {
    const point = makePoint({
      telephones: TWO_NUMBERS,
      carte: "https://maps.app.goo.gl/cHcg4skdMf96WpJb9",
      latitude: 4.05,
      longitude: 9.76,
    })

    expect(buildModifierPointVente(parse(point), point)).toEqual({})
  })

  it("patches nothing for a counter without numbers, although the form offers it an empty row", () => {
    const point = makePoint()

    expect(toPointVenteForm(point).telephones).toEqual([{ numero: "", whatsapp: true }])
    expect(buildModifierPointVente(parse(point), point)).toEqual({})
  })

  it("patches only the changed field, and never the key", () => {
    const point = makePoint()

    expect(
      buildModifierPointVente(parse(point, { horaires: "8 h–19 h", cle: "Renamed", libelle: "Akwa Hôpitaux" }), point),
    ).toEqual({ horaires: "8 h–19 h", libelle: "Akwa Hôpitaux" })
  })

  it("sends the whole list of numbers when one is added, flagged or moved, since the backend replaces it", () => {
    const point = makePoint({ telephones: TWO_NUMBERS })
    const added = [...TWO_NUMBERS, { numero: "678730810", whatsapp: true }]
    const reordered = [TWO_NUMBERS[1]!, TWO_NUMBERS[0]!]
    const unflagged = [TWO_NUMBERS[0]!, { ...TWO_NUMBERS[1]!, whatsapp: false }]

    expect(buildModifierPointVente(parse(point, { telephones: added }), point)).toEqual({
      telephones: [...TWO_NUMBERS, { numero: "+237 678 73 08 10", whatsapp: true }],
    })
    expect(buildModifierPointVente(parse(point, { telephones: reordered }), point)).toEqual({ telephones: reordered })
    expect(buildModifierPointVente(parse(point, { telephones: unflagged }), point)).toEqual({ telephones: unflagged })
  })

  it("clears the numbers with an empty list and the map link with null, which is how the backend removes them", () => {
    const point = makePoint({ telephones: TWO_NUMBERS, carte: "https://maps.app.goo.gl/cHcg4skdMf96WpJb9" })

    expect(buildModifierPointVente(parse(point, { telephones: [], carte: "" }), point)).toEqual({
      telephones: [],
      carte: null,
    })
  })

  it("sends both coordinates when only one changed, because the backend validates them as a pair", () => {
    const point = makePoint({ latitude: 4.05, longitude: 9.76 })

    expect(buildModifierPointVente(parse(point, { latitude: "4.06" }), point)).toEqual({
      latitude: 4.06,
      longitude: 9.76,
    })
  })
})

describe("point of sale wizard step validation", () => {
  const blank = toPointVenteForm(null)
  const identity = { cle: "Essai", libelle: "Essai", ville: "Douala", quartier: "Akwa", repere: "Face au rond-point" }

  it("accepts a complete identity without requiring untouched contact fields", () => {
    expect(pointVenteIdentitySchema.safeParse({ ...blank, ...identity }).success).toBe(true)
  })

  it("rejects invalid optional contact information before review", () => {
    expect(pointVenteContactInfoSchema.safeParse({ ...blank, carte: "not a maps link" }).success).toBe(false)
    expect(pointVenteContactInfoSchema.safeParse({ ...blank, latitude: "4.05" }).success).toBe(false)
  })
})

describe("filtering the table", () => {
  const complete = {
    telephones: [{ numero: "+237 695 54 90 58", whatsapp: true }],
    horaires: "8 h–19 h",
    carte: "https://maps.app.goo.gl/cHcg4skdMf96WpJb9",
    latitude: 4.05,
    longitude: 9.76,
  }
  const points = [
    makePoint({ id: 1, libelle: "Akwa Paris Dancing", ville: "Douala", quartier: "Akwa", cle: "Akwa", ...complete }),
    makePoint({ id: 2, libelle: "Mvog-Mbi", ville: "Yaoundé", quartier: "Mvog-Mbi", cle: "Mvog-Mbi" }),
    makePoint({
      id: 3,
      libelle: "Marché A",
      ville: "Bafoussam",
      quartier: "Tamdja",
      cle: "Marche-A",
      active: false,
      ...complete,
    }),
  ]
  const ALL = { query: "", status: "all", details: "all" } as const
  const ids = (list: PointVenteAdmin[]) => list.map(point => point.id)

  it("matches the label, city, district or key, ignoring case and accents", () => {
    expect(ids(filterPoints(points, { ...ALL, query: "yaounde" }))).toEqual([2])
    expect(ids(filterPoints(points, { ...ALL, query: "MARCHE" }))).toEqual([3])
    expect(ids(filterPoints(points, { ...ALL, query: "tamdja" }))).toEqual([3])
    expect(ids(filterPoints(points, { ...ALL, query: "  " }))).toEqual([1, 2, 3])
  })

  it("keeps the counters missing details, or only complete ones", () => {
    expect(ids(filterPoints(points, { ...ALL, details: "missing" }))).toEqual([2])
    expect(ids(filterPoints(points, { ...ALL, details: "complete" }))).toEqual([1, 3])
    expect(ids(filterPoints(points, { ...ALL, query: "akwa", details: "missing" }))).toEqual([])
  })

  it("keeps the counters on the storefront, or only deactivated ones", () => {
    expect(ids(filterPoints(points, { ...ALL, status: "inactive" }))).toEqual([3])
    expect(ids(filterPoints(points, { ...ALL, status: "active" }))).toEqual([1, 2])
  })
})

describe("the details a counter operator reads out or pastes to a customer", () => {
  it("gives the name, where it is, how to find it, the numbers and the hours, one per line", () => {
    const point = makePoint({
      libelle: "Akwa Paris Dancing",
      telephones: [
        { numero: "+237 695 54 90 58", whatsapp: true },
        { numero: "+237 233 42 18 07", whatsapp: false },
      ],
      horaires: "Lundi–samedi, 8 h–19 h",
    })

    expect(customerDetailsText(point)).toBe(
      [
        "Akwa Paris Dancing",
        "Akwa, Douala",
        "Rue Drouot, à côté de la Pharmacie des hôpitaux",
        "+237 695 54 90 58 / +237 233 42 18 07",
        "Lundi–samedi, 8 h–19 h",
      ].join("\n"),
    )
  })

  it("leaves out what the counter does not publish", () => {
    expect(customerDetailsText(makePoint())).toBe(
      "Akwa Pharmacie des hôpitaux\nAkwa, Douala\nRue Drouot, à côté de la Pharmacie des hôpitaux",
    )
  })
})

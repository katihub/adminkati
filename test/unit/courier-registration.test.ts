import { describe, expect, it } from "vitest"
import {
  courierRegistrationBody,
  courierRegistrationError,
  emptyCourierRegistration,
  isAdult,
} from "../../app/utils/courier-registration"

const TODAY = new Date("2026-11-09T12:00:00Z")
const filled = {
  ...emptyCourierRegistration(),
  nom: "Jean Mbarga",
  dateNaissance: "1998-04-12",
  lieuNaissance: "Bafoussam",
  villeResidence: "Douala",
  quartierResidence: "Bépanda",
  courriel: " Jean.Mbarga@Test.cm ",
  telephone: "699112233",
  villeLivraison: "Douala",
  quartiersLivraison: ["Akwa"],
}

describe("courier registration", () => {
  it("accepts a complete form without a sponsor", () => {
    expect(courierRegistrationError(filled, TODAY)).toBeNull()
  })

  it("names the first problem", () => {
    expect(courierRegistrationError({ ...filled, nom: "J" }, TODAY)).toBe("name")
    expect(courierRegistrationError({ ...filled, dateNaissance: "2010-01-01" }, TODAY)).toBe("minor")
    expect(courierRegistrationError({ ...filled, courriel: "jean" }, TODAY)).toBe("email")
    expect(courierRegistrationError({ ...filled, parrainTelephone: "12" }, TODAY)).toBe("sponsorPhone")
    expect(courierRegistrationError({ ...filled, quartiersLivraison: [] }, TODAY)).toBe("districts")
  })

  it("takes an optional plate, in upper case", () => {
    expect(courierRegistrationError({ ...filled, immatriculation: "lt/12" }, TODAY)).toBe("plate")
    expect(courierRegistrationBody({ ...filled, immatriculation: " lt 123  ab " }).immatriculation).toBe("LT 123 AB")
    expect(courierRegistrationBody(filled).immatriculation).toBeUndefined()
  })

  it("is 18 on the very birthday", () => {
    expect(isAdult("2008-11-09", TODAY)).toBe(true)
    expect(isAdult("2008-11-10", TODAY)).toBe(false)
  })

  it("sends trimmed values, the e-mail in lower case, and leaves an empty sponsor out", () => {
    const body = courierRegistrationBody(filled)
    expect(body.courriel).toBe("jean.mbarga@test.cm")
    expect(body.parrainNom).toBeUndefined()
    expect(body.parrainTelephone).toBeUndefined()
    expect(body.quartiersLivraison).toEqual(["Akwa"])
  })
})

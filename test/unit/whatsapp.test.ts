import { describe, expect, it } from "vitest"
import { cameroonPhone, whatsappLink, whatsappNumber } from "../../app/utils/whatsapp"

describe("whatsapp number", () => {
  it("prefixes a 9-digit Cameroonian national number with 237", () => {
    expect(whatsappNumber("690 11 90 47")).toBe("237690119047")
    expect(whatsappNumber("6-90-11-90-47")).toBe("237690119047")
  })

  it("keeps a number already in international form, without the + or 00", () => {
    expect(whatsappNumber("+237 690 11 90 47")).toBe("237690119047")
    expect(whatsappNumber("00237690119047")).toBe("237690119047")
    expect(whatsappNumber("+33 6 12 34 56 78")).toBe("33612345678")
  })

  it("refuses what cannot be dialled internationally rather than opening the wrong chat", () => {
    expect(whatsappNumber(null)).toBeNull()
    expect(whatsappNumber("")).toBeNull()
    expect(whatsappNumber("12345")).toBeNull()
    expect(whatsappNumber("appelez-moi")).toBeNull()
  })
})

describe("whatsapp link", () => {
  it("encodes the whole message so reserved characters cannot break the query", () => {
    expect(whatsappLink("690119047", "Oui & merci ? #1\nÀ bientôt")).toBe(
      "https://wa.me/237690119047?text=Oui%20%26%20merci%20%3F%20%231%0A%C3%80%20bient%C3%B4t",
    )
  })

  it("opens the chat without a text parameter when there is nothing to pre-fill", () => {
    expect(whatsappLink("690119047", "   ")).toBe("https://wa.me/237690119047")
  })

  it("yields no link without a usable number", () => {
    expect(whatsappLink(null, "Bonjour")).toBeNull()
  })
})

describe("cameroon phone", () => {
  /*
   * The vectors of `CAS_TELEPHONE` (`src/commun/telephone.ts` in nowtech-backend), which
   * rewrites the number before storing it. Agreeing on the same cases is what keeps the panel's
   * "will be saved as" from announcing a form the backend would not store.
   */
  it.each([
    ["695549058", "+237 695 54 90 58"],
    ["6 95 54 90 58", "+237 695 54 90 58"],
    ["+237 695 54 90 58", "+237 695 54 90 58"],
    ["237695549058", "+237 695 54 90 58"],
    ["00237695549058", "+237 695 54 90 58"],
    ["(695) 54-90-58", "+237 695 54 90 58"],
    ["69554905", null],
    ["6955490580", null],
    ["795549058", null],
    ["", null],
    ["abcdefghi", null],
  ])("reads %s as a mobile: %s", (raw, expected) => {
    expect(cameroonPhone(raw, "mobile")).toBe(expected)
  })

  it("refuses a landline as a mobile, and accepts it as a counter phone", () => {
    expect(cameroonPhone("233421010", "mobile")).toBeNull()
    expect(cameroonPhone("+237 233 42 10 10", "mobile")).toBeNull()
    expect(cameroonPhone("233421010", "any")).toBe("+237 233 42 10 10")
    expect(cameroonPhone("695549058", "any")).toBe("+237 695 54 90 58")
  })

  it("refuses a foreign number, which wa.me would otherwise open", () => {
    expect(cameroonPhone("+33 6 12 34 56 78", "any")).toBeNull()
  })

  /*
   * Inputs `whatsappNumber` accepts for a chat link and the backend refuses (`null` from both
   * `normaliserTelephone` and `normaliserTelephoneDestinataire`): a bare `00` in front of a
   * national number, and a `237` prefix left with fewer than nine digits.
   */
  it.each([["00695549058"], ["00 233 42 10 10"], ["237123456"], ["237 695 54 90 5"]])(
    "refuses %s, as the backend does",
    raw => {
      expect(cameroonPhone(raw, "any")).toBeNull()
      expect(cameroonPhone(raw, "mobile")).toBeNull()
    },
  )
})

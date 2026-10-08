import { describe, expect, it } from "vitest"
import { includesIgnoringAccents } from "../../app/utils/search-text"

describe("includesIgnoringAccents", () => {
  it.each([
    ["Securité Electronique/Biometrie", "securite"],
    ["Caméras de Surveillance", "CAMERA"],
    ["Électroménager", "electro"],
    ["Onduleurs, Régulateurs & Énergie", "régulateur"],
    ["Televisions TV/Ecrans Plats", "écrans"],
  ])("finds %s when typing %s", (label, typed) => {
    expect(includesIgnoringAccents(label, typed)).toBe(true)
  })

  it("still rejects a label that does not contain the typed text", () => {
    expect(includesIgnoringAccents("Laptop HP", "lenovo")).toBe(false)
  })
})

import type { ProductCopyDraft } from "../../app/types/ai/product-copy"
import { describe, expect, it } from "vitest"
import { buildInput, buildInstructions } from "../../server/utils/ai/product-copy-prompt"

const pixelDraft: ProductCopyDraft = {
  name: "Pixel 6 Pro",
  brand: "Google",
  department: "Mobile",
  primaryCategory: "Smartphones",
  secondaryCategories: [],
  price: null,
  existingShortDescription: "Smartphone Google avec ecran OLED et appareil photo triple.",
  existingLongDescription: "Le Pixel 6 Pro offre un ecran OLED et trois capteurs photo.",
  existingFeatures: ["Ecran OLED", "Triple appareil photo"],
}

function inputText(draft: ProductCopyDraft): string {
  const input = buildInput(draft, [])
  const part = input[0]?.content.find(item => item.type === "input_text")
  return part?.type === "input_text" ? part.text : ""
}

describe("product-copy prompt grounding", () => {
  it("makes structured product facts authoritative over incidental visual observations", () => {
    const instructions = buildInstructions("en")

    expect(instructions).toMatch(/structured.*product.*facts.*what.*product.*is/i)
    expect(instructions).toMatch(/do not describe.*colour.*curved.*camera angle.*background/i)
    expect(instructions).toMatch(/do not infer.*brand.*model.*technical specification.*image alone/i)
    expect(instructions).toMatch(/text.*image.*disagree.*textual facts win/i)
  })

  it("sends compact authoritative product facts without empty optional fields", () => {
    const text = inputText({ ...pixelDraft, department: null, secondaryCategories: [], price: null })

    expect(text).toContain("Authoritative structured product reference")
    expect(text).toContain('"name":"Pixel 6 Pro"')
    expect(text).not.toContain('"department"')
    expect(text).not.toContain('"secondaryCategories"')
    expect(text).not.toContain('"price"')
    expect(text).not.toContain('\n  "')
  })
})

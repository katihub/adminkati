import { describe, expect, it } from "vitest"
import { CAISSE_ECART_MOTIFS } from "../../app/utils/caisse-ecart-motifs"

describe("caisse ecart motifs", () => {
  it("includes the exact non_explique sentinel the backend's alert logic matches on", () => {
    // caisse.service.ts's journal entry checks `motif === 'non_explique'` verbatim —
    // renaming or dropping this value would silently break that alert.
    expect(CAISSE_ECART_MOTIFS.some(motif => motif.value === "non_explique")).toBe(true)
  })

  it("every code respects the backend's 60-character cap", () => {
    for (const motif of CAISSE_ECART_MOTIFS) expect(motif.value.length).toBeLessThanOrEqual(60)
  })
})

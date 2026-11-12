import type {
  SellerDocument,
  SellerFileRequirement,
  SellerReviewListItem,
} from "../../app/types/api/marketplace-moderation"
import { describe, expect, it } from "vitest"
import {
  applicationAfterDecision,
  groupSellerDocuments,
  neighbourApplications,
  parsePage,
  parseSellerApplicationTab,
  sellerApplicationBadges,
} from "../../app/utils/seller-applications"

const doc = (
  id: string,
  type: string,
  statut: SellerDocument["statut"],
  creeLe: string,
  decideLe: string | null = null,
) => ({ id, type, statut, creeLe, decideLe, expireLe: null, motifDecision: null }) as SellerDocument

const requirement = (type: string, multiple = false) =>
  ({
    type,
    libelle: type,
    aide: "",
    obligatoire: !multiple,
    multiple,
    etat: "manquant",
    motif: null,
    nombre: 0,
  }) as SellerFileRequirement

describe("seller applications", () => {
  it("reads the tab and the page from the address, with safe defaults", () => {
    expect(parseSellerApplicationTab("valides")).toBe("valides")
    expect(parseSellerApplicationTab("n-importe-quoi")).toBe("a_traiter")
    expect(parseSellerApplicationTab(undefined)).toBe("a_traiter")
    expect(parsePage("3")).toBe(3)
    expect(parsePage("-2")).toBe(1)
    expect(parsePage(undefined)).toBe(1)
  })

  it("flags a completed file and a renewal by an approved seller", () => {
    const base = { statutVerification: "soumis" } as SellerReviewListItem
    expect(sellerApplicationBadges({ ...base, resoumis: true })).toEqual({ completed: true, renewal: false })
    expect(sellerApplicationBadges({ ...base, approuveLe: "2026-10-01T00:00:00Z" })).toEqual({
      completed: false,
      renewal: true,
    })
    expect(
      sellerApplicationBadges({ ...base, statutVerification: "approuve", approuveLe: "2026-10-01T00:00:00Z" }).renewal,
    ).toBe(false)
  })

  it("keeps the latest document of a type in force and marks it new after a refusal", () => {
    const groups = groupSellerDocuments(
      [
        doc("rib", "rib", "soumis", "2026-11-02T00:00:00Z"),
        doc("id-old", "identite", "refuse", "2026-11-02T00:00:00Z", "2026-11-09T00:00:00Z"),
        doc("id-new", "identite", "soumis", "2026-11-11T00:00:00Z"),
      ],
      [requirement("identite"), requirement("rib")],
    )
    expect(groups.map(group => group.type)).toEqual(["identite", "rib"])
    expect(groups[0]).toEqual(
      expect.objectContaining({
        isNew: true,
        current: [expect.objectContaining({ id: "id-new" })],
        previous: [expect.objectContaining({ id: "id-old" })],
      }),
    )
    expect(groups[1]!.isNew).toBe(false)
  })

  it("keeps every photo in force and is not new without a refusal", () => {
    const [photos] = groupSellerDocuments(
      [
        doc("p1", "photo_boutique", "soumis", "2026-11-01T00:00:00Z"),
        doc("p2", "photo_boutique", "valide", "2026-11-03T00:00:00Z"),
      ],
      [requirement("photo_boutique", true)],
    )
    expect(photos!.current.map(document => document.id)).toEqual(["p2", "p1"])
    expect(photos!.previous).toEqual([])
    expect(photos!.isNew).toBe(false)
  })

  it("moves to the next file after a decision, or the previous one at the end", () => {
    const ids = ["a", "b", "c"]
    expect(neighbourApplications(ids, "b")).toEqual({ previous: "a", next: "c" })
    expect(neighbourApplications(ids, "x")).toEqual({ previous: null, next: null })
    expect(applicationAfterDecision(ids, "b")).toBe("c")
    expect(applicationAfterDecision(ids, "c")).toBe("b")
    expect(applicationAfterDecision(["a"], "a")).toBeNull()
  })
})

import type { SellerDocumentStatus } from "../../app/types/api/marketplace-moderation"
import { describe, expect, it } from "vitest"
import { canWithdrawSellerApplication, isSellerFileApprovable } from "../../app/utils/seller-documents"

const piece = (type: string, statut: SellerDocumentStatus, creeLe: string) => ({ type, statut, creeLe })

describe("seller file approval", () => {
  it("allows approval once the document submitted again after a refusal is valid", () => {
    expect(
      isSellerFileApprovable([
        piece("identite", "refuse", "2026-11-01T10:00:00Z"),
        piece("identite", "valide", "2026-11-02T10:00:00Z"),
      ]),
    ).toBe(true)
  })

  it("allows approval when an expired document was renewed and validated", () => {
    expect(
      isSellerFileApprovable([
        piece("domicile", "expire", "2026-01-01T10:00:00Z"),
        piece("domicile", "valide", "2026-11-02T10:00:00Z"),
      ]),
    ).toBe(true)
  })

  it("stays blocked while the replacement is not yet validated", () => {
    expect(
      isSellerFileApprovable([
        piece("identite", "refuse", "2026-11-01T10:00:00Z"),
        piece("identite", "soumis", "2026-11-02T10:00:00Z"),
      ]),
    ).toBe(false)
  })

  it("stays blocked when the newest document of a type is the refused one", () => {
    expect(
      isSellerFileApprovable([
        piece("identite", "valide", "2026-11-01T10:00:00Z"),
        piece("identite", "refuse", "2026-11-02T10:00:00Z"),
      ]),
    ).toBe(false)
  })

  it("still requires every shop photo to be validated", () => {
    expect(
      isSellerFileApprovable([
        piece("photo_boutique", "en_verification", "2026-11-01T10:00:00Z"),
        piece("photo_boutique", "valide", "2026-11-02T10:00:00Z"),
      ]),
    ).toBe(false)
  })

  it("never allows approving an empty file", () => {
    expect(isSellerFileApprovable([])).toBe(false)
  })
})

describe("withdrawing an application", () => {
  it("is possible until approval, never for an approved or already withdrawn one", () => {
    expect(
      ["brouillon", "soumis", "en_verification", "modification_demandee", "refuse"].every(canWithdrawSellerApplication),
    ).toBe(true)
    expect(canWithdrawSellerApplication("approuve")).toBe(false)
    expect(canWithdrawSellerApplication("retiree")).toBe(false)
    expect(canWithdrawSellerApplication(undefined)).toBe(false)
  })
})

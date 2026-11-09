import { describe, expect, it } from "vitest"
import {
  accountActionNeedsReason,
  accountActionPath,
  accountKinds,
  visibleAccountActions,
} from "../../app/utils/account-access"

const auth = {
  id: "u1",
  courriel: "v@test.cm",
  courrielConfirme: false,
  derniereConnexion: null,
  creeLe: null,
  banni: false,
}

describe("account access", () => {
  it("maps each action to its endpoint", () => {
    expect(accountActionPath("lien")).toBe("/comptes/lien-reinitialisation")
    expect(accountActionPath("temporaire")).toBe("/comptes/mot-de-passe-temporaire")
  })

  it("asks a reason only for the copied link and the temporary password", () => {
    expect(
      (["lien", "confirmer", "lien_a_transmettre", "temporaire"] as const).filter(accountActionNeedsReason),
    ).toEqual(["lien_a_transmettre", "temporaire"])
  })

  it("shows the allowed actions, and hides « confirm » once the e-mail is confirmed", () => {
    expect(visibleAccountActions({ actions: ["lien", "confirmer", "lien_a_transmettre"], auth })).toEqual([
      "lien",
      "confirmer",
      "lien_a_transmettre",
    ])
    expect(
      visibleAccountActions({ actions: ["lien", "confirmer"], auth: { ...auth, courrielConfirme: true } }),
    ).toEqual(["lien"])
  })

  it("says whether the account is a customer, a seller, or both", () => {
    expect(
      accountKinds({
        client: { id: "c", statut: "actif" },
        boutiques: [{ id: "b", nom: "B", slug: "b", roles: [], actif: true }],
      }),
    ).toEqual(["client", "seller"])
    expect(accountKinds({ client: null, boutiques: [] })).toEqual([])
  })
})

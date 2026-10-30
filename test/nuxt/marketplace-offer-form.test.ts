import type { AdminMarketplaceOfferDetail } from "@/types/api/catalogue-products"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, describe, expect, it } from "vitest"
import OfferForm from "@/components/catalogue/OfferForm/OfferForm.vue"

const offer: AdminMarketplaceOfferDetail["offre"] = {
  id: "aabb6652-fba0-49fb-984e-dde2dbe65876",
  produitId: "ccdd6652-fba0-49fb-984e-dde2dbe65876",
  titre: "Ordinateur vendeur",
  referenceVendeur: "ORD-001",
  libelleVariante: "16 Go",
  statut: "publiee",
  prixFcfa: 100000,
  prixReferenceFcfa: 120000,
  quantiteMinimale: 1,
  garantieMois: 12,
  delaiMaxJours: 3,
  statutStock: "en_stock",
  modifieLe: "2026-10-30T12:00:00.000Z",
  description: null,
  etat: "neuf",
  modesLivraison: ["livraison"],
  villesLivraison: ["Douala"],
  produit: { id: "ccdd6652-fba0-49fb-984e-dde2dbe65876", nom: "Ordinateur", slug: "ordinateur" },
  boutique: { id: "bbdd6652-fba0-49fb-984e-dde2dbe65876", nom: "Boutique", vendeurId: "v1", suiviStock: true },
  stock: { quantite: 10, quantiteReservee: 2 },
  revisions: [],
}
const wrappers: Array<{ unmount: () => void }> = []

describe("marketplace seller offer correction", () => {
  afterEach(() => wrappers.splice(0).forEach(wrapper => wrapper.unmount()))

  it("submits only versioned seller conditions with numeric values, nullable reference and trimmed reason", async () => {
    const wrapper = await mountSuspended(OfferForm, { props: { offer, saving: false, error: null } })
    wrappers.push(wrapper)
    await wrapper.get("[data-testid='catalogue-offer-price']").setValue("110000")
    await wrapper.get("[data-testid='catalogue-offer-reference']").setValue("")
    await wrapper.get("[data-testid='catalogue-offer-moq']").setValue("2")
    await wrapper.get("[data-testid='catalogue-offer-warranty']").setValue("24")
    await wrapper.get("[data-testid='catalogue-offer-delay']").setValue("2")
    await wrapper.get("[data-testid='catalogue-offer-reason']").setValue("  Correction tarif validée  ")
    await wrapper.get("[data-testid='catalogue-offer-save']").trigger("click")
    expect(wrapper.emitted("save")).toEqual([
      [
        {
          prixFcfa: 110000,
          prixReferenceFcfa: null,
          quantiteMinimale: 2,
          garantieMois: 24,
          delaiMaxJours: 2,
          modifieLe: offer.modifieLe,
          motif: "Correction tarif validée",
        },
      ],
    ])
    const fields = wrapper
      .findAll("input,select,textarea")
      .map(
        field =>
          `${field.attributes("name") ?? ""} ${field.attributes("id") ?? ""} ${field.attributes("data-testid") ?? ""}`,
      )
      .join(" ")
    expect(fields).not.toMatch(/statut|status|stock/i)
  })

  it("rejects a short reason, inconsistent reference, zero MOQ and delivery beyond three days", async () => {
    const wrapper = await mountSuspended(OfferForm, { props: { offer, saving: false, error: null } })
    wrappers.push(wrapper)
    const reason = wrapper.get("[data-testid='catalogue-offer-reason']")
    await reason.setValue("test")
    expect(wrapper.get("[data-testid='catalogue-offer-save']").attributes("disabled")).toBeDefined()
    await reason.setValue("Correction documentée")
    expect(wrapper.get("[data-testid='catalogue-offer-save']").attributes("disabled")).toBeUndefined()
    for (const [field, invalid, restored] of [
      ["reference", "99999", "120000"],
      ["moq", "0", "1"],
      ["delay", "4", "3"],
    ]) {
      const input = wrapper.get(`[data-testid='catalogue-offer-${field}']`)
      await input.setValue(invalid)
      const save = wrapper.get("[data-testid='catalogue-offer-save']")
      expect(save.attributes("disabled")).toBeDefined()
      await save.trigger("click")
      expect(wrapper.emitted("save")).toBeUndefined()
      await input.setValue(restored)
    }
    expect(wrapper.get("[data-testid='catalogue-offer-save']").attributes("disabled")).toBeUndefined()
  })

  it("blocks repeated corrections while an earlier save is pending", async () => {
    const wrapper = await mountSuspended(OfferForm, { props: { offer, saving: false, error: null } })
    wrappers.push(wrapper)
    await wrapper.get("[data-testid='catalogue-offer-reason']").setValue("Correction documentée")
    await wrapper.setProps({ saving: true })
    const save = wrapper.get("[data-testid='catalogue-offer-save']")
    expect(save.attributes("disabled")).toBeDefined()
    await save.trigger("click")
    expect(wrapper.emitted("save")).toBeUndefined()
  })
})

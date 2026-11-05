import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import SellerIdentity from "@/components/operations/SellerIdentity/SellerIdentity.vue"

const base = {
  id: "v1",
  type: "personne_physique",
  nomLegal: "Awa Ngono",
  niu: null,
  rccm: null,
  statutVerification: "soumis",
  statut: "inactif",
  commissionBps: 500,
  motifStatut: null,
  creeLe: "2026-11-05T10:00:00.000Z",
  boutiques: [],
  documents: [],
} as never

describe("the individual seller identity", () => {
  it("shows birth, residence and the optional sponsor given at signup", async () => {
    const wrapper = await mountSuspended(SellerIdentity, {
      props: {
        seller: {
          ...(base as object),
          dateNaissance: "1995-04-12T00:00:00.000Z",
          lieuNaissance: "Bafoussam",
          villeResidence: "Douala",
          quartierResidence: "Akwa",
          parrainNom: "Paul Etoa",
          parrainTelephone: "+237677001122",
        } as never,
      },
    })
    expect(wrapper.get("[data-testid='seller-identity-birth']").text()).toBe("April 12, 1995 · Bafoussam")
    expect(wrapper.get("[data-testid='seller-identity-residence']").text()).toBe("Akwa, Douala")
    expect(wrapper.get("[data-testid='seller-identity-sponsor']").text()).toBe("Paul Etoa · +237677001122")
  })

  it("stays hidden for a company or an older application", async () => {
    const wrapper = await mountSuspended(SellerIdentity, { props: { seller: base } })
    expect(wrapper.find("[data-testid='seller-identity']").exists()).toBe(false)
  })
})

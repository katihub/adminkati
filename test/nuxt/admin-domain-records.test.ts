import type { SellerReviewDetail } from "@/types/api/marketplace-moderation"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { createError } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import FinanceLedger from "@/components/operations/FinanceLedger/FinanceLedger.vue"
import SellerShops from "@/components/operations/SellerShops/SellerShops.vue"
import ActivityTab from "@/components/users/ActivityTab/ActivityTab.vue"
import DetailPanel from "@/components/users/DetailPanel.vue"

const cleanups: Array<() => void> = []
const wrappers: Array<{ unmount: () => void }> = []
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  cleanups.splice(0).forEach(cleanup => cleanup())
  useNuxtApp().$queryClient.clear()
})

const seller: SellerReviewDetail = {
  id: "seller-record",
  type: "entreprise",
  nomLegal: "Société Exemple",
  niu: null,
  rccm: null,
  statutVerification: "approuve",
  statut: "actif",
  commissionBps: 800,
  motifStatut: null,
  creeLe: "2026-10-01T10:00:00Z",
  documents: [],
  boutiques: [
    {
      id: "shop-record",
      nom: "Boutique Exemple",
      slug: "exemple",
      statut: "active",
      ville: "Douala",
      villesLivraison: ["Douala", "Yaoundé", "Bafoussam"],
      gestionSav: "kati_service",
      membres: [
        {
          id: "member-record",
          nom: "Agent Exemple",
          courriel: "agent@example.test",
          roles: ["responsable"],
          actif: true,
        },
      ],
      _count: { offres: 37 },
      pointFocal: { id: "focal-record", nom: "Point focal Exemple" },
    },
  ],
  reputations: [{ scoreRisque: 12, tauxLitigeBps: 250, creeLe: "2026-10-20T10:00:00Z" }],
  sanctions: [
    {
      id: "sanction-record",
      type: "avertissement",
      statut: "active",
      motif: "Retard de réponse",
      commenceLe: "2026-10-20T10:00:00Z",
    },
  ],
}

describe("complete administrative domain records", () => {
  it("shows all shop cities, SAV management, agents and quality without granting finance links by default", async () => {
    const wrapper = await mountSuspended(SellerShops, { props: { seller } })
    wrappers.push(wrapper)
    expect(wrapper.text()).toContain("Douala, Yaoundé, Bafoussam")
    expect(wrapper.text()).toContain("Kati Service")
    expect(wrapper.text()).toContain("Agent Exemple")
    expect(wrapper.text()).toContain("agent@example.test")
    expect(wrapper.text()).toContain("responsable")
    expect(wrapper.text()).toContain("37")
    expect(wrapper.text()).toContain("2.5%")
    expect(wrapper.text()).toContain("Retard de réponse")
    expect(wrapper.find('a[href*="seller-finance"]').exists()).toBe(false)
    expect(wrapper.find('a[href*="marketplace-offers"]').exists()).toBe(false)
    await wrapper.setProps({ canViewFinance: true })
    expect(wrapper.get('a[href*="seller-finance"]').attributes("href")).toContain("boutique=shop-record")
    expect(wrapper.get('a[href*="marketplace-offers"]').attributes("href")).toContain("boutique=shop-record")
    expect(wrapper.get('a[href*="seller-trust"]').attributes("href")).toContain("vendeur=seller-record")
  })

  it("loads only the selected customer's tickets, cases and refund references", async () => {
    const calls: string[] = []
    cleanups.push(
      registerEndpoint("/api/v1/clients/client-record/activite", {
        handler: event => {
          calls.push(event.path.replace(/^\/_/, ""))
          return {
            limite: 50,
            assistance: {
              total: 1,
              elements: [
                {
                  id: "ticket-record",
                  reference: "SUP-REC",
                  question: "Où est mon colis ?",
                  statut: "ouvert",
                  creeLe: "2026-10-20T10:00:00Z",
                  reponduLe: null,
                },
              ],
            },
            dossiers: {
              total: 1,
              elements: [
                {
                  id: "case-record",
                  reference: "SAV-REC",
                  objet: "Produit endommagé",
                  description: "Photo jointe au dossier",
                  statut: "resolue",
                  categorie: "retour",
                  creeLe: "2026-10-20T10:00:00Z",
                  boutique: { id: "shop-record", nom: "Boutique Exemple" },
                  commande: { reference: "CMD-REC" },
                  retour: {
                    id: "return-record",
                    statut: "rembourse",
                    montantRembourseFcfa: 42000,
                    referenceRemboursement: "REF-REC",
                    remboursementPsp: { statut: "reussi", montantFcfa: 42000, transId: "PSP-REC", confirmeLe: null },
                  },
                },
              ],
            },
          }
        },
      }),
    )
    const wrapper = await mountSuspended(ActivityTab, { props: { clientId: "client-record" } })
    wrappers.push(wrapper)
    await vi.waitFor(() => expect(wrapper.text()).toContain("SUP-REC"))
    expect(calls).toEqual(["/api/v1/clients/client-record/activite"])
    expect(wrapper.text()).toContain("SAV-REC")
    expect(wrapper.text()).toContain("CMD-REC")
    expect(wrapper.text()).toContain("Boutique Exemple")
    expect(wrapper.text().replaceAll(/\s/g, "")).toContain("42,000")
    expect(wrapper.text()).toContain("PSP-REC")
    expect(wrapper.get('a[href*="customer-requests"]').attributes("href")).toContain("demande=ticket-record")
    expect(wrapper.get('a[href*="marketplace-disputes"]').attributes("href")).toContain("retour=return-record")
  })

  it("does not render another client's cached activity when the current request fails", async () => {
    useNuxtApp().$queryClient.setQueryData(["v1", "clients", "another-client", "activite"], {
      limite: 50,
      assistance: { total: 1, elements: [{ reference: "PRIVATE-OTHER" }] },
    })
    cleanups.push(
      registerEndpoint("/api/v1/clients/client-error/activite", {
        handler: () => {
          throw createError({ statusCode: 403, statusMessage: "Forbidden" })
        },
      }),
    )
    const wrapper = await mountSuspended(ActivityTab, { props: { clientId: "client-error" } })
    wrappers.push(wrapper)
    await vi.waitFor(() => expect(wrapper.find("[data-testid='api-error-card']").exists()).toBe(true), {
      timeout: 5000,
    })
    expect(wrapper.text()).not.toContain("PRIVATE-OTHER")
  })

  it("reads the exact administrative shop account and displays balances and auditable ledger entries", async () => {
    let path = ""
    cleanups.push(
      registerEndpoint("/api/v1/marketplace/finance/administration/boutiques/shop-ledger", {
        handler: event => {
          path = event.path.replace(/^\/_/, "")
          return {
            boutique: { id: "shop-ledger", nom: "Compte vendeur test" },
            soldes: { disponibleFcfa: 125000, geleFcfa: 25000 },
            destinations: [],
            transactions: [
              {
                id: "TX-REC",
                type: "commission_acquise",
                libelle: "Commission commande test",
                creeLe: "2026-10-20T10:00:00Z",
                sousCommandeId: "SUB-REC",
                ecritures: [
                  { sens: "credit", compte: "vendeur_disponible", montantFcfa: 92000, libelle: "Net vendeur test" },
                  { sens: "credit", compte: "commission_plateforme", montantFcfa: 8000, libelle: "Commission test" },
                ],
              },
            ],
          }
        },
      }),
    )
    const wrapper = await mountSuspended(FinanceLedger, { props: { shopId: "shop-ledger" } })
    wrappers.push(wrapper)
    await vi.waitFor(() => expect(wrapper.text()).toContain("TX-REC"))
    expect(path).toBe("/api/v1/marketplace/finance/administration/boutiques/shop-ledger")
    expect(wrapper.text()).toContain("Compte vendeur test")
    expect(wrapper.text()).toContain("125,000")
    expect(wrapper.text()).toContain("25,000")
    expect(wrapper.text()).toContain("vendeur disponible")
    expect(wrapper.text()).toContain("commission plateforme")
    expect(wrapper.text()).toContain("SUB-REC")
    expect(wrapper.text()).toContain("Net vendeur test")
  })

  it("shows an explicit error instead of an empty ledger on forbidden financial data", async () => {
    cleanups.push(
      registerEndpoint("/api/v1/marketplace/finance/administration/boutiques/shop-error", {
        handler: () => {
          throw createError({ statusCode: 403, statusMessage: "Forbidden" })
        },
      }),
    )
    const wrapper = await mountSuspended(FinanceLedger, { props: { shopId: "shop-error" } })
    wrappers.push(wrapper)
    await vi.waitFor(() => expect(wrapper.find("[data-testid='api-error-card']").exists()).toBe(true), {
      timeout: 5000,
    })
    expect(wrapper.text()).not.toContain("No entries for this shop.")
  })

  it("hides KATI from a non-direction reader and exposes it only with write authority", async () => {
    const wrapper = await mountSuspended(DetailPanel, {
      props: {
        selected: true,
        isPending: false,
        error: null,
        detail: {
          client: {
            id: "client-tabs",
            statut: "actif",
            courriel: "customer@example.test",
            creeLe: "2026-10-01T10:00:00Z",
            dernierAccesLe: null,
          },
          profil: null,
          adresses: [],
          complet: false,
        },
      },
    })
    wrappers.push(wrapper)
    await flushPromises()
    expect(wrapper.find("[data-testid='users-detail-tab-kati']").exists()).toBe(false)
    expect(wrapper.find("[data-testid='users-detail-tab-activity']").exists()).toBe(true)
    await wrapper.setProps({ canWrite: true })
    expect(wrapper.find("[data-testid='users-detail-tab-kati']").exists()).toBe(true)
  })
})

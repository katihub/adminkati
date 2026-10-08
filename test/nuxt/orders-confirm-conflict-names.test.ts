import type { CommandeDetail } from "@/types/api/commandes"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { createError } from "h3"
import { afterEach, describe, expect, it } from "vitest"
import DetailPanel from "@/components/orders/DetailPanel.vue"
import TransitionDialog from "@/components/orders/TransitionDialog.vue"

const LINES = "[data-testid='orders-transition-dialog-conflict-lines']"
const CONFIRM_PATH = "/api/v1/commandes/NT-000042/confirmer"

const cleanups: Array<() => void> = []
const mounted: Array<{ unmount: () => void }> = []

afterEach(() => {
  mounted.splice(0).forEach(wrapper => wrapper.unmount())
  cleanups.splice(0).forEach(cleanup => cleanup())
  useNuxtApp().$queryClient.clear()
  document.body.innerHTML = ""
})

function serveStockConflict() {
  cleanups.push(
    registerEndpoint(CONFIRM_PATH, {
      method: "POST",
      handler: () => {
        throw createError({
          statusCode: 409,
          data: {
            message: "Des références ne sont plus disponibles.",
            lignes: [
              { slug: "qa-stock-product-a", motif: "stock_insuffisant" },
              { slug: "qa-stock-product-b", motif: "rupture" },
            ],
          },
        })
      },
    }),
  )
}

async function clickConfirm() {
  const button = document.body.querySelector<HTMLButtonElement>("[data-testid='orders-transition-confirm']")
  if (!button) throw new Error("Transition dialog did not mount")
  button.click()
  await flushPromises()
}

function conflictItems() {
  return Array.from(document.body.querySelector(LINES)?.querySelectorAll("li") ?? [])
}

async function mountDialog(productNames?: Record<string, string>) {
  const wrapper = await mountSuspended(TransitionDialog, {
    props: {
      reference: "NT-000042",
      transition: "confirmee",
      modeRemise: "retrait" as const,
      confirmeParClient: false,
      recuLe: null,
      open: true,
      productNames,
    },
    attachTo: document.body,
  })
  mounted.push(wrapper)
  return wrapper
}

describe("orders stock conflict: product names in the transition dialog", () => {
  it("names each unavailable product instead of showing only its slug", async () => {
    serveStockConflict()
    await mountDialog({ "qa-stock-product-a": "QA Stock Product A", "qa-stock-product-b": "QA Stock Product B" })
    await clickConfirm()

    const items = conflictItems()
    expect(items).toHaveLength(2)
    expect(items[0]?.textContent).toContain("QA Stock Product A")
    expect(items[1]?.textContent).toContain("QA Stock Product B")
  })

  it("falls back to the slug for a product the map does not name", async () => {
    serveStockConflict()
    await mountDialog({ "qa-stock-product-a": "QA Stock Product A" })
    await clickConfirm()

    const items = conflictItems()
    expect(items[0]?.textContent).toContain("QA Stock Product A")
    expect(items[1]?.textContent).toContain("qa-stock-product-b")
  })

  it("falls back to the slug when no names are provided at all", async () => {
    serveStockConflict()
    await mountDialog()
    await clickConfirm()

    expect(conflictItems()[0]?.textContent).toContain("qa-stock-product-a")
  })
})

describe("orders detail panel: stock conflict", () => {
  it("names the unavailable product from the order's own lines when confirming fails", async () => {
    useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
      userId: "u1",
      membreId: "m1",
      nom: "Ada",
      courriel: "ada@example.com",
      roles: ["direction"],
    })
    serveStockConflict()
    const order = {
      id: "commande-1",
      reference: "NT-000042",
      statut: "soumise",
      modeRemise: "retrait",
      modePaiementSouhaite: "especes_comptoir",
      momentPaiement: "au_retrait",
      comptoir: null,
      creeLe: "2026-01-05T10:00:00.000Z",
      closeLe: null,
      recuLe: null,
      confirmeParClient: false,
      motifCloture: null,
      ligneCount: 2,
      lignes: [
        {
          id: "l1",
          rang: 1,
          produitId: 1,
          slug: "qa-stock-product-a",
          nomCapture: "QA Stock Product A",
          quantite: 2,
          quantiteRemise: 0,
          statutLigne: "commandee",
          motifEcart: null,
          prixCapture: 1000,
          prixFerme: null,
        },
        {
          id: "l2",
          rang: 2,
          produitId: 2,
          slug: "qa-stock-product-b",
          nomCapture: "QA Stock Product B",
          quantite: 1,
          quantiteRemise: 0,
          statutLigne: "commandee",
          motifEcart: null,
          prixCapture: 1000,
          prixFerme: null,
        },
      ],
      clientNom: "Awa Ngono",
      clientTelephone: "677000000",
      adresseFigee: null,
      telephoneLivraison: null,
      livreur: null,
      livreurAffecteLe: null,
      totalEstimeTtc: 3000,
      totalFermeTtc: null,
      totalFacturableTtc: null,
      resteAPayer: 3000,
      statutPaiement: "en_attente",
    } as unknown as CommandeDetail

    const wrapper = await mountSuspended(DetailPanel, { props: { order }, attachTo: document.body })
    mounted.push(wrapper)
    await flushPromises()

    const action = document.body.querySelector<HTMLButtonElement>("[data-transition='confirmee']")
    if (!action) throw new Error("Confirm transition action not rendered")
    action.click()
    await flushPromises()
    await clickConfirm()

    const items = conflictItems()
    expect(items).toHaveLength(2)
    expect(items[0]?.textContent).toContain("QA Stock Product A")
    expect(items[1]?.textContent).toContain("QA Stock Product B")
  })
})

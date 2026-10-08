import type { ProductCategory, ProductDetail, ProductHistoryEntry, ProductImage, Taxonomie } from "@/types/api/produits"
import type { Role } from "@/types/session"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import ProductsDetailForm from "@/components/products/DetailForm.vue"

let idCounter = 0
let historyIdCounter = 0

const PRINCIPAL_CATEGORY: ProductCategory = { id: 1, nom: "Casques", slug: "casques", rayon: "informatique" }
const SECONDARY_CATEGORY: ProductCategory = { id: 2, nom: "Chargeurs", slug: "chargeurs", rayon: "informatique" }

const TAXONOMIE_FIXTURE: Taxonomie = {
  rayons: [{ id: "r1", slug: "informatique", nom: "Informatique", nom_court: "Info", compte_total: 20 }],
  categories: [
    {
      id: PRINCIPAL_CATEGORY.id,
      nom: PRINCIPAL_CATEGORY.nom,
      slug: PRINCIPAL_CATEGORY.slug,
      parent_id: null,
      niveau: 1,
      rayon: "informatique",
      compte_total: 10,
      masquee: false,
    },
    {
      id: SECONDARY_CATEGORY.id,
      nom: SECONDARY_CATEGORY.nom,
      slug: SECONDARY_CATEGORY.slug,
      parent_id: null,
      niveau: 1,
      rayon: "informatique",
      compte_total: 6,
      masquee: false,
    },
  ],
  marques: [{ nom: "Anker", slug: "anker", nombre_produits: 12, logo_url: null }],
}

function makeProductDetail(overrides: Partial<ProductDetail> = {}): ProductDetail {
  idCounter += 1
  return {
    id: idCounter,
    slug: `produit-${idCounter}`,
    nom: `Produit ${idCounter}`,
    prix: 10_000,
    prix_reference: null,
    remise_pct: null,
    statut_stock: "en_stock",
    quantite_stock: 10,
    inventaire: {
      produit_id: 1,
      quantite_stock: 10,
      statut_stock: "en_stock",
      modifie_le: null,
      disponibilite_forcee: null,
    },
    fiche_technique: null,
    marque: null,
    categorie_principale_id: null,
    retire_le: null,
    rayon: null,
    nom_source: null,
    ajoute_le: null,
    url_source: null,
    caracteristiques: [],
    description: null,
    categorie_nom: null,
    images: [],
    categories: [],
    historique: [],
    fiche_pdf: null,
    fiche_pdf_nom: null,
    fiche_pdf_octets: null,
    ...overrides,
  }
}

function makePopulatedProduct(overrides: Partial<ProductDetail> = {}): ProductDetail {
  const images: ProductImage[] = [
    { rang: 1, url: "https://example.com/img1.jpg", chemin_local: null, octets: null, alt: "Vue de face" },
    { rang: 2, url: "https://example.com/img2.jpg", chemin_local: null, octets: null, alt: "Vue de côté" },
  ]
  return makeProductDetail({
    nom: "Casque Bluetooth Pro",
    prix: 49_900,
    prix_reference: 59_900,
    remise_pct: 15,
    statut_stock: "rupture",
    quantite_stock: 0,
    inventaire: {
      produit_id: 1,
      quantite_stock: 0,
      statut_stock: "rupture",
      modifie_le: null,
      disponibilite_forcee: null,
    },
    fiche_technique: null,
    marque: "Anker",
    categorie_principale_id: PRINCIPAL_CATEGORY.id,
    url_source: "https://example.com/source",
    caracteristiques: ["Bluetooth 5.0", "Autonomie 30h"],
    images,
    categories: [PRINCIPAL_CATEGORY, SECONDARY_CATEGORY],
    ...overrides,
  })
}

function makeHistoryEntry(overrides: Partial<ProductHistoryEntry> = {}): ProductHistoryEntry {
  historyIdCounter += 1
  return {
    id: historyIdCounter,
    lot_id: null,
    type: "modification",
    statut: "en_attente",
    champs: { nom: { avant: "Old name", apres: "New name" } },
    detectee_le: "2026-01-01T00:00:00.000Z",
    decidee_le: null,
    decidee_par: null,
    motif: null,
    ...overrides,
  }
}

function seedTaxonomie() {
  useNuxtApp().$queryClient.setQueryData(["v1", "taxonomie"], TAXONOMIE_FIXTURE)
}

function seedSession(roles: Role[]) {
  useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
    userId: "u1",
    membreId: "m1",
    nom: "Ada",
    courriel: "ada@example.com",
    roles,
  })
}

/**
 * `attachTo: document.body` matters here — `Dialog`/`Popover` content teleports out of the
 * component's own tree, so it never shows up under `wrapper.find`. It's only reachable through
 * a real `document.body.querySelector`, confirmed empirically against this repo's reka-ui
 * `DialogContent` and mirrored from `admin-profile-menu.test.ts` and `language-switcher.test.ts`.
 */
function mount(product: ProductDetail | null) {
  return mountSuspended(ProductsDetailForm, { props: { product }, attachTo: document.body })
}

describe("products lifecycle", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("withdraw requires confirming inside the dialog before it mutates anything", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    const product = makePopulatedProduct({ retire_le: null })

    let retirerCalls = 0
    const cleanupRetirer = registerEndpoint(`/api/v1/catalogue/administration/produits/${product.id}/retirer`, {
      method: "POST",
      handler: () => {
        retirerCalls += 1
        return { ...product, retire_le: "2026-02-15T10:00:00.000Z" }
      },
    })

    const wrapper = await mount(product)
    await flushPromises()

    expect(document.body.querySelector("[data-testid='products-withdraw-dialog']")).toBeNull()

    await wrapper.get("[data-testid='products-withdraw-dialog-trigger']").trigger("click")
    await flushPromises()

    expect(document.body.querySelector("[data-testid='products-withdraw-dialog']")).not.toBeNull()
    expect(retirerCalls).toBe(0)

    const confirmButton = document.body.querySelector<HTMLButtonElement>(
      "[data-testid='products-withdraw-dialog-confirm']",
    )
    expect(confirmButton).not.toBeNull()

    /* LE MOTIF EST OBLIGATOIRE, ET LE BOUTON LE DIT MAINTENANT. Le backend
       l'exige (`DeciderPropositionDto`) : sans lui, le clic partait et
       revenait en 400 « motif must be a string », affiché comme un échec
       générique. Le bouton reste donc inerte tant que le champ est vide. */
    expect(confirmButton?.disabled).toBe(true)
    confirmButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    await flushPromises()
    expect(retirerCalls).toBe(0)

    const motif = document.body.querySelector<HTMLTextAreaElement | HTMLInputElement>(
      "[data-testid='products-withdraw-dialog-motif']",
    )
    expect(motif).not.toBeNull()
    motif!.value = "Fin de série chez le fournisseur"
    motif!.dispatchEvent(new Event("input", { bubbles: true }))
    await flushPromises()

    document.body
      .querySelector("[data-testid='products-withdraw-dialog-confirm']")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    await flushPromises()

    expect(retirerCalls).toBe(1)

    cleanupRetirer()
    wrapper.unmount()
  })

  it("shows Restore instead of Withdraw once a product has been withdrawn", async () => {
    seedTaxonomie()
    seedSession(["direction"])

    const activeProduct = makePopulatedProduct({ retire_le: null })
    const activeWrapper = await mount(activeProduct)
    await flushPromises()

    expect(activeWrapper.find("[data-testid='products-withdraw-dialog-trigger']").exists()).toBe(true)
    expect(activeWrapper.find("[data-testid='products-detail-form-restore']").exists()).toBe(false)
    expect(activeWrapper.find("[data-testid='products-detail-form-withdrawn-banner']").exists()).toBe(false)

    activeWrapper.unmount()

    const withdrawnProduct = makePopulatedProduct({ retire_le: "2026-01-20T09:30:00.000Z" })

    let restaurerCalls = 0
    const cleanupRestaurer = registerEndpoint(
      `/api/v1/catalogue/administration/produits/${withdrawnProduct.id}/restaurer`,
      {
        method: "POST",
        handler: () => {
          restaurerCalls += 1
          return { ...withdrawnProduct, retire_le: null }
        },
      },
    )

    const withdrawnWrapper = await mount(withdrawnProduct)
    await flushPromises()

    expect(withdrawnWrapper.find("[data-testid='products-withdraw-dialog-trigger']").exists()).toBe(false)
    expect(withdrawnWrapper.find("[data-testid='products-detail-form-restore']").exists()).toBe(true)
    expect(withdrawnWrapper.find("[data-testid='products-detail-form-withdrawn-banner']").exists()).toBe(true)

    await withdrawnWrapper.get("[data-testid='products-detail-form-restore']").trigger("click")
    await flushPromises()

    expect(restaurerCalls).toBe(1)

    cleanupRestaurer()
    withdrawnWrapper.unmount()
  })

  it("renders history entries newest-first regardless of input order", async () => {
    seedTaxonomie()
    seedSession(["direction"])

    // Deliberately scrambled (Feb, Jan, Mar) so a passing assertion actually proves the
    // component sorts — an already-sorted fixture would pass even without sorting.
    const february = makeHistoryEntry({ detectee_le: "2026-02-10T08:00:00.000Z" })
    const january = makeHistoryEntry({ detectee_le: "2026-01-05T08:00:00.000Z" })
    const march = makeHistoryEntry({ detectee_le: "2026-03-01T08:00:00.000Z" })
    const product = makePopulatedProduct({ historique: [february, january, march] })

    const wrapper = await mount(product)
    await flushPromises()

    const historyTab = wrapper.findAll("button").find(button => button.text() === "History (3)")
    expect(historyTab).toBeDefined()
    await historyTab!.trigger("click")
    await flushPromises()

    const entries = wrapper.findAll("[data-testid='products-history-panel-entry']")
    expect(entries.every(entry => entry.isVisible())).toBe(true)
    expect(entries.map(entry => Number(entry.attributes("data-entry-id")))).toEqual([march.id, february.id, january.id])
    expect(wrapper.find("[data-testid='products-history-panel-empty']").exists()).toBe(false)
    expect(wrapper.find("[data-testid='products-history-panel-toggle']").exists()).toBe(false)

    wrapper.unmount()
  })

  it("shows the empty state when a product has no history entries", async () => {
    seedTaxonomie()
    seedSession(["direction"])
    const product = makePopulatedProduct({ historique: [] })

    const wrapper = await mount(product)
    await flushPromises()

    const historyTab = wrapper.findAll("button").find(button => button.text() === "History (0)")
    expect(historyTab).toBeDefined()
    await historyTab!.trigger("click")
    await flushPromises()

    const emptyState = wrapper.find("[data-testid='products-history-panel-empty']")
    expect(emptyState.exists()).toBe(true)
    expect(emptyState.isVisible()).toBe(true)
    expect(wrapper.findAll("[data-testid='products-history-panel-entry']")).toHaveLength(0)
    expect(wrapper.find("[data-testid='products-history-panel-toggle']").exists()).toBe(false)

    wrapper.unmount()
  })

  it("withdraw/restore controls are role-gated, not just disabled", async () => {
    seedTaxonomie()
    seedSession(["comptoir"])

    const activeProduct = makePopulatedProduct({ retire_le: null })
    const activeWrapper = await mount(activeProduct)
    await flushPromises()

    expect(activeWrapper.find("[data-testid='products-withdraw-dialog-trigger']").exists()).toBe(false)
    expect(activeWrapper.find("[data-testid='products-detail-form-restore']").exists()).toBe(false)

    activeWrapper.unmount()

    const withdrawnProduct = makePopulatedProduct({ retire_le: "2026-01-20T09:30:00.000Z" })
    const withdrawnWrapper = await mount(withdrawnProduct)
    await flushPromises()

    expect(withdrawnWrapper.find("[data-testid='products-withdraw-dialog-trigger']").exists()).toBe(false)
    expect(withdrawnWrapper.find("[data-testid='products-detail-form-restore']").exists()).toBe(false)

    withdrawnWrapper.unmount()
  })
})

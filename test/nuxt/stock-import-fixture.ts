import type { ProductListItem, ProductListResponse } from "@/types/api/produits"
import type { LigneResultatImport, ReponseImportStock } from "@/types/api/stock-import"
import { expect, vi } from "vitest"

export const STOCK_PRODUCTS_PATH = "/api/v1/catalogue/administration/produits"
const STOCK_IMPORT_PATH = "/api/v1/catalogue/administration/produits/inventaire/import"
export function stockProduct(overrides: Partial<ProductListItem> = {}): ProductListItem {
  return {
    id: 42,
    slug: "router",
    nom: "Routeur",
    quantite_stock: 10,
    retire_le: null,
    prix: 100,
    prix_reference: null,
    remise_pct: null,
    statut_stock: "en_stock",
    marque: null,
    categorie_principale_id: null,
    categorie: null,
    rayon: null,
    image: null,
    ...overrides,
  }
}
export function stockPage(
  produits: ProductListItem[],
  overrides: Partial<ProductListResponse> = {},
): ProductListResponse {
  return { produits, page: 1, pages: 1, taille: 200, total: produits.length, ...overrides }
}
export function importLine(overrides: Partial<LigneResultatImport> = {}): LigneResultatImport {
  return {
    ligne: 2,
    produit_saisi: "router",
    quantite_saisie: "2",
    motif_saisi: null,
    produit_id: 42,
    produit_nom: "Routeur",
    variation: 2,
    stock_avant: 10,
    stock_apres: 12,
    statut: "applique",
    code_erreur: null,
    message: null,
    raison_ignore: null,
    stock_fichier: null,
    stock_modifie: false,
    ...overrides,
  }
}
export function failedLine(overrides: Partial<LigneResultatImport> = {}): LigneResultatImport {
  return importLine({
    produit_id: null,
    produit_nom: null,
    variation: null,
    stock_avant: null,
    stock_apres: null,
    statut: "echec",
    code_erreur: "produit_introuvable",
    message: "Produit introuvable",
    ...overrides,
  })
}
export function importResponse(
  lignes: LigneResultatImport[] = [importLine()],
  overrides: Partial<ReponseImportStock> = {},
): ReponseImportStock {
  const count = (statut: LigneResultatImport["statut"]) => lignes.filter(l => l.statut === statut).length
  return {
    importation_id: "11111111-1111-4111-8111-111111111111",
    apercu: false,
    mode: "reception",
    total_lignes: lignes.length,
    appliquees: count("applique"),
    ignorees: count("ignore"),
    echouees: count("echec"),
    inclure_stock_modifie: false,
    stock_modifiees: lignes.filter(l => l.stock_modifie).length,
    lignes,
    ...overrides,
  }
}
/** A backend preview: same shape as a result, but nothing was written and there is no import id. */
export function previewResponse(
  lignes: LigneResultatImport[] = [importLine()],
  overrides: Partial<ReponseImportStock> = {},
): ReponseImportStock {
  return importResponse(lignes, { importation_id: null, apercu: true, ...overrides })
}
export function seedStockSession(role = "direction") {
  useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
    userId: "u1",
    membreId: "m1",
    nom: "Admin",
    courriel: "admin@example.com",
    roles: [role],
  })
}

export interface CapturedImport {
  key: string | undefined
  fields: Record<string, string>
  file: { name: string; text: string } | undefined
  signal: AbortSignal | undefined
}
const importFetchBridge: {
  current: ((url: string, options?: Record<string, any>) => Promise<unknown>) | undefined
} = {
  current: undefined,
}
/** Spec-side half of the fake: swaps useApiWrite so it calls the bridge, prefixing /api/v1 like the real one. */
export function resetImportFetch() {
  importFetchBridge.current = undefined
}
// fallow-ignore-next-line unused-export
export function bridgedApiWrite(original: () => (path: string, options?: any) => Promise<unknown>) {
  return () => (path: string, options?: any) =>
    importFetchBridge.current ? importFetchBridge.current(`/api/v1${path}`, options) : original()(path, options)
}
/** The nuxt test env drops multipart bodies on registered endpoints, so the write client is faked instead. */
export function fakeImportFetch(respond: (call: number) => unknown, captured: CapturedImport[]) {
  const fake = vi.fn(async (url: string, options: Record<string, any> = {}) => {
    expect(url).toBe(STOCK_IMPORT_PATH)
    expect(options.method).toBe("POST")
    expect(options.retry).toBe(0)
    const headers = new Headers(options.headers)
    expect(headers.has("content-type")).toBe(false)
    expect(options.body).toBeInstanceOf(FormData)
    const body = options.body as FormData
    const fields: Record<string, string> = {}
    for (const [name, value] of body.entries()) if (name !== "fichier") fields[name] = String(value)
    const file = body.get("fichier") as File | null
    captured.push({
      key: headers.get("cle-idempotence") ?? undefined,
      fields,
      file: file ? { name: file.name, text: await file.text() } : undefined,
      signal: options.signal,
    })
    return respond(captured.length)
  })
  importFetchBridge.current = fake
  return fake
}

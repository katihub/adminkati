import type { ProductAssetSource } from "./product-assets"

export type PersistedProductRead =
  | { kind: "found"; product: ProductAssetSource }
  | { kind: "denied" }
  | { kind: "unreadable" }

export interface PersistedProductReadDeps {
  apiBaseUrl: string
  sharedSecret?: string
  fetchJson: (url: string, options: { headers: Record<string, string>; timeout: number }) => Promise<unknown>
}

const READ_TIMEOUT_MS = 8_000

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function statusOf(error: unknown): number {
  const record = asRecord(error)
  const response = asRecord(record?.response)
  for (const candidate of [record?.status, record?.statusCode, response?.status]) {
    if (typeof candidate === "number") return candidate
  }
  return 0
}

function toImages(value: unknown): ProductAssetSource["images"] {
  if (!Array.isArray(value)) return []
  const images: ProductAssetSource["images"] = []
  for (const row of value) {
    const image = asRecord(row)
    if (typeof image?.rang === "number" && typeof image.url === "string") {
      images.push({ rang: image.rang, url: image.url })
    }
  }
  return images
}

/**
 * Reads a persisted product through the existing admin endpoint with the operator's own fresh token, so the
 * backend decides whether they may see it. Only the asset fields are kept: `url_source`, descriptions and
 * everything else stay behind this function, and the browser's cookie is never forwarded.
 */
export async function readPersistedProduct(
  productId: number,
  accessToken: string,
  deps: PersistedProductReadDeps,
): Promise<PersistedProductRead> {
  const headers: Record<string, string> = { authorization: `Bearer ${accessToken}`, accept: "application/json" }
  if (deps.sharedSecret) headers["x-secret-service"] = deps.sharedSecret

  let payload: unknown
  try {
    payload = await deps.fetchJson(`${deps.apiBaseUrl}/v1/catalogue/administration/produits/${productId}`, {
      headers,
      timeout: READ_TIMEOUT_MS,
    })
  } catch (error) {
    const status = statusOf(error)
    return status === 401 || status === 403 ? { kind: "denied" } : { kind: "unreadable" }
  }

  const product = asRecord(payload)
  if (!product) return { kind: "unreadable" }
  return {
    kind: "found",
    product: {
      images: toImages(product.images),
      fiche_pdf: typeof product.fiche_pdf === "string" ? product.fiche_pdf : null,
    },
  }
}

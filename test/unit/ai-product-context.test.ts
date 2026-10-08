import type { PersistedProductReadDeps } from "../../server/utils/ai/product-context"
import { describe, expect, it, vi } from "vitest"
import { readPersistedProduct } from "../../server/utils/ai/product-context"

const PRODUCT_ID = 42
const ACCESS_TOKEN = "user-access-token"

const FULL_PAYLOAD = {
  id: PRODUCT_ID,
  nom: "Onduleur APC",
  images: [
    { rang: 1, url: "https://cdn.example.com/a.jpg", alt: null, octets: 1 },
    { rang: 2, url: "https://cdn.example.com/b.jpg", alt: "x", octets: 2 },
  ],
  fiche_pdf: "produits/abc.pdf",
  url_source: "https://supplier.example/page",
  caracteristiques: [{ nom: "Puissance", valeur: "1000VA" }],
  description: "Une description complete du produit.",
}

function createDeps(
  fetchJson: PersistedProductReadDeps["fetchJson"],
  overrides: Partial<Omit<PersistedProductReadDeps, "fetchJson">> = {},
): PersistedProductReadDeps {
  return { apiBaseUrl: "https://backend.example", sharedSecret: "partage", fetchJson, ...overrides }
}

describe("readPersistedProduct", () => {
  describe("the outgoing request", () => {
    it("calls fetchJson exactly once with the administration read URL", async () => {
      const fetchJson = vi.fn().mockResolvedValue(FULL_PAYLOAD)
      await readPersistedProduct(PRODUCT_ID, ACCESS_TOKEN, createDeps(fetchJson))

      expect(fetchJson).toHaveBeenCalledTimes(1)
      const [url] = fetchJson.mock.calls[0]!
      expect(url).toBe(`https://backend.example/v1/catalogue/administration/produits/${PRODUCT_ID}`)
    })

    it("authenticates with the fresh bearer token", async () => {
      const fetchJson = vi.fn().mockResolvedValue(FULL_PAYLOAD)
      await readPersistedProduct(PRODUCT_ID, ACCESS_TOKEN, createDeps(fetchJson))

      const [, options] = fetchJson.mock.calls[0]!
      expect(options.headers.authorization).toBe(`Bearer ${ACCESS_TOKEN}`)
    })

    it("identifies this server to the backend when a shared secret is configured", async () => {
      const fetchJson = vi.fn().mockResolvedValue(FULL_PAYLOAD)
      await readPersistedProduct(PRODUCT_ID, ACCESS_TOKEN, createDeps(fetchJson, { sharedSecret: "partage" }))

      const [, options] = fetchJson.mock.calls[0]!
      expect(options.headers["x-secret-service"]).toBe("partage")
    })

    it("sends no shared-secret header when none is configured", async () => {
      const fetchJson = vi.fn().mockResolvedValue(FULL_PAYLOAD)
      await readPersistedProduct(PRODUCT_ID, ACCESS_TOKEN, createDeps(fetchJson, { sharedSecret: undefined }))

      const [, options] = fetchJson.mock.calls[0]!
      expect(options.headers).not.toHaveProperty("x-secret-service")
    })

    it("carries no browser session state such as a cookie", async () => {
      const fetchJson = vi.fn().mockResolvedValue(FULL_PAYLOAD)
      await readPersistedProduct(PRODUCT_ID, ACCESS_TOKEN, createDeps(fetchJson))

      const [, options] = fetchJson.mock.calls[0]!
      const headerNames = Object.keys(options.headers).map(name => name.toLowerCase())
      expect(headerNames).not.toContain("cookie")
      expect(headerNames.every(name => ["authorization", "x-secret-service", "accept"].includes(name))).toBe(true)
    })

    it("bounds the request with a short, positive timeout", async () => {
      const fetchJson = vi.fn().mockResolvedValue(FULL_PAYLOAD)
      await readPersistedProduct(PRODUCT_ID, ACCESS_TOKEN, createDeps(fetchJson))

      const [, options] = fetchJson.mock.calls[0]!
      expect(typeof options.timeout).toBe("number")
      expect(options.timeout).toBeGreaterThan(0)
      expect(options.timeout).toBeLessThanOrEqual(15_000)
    })
  })

  describe("the mapped result", () => {
    it("keeps only images (rang, url) and fiche_pdf, dropping url_source and every other field", async () => {
      const fetchJson = vi.fn().mockResolvedValue(FULL_PAYLOAD)
      const result = await readPersistedProduct(PRODUCT_ID, ACCESS_TOKEN, createDeps(fetchJson))

      expect(result).toEqual({
        kind: "found",
        product: {
          images: [
            { rang: 1, url: "https://cdn.example.com/a.jpg" },
            { rang: 2, url: "https://cdn.example.com/b.jpg" },
          ],
          fiche_pdf: "produits/abc.pdf",
        },
      })
    })

    it("defaults missing images to an empty array", async () => {
      const fetchJson = vi.fn().mockResolvedValue({ ...FULL_PAYLOAD, images: undefined })
      const result = await readPersistedProduct(PRODUCT_ID, ACCESS_TOKEN, createDeps(fetchJson))

      if (result.kind !== "found") throw new Error("expected a found result")
      expect(result.product.images).toEqual([])
    })

    it("drops an image row whose url is not a string", async () => {
      const fetchJson = vi.fn().mockResolvedValue({
        ...FULL_PAYLOAD,
        images: [
          { rang: 1, url: 12345 },
          { rang: 2, url: "https://cdn.example.com/b.jpg" },
        ],
      })
      const result = await readPersistedProduct(PRODUCT_ID, ACCESS_TOKEN, createDeps(fetchJson))

      if (result.kind !== "found") throw new Error("expected a found result")
      expect(result.product.images).toEqual([{ rang: 2, url: "https://cdn.example.com/b.jpg" }])
    })

    it("drops an image row whose rang is not a number", async () => {
      const fetchJson = vi.fn().mockResolvedValue({
        ...FULL_PAYLOAD,
        images: [
          { rang: "1", url: "https://cdn.example.com/a.jpg" },
          { rang: 2, url: "https://cdn.example.com/b.jpg" },
        ],
      })
      const result = await readPersistedProduct(PRODUCT_ID, ACCESS_TOKEN, createDeps(fetchJson))

      if (result.kind !== "found") throw new Error("expected a found result")
      expect(result.product.images).toEqual([{ rang: 2, url: "https://cdn.example.com/b.jpg" }])
    })

    it("defaults a non-string fiche_pdf to null", async () => {
      const fetchJson = vi.fn().mockResolvedValue({ ...FULL_PAYLOAD, fiche_pdf: 123 })
      const result = await readPersistedProduct(PRODUCT_ID, ACCESS_TOKEN, createDeps(fetchJson))

      if (result.kind !== "found") throw new Error("expected a found result")
      expect(result.product.fiche_pdf).toBeNull()
    })
  })

  describe("authorization failures", () => {
    it.each([
      ["a plain status field", { status: 403 }],
      ["an h3-style statusCode field", { statusCode: 403 }],
      ["an ofetch-style nested response.status field", { response: { status: 403 } }],
      ["a 401 statusCode", { statusCode: 401 }],
    ])("maps %s to a denied result", async (_label, error) => {
      const fetchJson = vi.fn().mockRejectedValue(error)
      const result = await readPersistedProduct(PRODUCT_ID, ACCESS_TOKEN, createDeps(fetchJson))

      expect(result).toEqual({ kind: "denied" })
    })
  })

  describe("every other failure is unreadable, never thrown", () => {
    it.each([
      ["a 404 status", { status: 404 }],
      ["a 500 status", { status: 500 }],
      ["a network TypeError", new TypeError("fetch failed")],
      ["a timeout error", Object.assign(new Error("The operation timed out"), { name: "TimeoutError" })],
    ])("maps %s to an unreadable result without throwing", async (_label, error) => {
      const fetchJson = vi.fn().mockRejectedValue(error)
      await expect(readPersistedProduct(PRODUCT_ID, ACCESS_TOKEN, createDeps(fetchJson))).resolves.toEqual({
        kind: "unreadable",
      })
    })

    it.each([
      ["null", null],
      ["a plain string", "just a string"],
      ["an array", []],
    ])("maps a %s payload to an unreadable result", async (_label, payload) => {
      const fetchJson = vi.fn().mockResolvedValue(payload)
      const result = await readPersistedProduct(PRODUCT_ID, ACCESS_TOKEN, createDeps(fetchJson))

      expect(result).toEqual({ kind: "unreadable" })
    })

    it("never leaks the rejected error's message into the result", async () => {
      const fetchJson = vi.fn().mockRejectedValue(new Error("internal backend secret detail"))
      const result = await readPersistedProduct(PRODUCT_ID, ACCESS_TOKEN, createDeps(fetchJson))

      expect(JSON.stringify(result)).not.toContain("internal backend secret detail")
    })
  })
})

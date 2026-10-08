import type { ProductAssetSource, ProductLookup } from "../../server/utils/ai/product-assets"
import { describe, expect, it } from "vitest"
import { MAX_PRODUCT_COPY_IMAGES, isSafeImageUrl, resolveProductAssets } from "../../server/utils/ai/product-assets"

describe("isSafeImageUrl", () => {
  it.each([
    ["an ordinary https url with a path and query string", "https://cdn.example.com/p/1.jpg?w=800", true],
    ["an explicit default https port", "https://cdn.example.com:443/a.jpg", true],
    ["plain http", "http://cdn.example.com/a.jpg", false],
    ["ftp", "ftp://cdn.example.com/a.jpg", false],
    ["a data url", "data:image/png;base64,aGVsbG8=", false],
    ["a javascript url", "javascript:alert(1)", false],
    ["a blob url", "blob:https://cdn.example.com/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d", false],
    ["a file url", "file:///etc/passwd", false],
    ["a protocol-relative url", "//cdn.example.com/a.jpg", false],
    ["a relative path", "/images/a.jpg", false],
    ["an empty string", "", false],
    ["unparseable garbage", "not a url at all", false],
    ["embedded credentials", "https://user:pass@cdn.example.com/a.jpg", false],
    ["localhost", "https://localhost/a.jpg", false],
    ["a .localhost subdomain", "https://foo.localhost/a.jpg", false],
    ["an mDNS .local host", "https://printer.local/a.jpg", false],
    ["an .internal host", "https://db.internal/a.jpg", false],
    ["a single-label hostname", "https://intranet/a.jpg", false],
    ["an IPv4 loopback host", "https://127.0.0.1/a.jpg", false],
    ["an IPv4 10/8 private host", "https://10.0.0.5/a.jpg", false],
    ["an IPv4 192.168/16 private host", "https://192.168.1.10/a.jpg", false],
    ["the IPv4 link-local metadata address", "https://169.254.169.254/a.jpg", false],
    ["a public IPv4 host", "https://8.8.8.8/a.jpg", false],
    ["a decimal IPv4 host that URL parsing normalises to a dotted address", "https://2130706433/a.jpg", false],
    ["a hex-octet IPv4 host that URL parsing normalises to a dotted address", "https://0x7f.0.0.1/a.jpg", false],
    ["an IPv6 loopback host", "https://[::1]/a.jpg", false],
    ["an IPv6 link-local host", "https://[fe80::1]/a.jpg", false],
    ["a non-default explicit port", "https://cdn.example.com:8443/a.jpg", false],
    ["a url past the 2000-character ceiling", `https://cdn.example.com/${"a".repeat(2000)}.jpg`, false],
  ] as const)("%s", (_label, url, expected) => {
    expect(isSafeImageUrl(url)).toBe(expected)
  })
})

describe("resolveProductAssets", () => {
  it("returns no assets and no warnings for a new product that has nothing to look up", () => {
    const lookup: ProductLookup = { kind: "absent" }

    expect(resolveProductAssets(lookup)).toMatchObject({ imageUrls: [], datasheetUsed: false, warnings: [] })
  })

  it("warns about both the image and the datasheet when the persisted product could not be read", () => {
    const lookup: ProductLookup = { kind: "unreadable" }

    expect(resolveProductAssets(lookup)).toMatchObject({
      imageUrls: [],
      datasheetUsed: false,
      warnings: ["image_unavailable", "datasheet_unavailable"],
    })
  })

  it("orders image urls by ascending rang regardless of input order", () => {
    const lookup: ProductLookup = {
      kind: "found",
      product: {
        images: [
          { rang: 2, url: "https://cdn.example.com/b.jpg" },
          { rang: 1, url: "https://cdn.example.com/a.jpg" },
        ],
        fiche_pdf: null,
      },
    }

    expect(resolveProductAssets(lookup)).toMatchObject({
      imageUrls: ["https://cdn.example.com/a.jpg", "https://cdn.example.com/b.jpg"],
      datasheetUsed: false,
      warnings: [],
    })
  })

  it("uses only the primary ranked safe image for the primary-auto profile", () => {
    const lookup: ProductLookup = {
      kind: "found",
      product: {
        images: [
          { rang: 2, url: "https://cdn.example.com/b.jpg" },
          { rang: 1, url: "https://cdn.example.com/a.jpg" },
        ],
        fiche_pdf: null,
      },
    }
    const resolveWithProfile = resolveProductAssets as unknown as (
      source: ProductLookup,
      profile: "primary-auto",
    ) => { imageUrls: string[]; imageInputs: Array<{ image_url: string; detail: "auto" | "low" }> }

    expect(resolveWithProfile(lookup, "primary-auto")).toMatchObject({
      imageUrls: ["https://cdn.example.com/a.jpg"],
      imageInputs: [{ image_url: "https://cdn.example.com/a.jpg", detail: "auto" }],
    })
  })

  it("has no warnings for a found product with neither images nor a datasheet", () => {
    const lookup: ProductLookup = { kind: "found", product: { images: [], fiche_pdf: null } }

    expect(resolveProductAssets(lookup)).toMatchObject({ imageUrls: [], datasheetUsed: false, warnings: [] })
  })

  it("skips an unsafe persisted image url and warns, keeping the safe ones", () => {
    const lookup: ProductLookup = {
      kind: "found",
      product: {
        images: [
          { rang: 1, url: "https://cdn.example.com/a.jpg" },
          { rang: 2, url: "http://cdn.example.com/b.jpg" },
        ],
        fiche_pdf: null,
      },
    }

    expect(resolveProductAssets(lookup)).toMatchObject({
      imageUrls: ["https://cdn.example.com/a.jpg"],
      datasheetUsed: false,
      warnings: ["image_unavailable"],
    })
  })

  it("drops all images and warns when every persisted image url is unsafe", () => {
    const lookup: ProductLookup = {
      kind: "found",
      product: {
        images: [
          { rang: 1, url: "http://cdn.example.com/a.jpg" },
          { rang: 2, url: "https://127.0.0.1/b.jpg" },
        ],
        fiche_pdf: null,
      },
    }

    expect(resolveProductAssets(lookup)).toMatchObject({
      imageUrls: [],
      datasheetUsed: false,
      warnings: ["image_unavailable"],
    })
  })

  it(`keeps at most ${MAX_PRODUCT_COPY_IMAGES} safe images without a warning when the overflow is simple truncation`, () => {
    const images = Array.from({ length: 5 }, (_, index) => ({
      rang: index + 1,
      url: `https://cdn.example.com/${index + 1}.jpg`,
    }))
    const lookup: ProductLookup = { kind: "found", product: { images, fiche_pdf: null } }

    const result = resolveProductAssets(lookup)

    expect(result.imageUrls).toEqual([
      "https://cdn.example.com/1.jpg",
      "https://cdn.example.com/2.jpg",
      "https://cdn.example.com/3.jpg",
      "https://cdn.example.com/4.jpg",
    ])
    expect(result.warnings).toEqual([])
  })

  it("warns about the datasheet when fiche_pdf is a storage path, without claiming it was used", () => {
    const lookup: ProductLookup = {
      kind: "found",
      product: { images: [], fiche_pdf: "produits/42/fiche.pdf" },
    }

    expect(resolveProductAssets(lookup)).toMatchObject({
      imageUrls: [],
      datasheetUsed: false,
      warnings: ["datasheet_unavailable"],
    })
  })

  it("orders the image warning before the datasheet warning when both apply", () => {
    const lookup: ProductLookup = {
      kind: "found",
      product: {
        images: [{ rang: 1, url: "http://cdn.example.com/a.jpg" }],
        fiche_pdf: "produits/42/fiche.pdf",
      },
    }

    expect(resolveProductAssets(lookup).warnings).toEqual(["image_unavailable", "datasheet_unavailable"])
  })

  it("never reads or leaks any product field besides images and fiche_pdf", () => {
    const product = {
      images: [{ rang: 1, url: "https://cdn.example.com/a.jpg" }],
      fiche_pdf: null,
      url_source: "https://supplier.example/page",
    } as ProductAssetSource & { url_source: string }
    const lookup: ProductLookup = { kind: "found", product }

    const result = resolveProductAssets(lookup)

    expect(JSON.stringify(result)).not.toContain("https://supplier.example/page")
  })
})

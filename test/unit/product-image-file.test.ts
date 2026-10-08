import { describe, expect, it } from "vitest"
import { PRODUCT_IMAGE_MAX_BYTES, validateProductImageFile } from "../../app/utils/product-image-file"

function makeFile(type: string, size: number): File {
  return new File([new Uint8Array(size)], "photo", { type })
}

describe("validateProductImageFile", () => {
  it.each(["image/jpeg", "image/png", "image/webp", "image/avif"])(
    "accepts a %s file at or under the size cap",
    type => {
      expect(validateProductImageFile(makeFile(type, 1024))).toBeNull()
    },
  )

  it("accepts a file exactly at the size cap", () => {
    expect(validateProductImageFile(makeFile("image/png", PRODUCT_IMAGE_MAX_BYTES))).toBeNull()
  })

  it("rejects a MIME type the backend does not store", () => {
    expect(validateProductImageFile(makeFile("image/gif", 1024))).toBe("products.imageGallery.errors.type")
  })

  it("rejects a file over the size cap", () => {
    expect(validateProductImageFile(makeFile("image/png", PRODUCT_IMAGE_MAX_BYTES + 1))).toBe(
      "products.imageGallery.errors.size",
    )
  })
})

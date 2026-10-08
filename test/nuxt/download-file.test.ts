import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { downloadBlob } from "@/utils/download-file"
import { downloadStockImportFile } from "@/utils/stock-import-files"

interface Click {
  download: string
  href: string
  connectedAtClick: boolean
}
const clicks: Click[] = []
const revoked: string[] = []
const created: Blob[] = []
let originalCreate: typeof URL.createObjectURL
let originalRevoke: typeof URL.revokeObjectURL

describe("saving a file in the browser", () => {
  beforeEach(() => {
    clicks.length = 0
    revoked.length = 0
    created.length = 0
    originalCreate = URL.createObjectURL
    originalRevoke = URL.revokeObjectURL
    URL.createObjectURL = vi.fn((blob: Blob) => {
      created.push(blob)
      return "blob:mock-url"
    })
    URL.revokeObjectURL = vi.fn((url: string) => {
      revoked.push(url)
    })
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      clicks.push({
        download: this.download,
        href: this.getAttribute("href") ?? "",
        connectedAtClick: this.isConnected,
      })
    })
  })
  afterEach(() => {
    URL.createObjectURL = originalCreate
    URL.revokeObjectURL = originalRevoke
    vi.restoreAllMocks()
  })

  it("clicks one anchor pointing at the object URL with the given filename, then releases the URL", () => {
    const blob = new Blob(["a,b"], { type: "text/csv" })
    downloadBlob(blob, "stock-count-2026-10-01-1430.xlsx")

    expect(created).toEqual([blob])
    expect(clicks).toHaveLength(1)
    expect(clicks[0]!.download).toBe("stock-count-2026-10-01-1430.xlsx")
    expect(clicks[0]!.href).toBe("blob:mock-url")
    expect(revoked).toEqual(["blob:mock-url"])
  })

  it("leaves no anchor behind in the document", () => {
    const before = document.querySelectorAll("a").length
    downloadBlob(new Blob(["x"]), "x.csv")
    expect(document.querySelectorAll("a").length).toBe(before)
  })

  it("keeps the stock import file download observable behaviour, as UTF-8 CSV", async () => {
    downloadStockImportFile("product,quantity\n", "template.csv")
    expect(clicks.map(click => [click.download, click.href])).toEqual([["template.csv", "blob:mock-url"]])
    expect(revoked).toEqual(["blob:mock-url"])
    expect(created[0]!.type).toContain("text/csv")
    expect(await created[0]!.text()).toBe("product,quantity\n")
  })
})

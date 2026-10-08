import type { ProductListQuery } from "@/types/api/produits"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { getQuery } from "h3"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { defineComponent, h } from "vue"
import { useStockExport } from "@/composables/useStockExport"
import { seedStockSession } from "./stock-import-fixture"

const PATH = "/api/v1/catalogue/administration/produits/inventaire/export"

interface Reply {
  hold?: Promise<void>
}
const queries: Record<string, unknown>[] = []
let reply: Reply = {}
let stopEndpoint: (() => void) | undefined
const downloads: Array<{ download: string; href: string }> = []
const mounted: Array<{ unmount: () => void }> = []
let originalCreate: typeof URL.createObjectURL
let originalRevoke: typeof URL.revokeObjectURL

function serve() {
  stopEndpoint = registerEndpoint(PATH, {
    method: "GET",
    handler: async event => {
      queries.push(getQuery(event))
      if (reply.hold) await reply.hold
      return new Blob(["product,quantity\nrouter,2"], { type: "text/csv" })
    },
  })
}
async function probe() {
  let exporting!: ReturnType<typeof useStockExport>
  const wrapper = await mountSuspended(
    defineComponent({
      setup() {
        exporting = useStockExport()
        return () => h("div")
      },
    }),
  )
  mounted.push(wrapper)
  return exporting
}
function input(
  overrides: Partial<{ filters: ProductListQuery; mode: "reception" | "count"; format: "csv" | "xlsx" }> = {},
) {
  return { filters: { q: "câble" } as ProductListQuery, mode: "count" as const, format: "xlsx" as const, ...overrides }
}
async function drain() {
  await flushPromises()
  await new Promise(resolve => setTimeout(resolve, 50))
  await flushPromises()
}

describe("useStockExport", () => {
  beforeEach(() => {
    queries.length = 0
    downloads.length = 0
    reply = {}
    seedStockSession()
    originalCreate = URL.createObjectURL
    originalRevoke = URL.revokeObjectURL
    URL.createObjectURL = vi.fn(() => "blob:mock-url")
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push({ download: this.download, href: this.getAttribute("href") ?? "" })
    })
    serve()
  })
  afterEach(() => {
    stopEndpoint?.()
    mounted.splice(0).forEach(wrapper => wrapper.unmount())
    URL.createObjectURL = originalCreate
    URL.revokeObjectURL = originalRevoke
    vi.restoreAllMocks()
    useNuxtApp().$queryClient.clear()
  })

  it("ignores a second export while the first is pending", async () => {
    let release!: () => void
    reply = { hold: new Promise<void>(resolve => (release = resolve)) }
    const exporting = await probe()

    const first = exporting.exporter(input())
    await drain()
    expect(exporting.pending.value).toBe(true)

    const second = exporting.exporter(input({ mode: "reception" }))
    await drain()
    expect(queries).toHaveLength(1)
    await second
    expect(queries).toHaveLength(1)

    release()
    expect(await first).toBe(true)
    await drain()
    expect(queries).toHaveLength(1)
    expect(downloads).toHaveLength(1)
    expect(exporting.pending.value).toBe(false)
  })
})

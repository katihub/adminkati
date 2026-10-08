import type { CapturedImport } from "./stock-import-fixture"
import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { createError } from "h3"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { defineComponent, h } from "vue"
import { useStockImportRun } from "@/composables/useStockImportRun"
import {
  failedLine,
  fakeImportFetch,
  importResponse,
  previewResponse,
  resetImportFetch,
  seedStockSession,
} from "./stock-import-fixture"

mockNuxtImport("useApiWrite", async original =>
  (await import("./stock-import-fixture")).bridgedApiWrite(original as never),
)
const mounted: Array<{ unmount: () => void }> = []
const seen: CapturedImport[] = []

async function drain() {
  await flushPromises()
  await new Promise(resolve => setTimeout(resolve, 30))
  await flushPromises()
}
async function probe() {
  let runner!: ReturnType<typeof useStockImportRun>
  const wrapper = await mountSuspended(
    defineComponent({
      setup() {
        runner = useStockImportRun()
        return () => h("div")
      },
    }),
  )
  mounted.push(wrapper)
  return runner
}
function serve(respond: (call: number) => unknown) {
  fakeImportFetch(respond, seen)
}
function input(overrides: Partial<{ file: File; mode: "reception" | "count"; motif: string }> = {}) {
  return {
    file: new File(["product,quantity\nrouter,2"], "stock.csv", { type: "text/csv" }),
    mode: "reception" as const,
    motif: "Livraison",
    ...overrides,
  }
}
const isPreview = (call: CapturedImport) => call.fields.apercu === "true"
async function reviewed(runner: Awaited<ReturnType<typeof probe>>, overrides: Parameters<typeof input>[0] = {}) {
  await runner.review(input(overrides))
  await drain()
}
describe("stock import review then apply", () => {
  beforeEach(() => {
    seen.length = 0
    seedStockSession()
    useNuxtApp().$queryClient.setDefaultOptions({ queries: { retry: false }, mutations: { retry: false } })
  })
  afterEach(() => {
    resetImportFetch()
    mounted.splice(0).forEach(wrapper => wrapper.unmount())
    vi.restoreAllMocks()
    useNuxtApp().$queryClient.clear()
  })
  describe("apply", () => {
    it("retry after a 502 apply re-sends the same file, fields and the SAME key, then settles", async () => {
      let applies = 0
      serve(call => {
        if (isPreview(seen[call - 1]!)) return previewResponse()
        if (++applies === 1) throw createError({ statusCode: 502 })
        return importResponse([failedLine()])
      })
      const runner = await probe()
      await reviewed(runner, { motif: "Quai sud" })
      await runner.apply()
      expect(runner.canRetry.value).toBe(true)
      await runner.retry()
      expect(seen).toHaveLength(3)
      expect(seen[2]!.key).toBe(seen[1]!.key)
      expect(seen[2]!.fields).toEqual(seen[1]!.fields)
      expect(seen[2]!.file).toEqual(seen[1]!.file)
      expect(runner.state.value).toBe("result")
      expect(runner.result.value?.echouees).toBe(1)
    })
  })
})

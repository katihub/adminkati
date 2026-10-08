import { Buffer } from "node:buffer"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { useMutation } from "@tanstack/vue-query"
import { flushPromises } from "@vue/test-utils"
import { getRequestHeaders, readRawBody } from "h3"
import { describe, expect, it } from "vitest"
import { defineComponent, h } from "vue"
import { useApiWrite } from "@/composables/useApi"

describe("admin API unsafe transport", () => {
  it("keeps raw image bytes and caller headers while using the same-origin API path", async () => {
    const payload = new Uint8Array([0, 1, 127, 255])
    let observed: { body: Buffer | undefined; headers: Record<string, string | undefined> } | undefined

    const cleanup = registerEndpoint("/api/v1/catalogue/administration/produits/42/images", {
      method: "POST",
      handler: async event => {
        observed = { body: await readRawBody(event, false), headers: getRequestHeaders(event) }
        return { accepted: true }
      },
    })

    let result: { accepted: boolean } | undefined
    const Probe = defineComponent({
      async setup() {
        result = await useApiWrite()<{ accepted: boolean }>("/catalogue/administration/produits/42/images", {
          method: "POST",
          headers: { "Content-Length": String(payload.byteLength), "Content-Type": "image/png" },
          body: payload,
        })
        return () => h("div")
      },
    })

    const wrapper = await mountSuspended(Probe)

    expect(result).toEqual({ accepted: true })
    expect(observed?.headers["content-type"]).toBe("image/png")
    expect(observed?.body).toEqual(Buffer.from(payload))
    expect(Object.keys(observed?.headers ?? {}).includes("csrf-token")).toBe(true)

    cleanup()
    wrapper.unmount()
  })

  it("clears the authenticated query cache after an unauthorized mutation", async () => {
    const queryClient = useNuxtApp().$queryClient
    queryClient.setQueryData(["sentinel"], "private")

    const Probe = defineComponent({
      async setup() {
        const mutation = useMutation({
          mutationFn: async () => {
            throw Object.assign(new Error("unauthorized"), { statusCode: 401 })
          },
        })
        await mutation.mutateAsync().catch(() => undefined)
        return () => h("div")
      },
    })

    const wrapper = await mountSuspended(Probe)
    await flushPromises()

    expect(queryClient.getQueryData(["sentinel"])).toBeUndefined()

    wrapper.unmount()
    queryClient.clear()
  })

  it("leaves unrelated cached data after an ordinary mutation failure", async () => {
    const queryClient = useNuxtApp().$queryClient
    queryClient.setQueryData(["sentinel"], "private")

    const Probe = defineComponent({
      async setup() {
        const mutation = useMutation({
          mutationFn: async () => {
            throw Object.assign(new Error("invalid input"), { statusCode: 422 })
          },
        })
        await mutation.mutateAsync().catch(() => undefined)
        return () => h("div")
      },
    })

    const wrapper = await mountSuspended(Probe)
    await flushPromises()

    expect(queryClient.getQueryData(["sentinel"])).toBe("private")

    wrapper.unmount()
    queryClient.clear()
  })
})

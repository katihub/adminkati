import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useLegalClosure, useLegalClosureMutations } from "@/composables/useLegalClosure"

describe("legal closure API", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("reads the persisted P0 status", async () => {
    const cleanup = registerEndpoint("/api/v1/marketplace/deploiement/cloture-juridique", {
      method: "GET",
      handler: () => ({ close: false, bloquants: ["preuve manquante : matrice_kyc"], versions: {}, preuves: [] }),
    })
    let query: ReturnType<typeof useLegalClosure> | undefined
    const Host = defineComponent({
      setup() {
        query = useLegalClosure()
        return () => h("div")
      },
    })
    const wrapper = await mountSuspended(Host)
    await vi.waitFor(() => expect(query?.data.value?.close).toBe(false))
    expect(query?.data.value?.bloquants).toContain("preuve manquante : matrice_kyc")
    wrapper.unmount()
    cleanup()
  })

  it("posts a signed proof and refreshes the status", async () => {
    const body = vi.fn()
    const cleanup = registerEndpoint("/api/v1/marketplace/deploiement/cloture-juridique/preuves", {
      method: "POST",
      handler: async event => {
        body(await readBody(event))
        return { id: "proof-1" }
      },
    })
    let mutations: ReturnType<typeof useLegalClosureMutations> | undefined
    const Host = defineComponent({
      setup() {
        mutations = useLegalClosureMutations()
        return () => h("div")
      },
    })
    const wrapper = await mountSuspended(Host)
    mutations!.register.mutate({
      type: "identite_exploitant",
      version: "1.0",
      referenceDocument: "P0-ID-2026-001",
      empreinteSha256: "a".repeat(64),
      valideLe: "2026-10-11T08:00:00.000Z",
      validePar: [{ fonction: "representant_legal", nom: "Direction KatiHub" }],
    })
    await flushPromises()
    await vi.waitFor(() => expect(body).toHaveBeenCalled())
    expect(body).toHaveBeenCalledWith(expect.objectContaining({ type: "identite_exploitant" }))
    wrapper.unmount()
    cleanup()
  })
})

import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { focusManager } from "@tanstack/vue-query"
import { flushPromises } from "@vue/test-utils"
import { describe, expect, it } from "vitest"

describe("authenticated identity", () => {
  it("revalidates the seeded identity on mount and window focus", async () => {
    const queryClient = useNuxtApp().$queryClient
    queryClient.setQueryData(["v1", "moi"], {
      userId: "u1",
      membreId: "m1",
      nom: "Ada",
      courriel: "ada@example.com",
      roles: ["direction"],
    })
    let calls = 0
    const cleanup = registerEndpoint("/api/v1/moi", {
      handler: () => {
        calls += 1
        return {
          type: "equipe",
          userId: "u1",
          membreId: "m1",
          nom: "Ada",
          courriel: "ada@example.com",
          roles: ["direction"],
        }
      },
    })
    const { default: App } = await import("@/app.vue")
    const wrapper = await mountSuspended(App, { attachTo: document.body, route: "/" })
    await flushPromises()

    expect(calls).toBe(1)

    focusManager.setFocused(false)
    focusManager.setFocused(true)
    await flushPromises()

    expect(calls).toBe(2)

    cleanup()
    wrapper.unmount()
    queryClient.clear()
  })
})

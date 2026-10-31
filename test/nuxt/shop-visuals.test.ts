import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import ShopVisuals from "@/components/operations/ShopVisuals/ShopVisuals.vue"

const SHOP = "11111111-1111-4111-8111-111111111111"
const shop = { id: SHOP, nom: "NowTech", logoUrl: "https://cdn/logo.png", banniereUrl: null, telephone: "699 00 00 00" }
let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach(cleanup => cleanup())
  cleanups = []
  document.body.innerHTML = ""
})

describe("shop visuals in the seller record", () => {
  it("shows the logo and public phone, and lets the direction remove the logo with a reason", async () => {
    const bodies: unknown[] = []
    cleanups.push(
      registerEndpoint(`/api/v1/vendeurs/boutiques/${SHOP}/visuels/logo/retrait`, {
        method: "POST",
        handler: async event => {
          bodies.push(await readBody(event))
          return { id: SHOP, logoUrl: null, banniereUrl: null }
        },
      }),
    )
    const wrapper = await mountSuspended(ShopVisuals, {
      attachTo: document.body,
      props: { shop, sellerId: "v1", canRemove: true },
    })
    expect(wrapper.find("img").attributes("src")).toBe("https://cdn/logo.png")
    expect(wrapper.text()).toContain("699 00 00 00")
    // No banner: nothing to remove there.
    expect(wrapper.find("[data-testid='shop-visual-remove-banniere']").exists()).toBe(false)

    await wrapper.get("[data-testid='shop-visual-remove-logo']").trigger("click")
    await flushPromises()
    const reason = document.body.querySelector<HTMLTextAreaElement>("[data-testid='shop-visual-reason']")!
    reason.value = "Image sans rapport avec la boutique"
    reason.dispatchEvent(new Event("input"))
    await flushPromises()
    document.body.querySelector<HTMLButtonElement>("[data-testid='shop-visual-confirm']")!.click()

    await vi.waitFor(() => expect(bodies).toEqual([{ motif: "Image sans rapport avec la boutique" }]))
  })

  it("offers no removal outside the direction", async () => {
    const wrapper = await mountSuspended(ShopVisuals, { props: { shop, sellerId: "v1", canRemove: false } })
    expect(wrapper.find("[data-testid='shop-visual-remove-logo']").exists()).toBe(false)
  })
})

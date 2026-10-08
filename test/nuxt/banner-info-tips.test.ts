import type { BanniereAdmin, EmplacementBanniere } from "@/types/api/vitrine"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import ContentBannerEmplacementField from "@/components/content/BannerEmplacementField.vue"
import ContentBannerGroup from "@/components/content/BannerGroup.vue"

const PRINCIPAL_HINT = "The large carousel at the top of the home page. Its artwork must be wider than it is tall."
const PROMO_HINT = "The carousel beside it. Any artwork format."

function mountGroup(
  emplacement: EmplacementBanniere,
  overrides: { banners?: BanniereAdmin[]; canWrite?: boolean } = {},
) {
  return mountSuspended(ContentBannerGroup, {
    props: {
      emplacement,
      banners: [],
      canWrite: false,
      selectedId: null,
      hasActiveFilters: false,
      isReordering: false,
      ...overrides,
    },
    attachTo: document.body,
  })
}

describe("banner placement hints", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  describe("carousel headings", () => {
    it.each([
      ["principal", "Main banner", PRINCIPAL_HINT],
      ["promo", "Promo", PROMO_HINT],
    ] as const)("keeps the %s hint behind an info icon beside its title", async (emplacement, title, hint) => {
      const wrapper = await mountGroup(emplacement)
      const heading = wrapper.get("[data-testid='banner-group-title']")
      const info = wrapper.get("[data-testid='banner-group-info']")

      expect(heading.text()).toBe(title)
      expect(info.element.parentElement).toBe(heading.element.parentElement)
      expect(document.body.textContent).not.toContain(hint)

      await info.trigger("focus")
      await flushPromises()

      expect(document.body.textContent).toContain(hint)

      wrapper.unmount()
    })
  })

  describe("placement choice in the banner form", () => {
    it("puts each option's hint behind an info icon next to its label", async () => {
      const wrapper = await mountSuspended(ContentBannerEmplacementField, {
        props: { modelValue: "principal" },
        attachTo: document.body,
      })

      expect(wrapper.text()).not.toContain(PRINCIPAL_HINT)
      expect(wrapper.text()).not.toContain(PROMO_HINT)

      await wrapper.get("[data-testid='banner-form-emplacement-info-promo']").trigger("focus")
      await flushPromises()

      expect(document.body.textContent).toContain(PROMO_HINT)

      wrapper.unmount()
    })

    it("still switches placement when an option is chosen", async () => {
      const wrapper = await mountSuspended(ContentBannerEmplacementField, {
        props: { modelValue: "principal" },
        attachTo: document.body,
      })

      await wrapper.get("[data-testid='banner-form-emplacement-promo']").setValue(true)

      expect(wrapper.emitted("update:modelValue")).toEqual([["promo"]])

      wrapper.unmount()
    })
  })
})

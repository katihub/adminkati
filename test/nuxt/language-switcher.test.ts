import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { nextTick } from "vue"
import LanguageSwitcher from "@/components/LanguageSwitcher.vue"

describe("languageSwitcher", () => {
  it("shows the current language and the supported locale choices", async () => {
    const wrapper = await mountSuspended(LanguageSwitcher, {
      attachTo: document.body,
    })

    expect(wrapper.get("[data-testid='language-switcher-trigger']").text()).toContain("English")
    expect(document.body.querySelector("[data-testid='language-switcher-option-en']")).toBeNull()

    await wrapper.get("[data-testid='language-switcher-trigger']").trigger("click")
    await nextTick()

    expect(document.body.querySelector("[data-testid='language-switcher-option-en']")).not.toBeNull()
    expect(document.body.querySelector("[data-testid='language-switcher-option-fr']")).not.toBeNull()

    wrapper.unmount()
  })
})

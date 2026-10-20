import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
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

  it("switches locale from the admin header while preserving the current route and query", async () => {
    window.localStorage.clear()
    useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
      userId: "u1",
      membreId: "m1",
      nom: "Admin",
      courriel: "admin@example.com",
      roles: ["direction"],
    })
    const { default: App } = await import("@/app.vue")
    const wrapper = await mountSuspended(App, {
      attachTo: document.body,
      route: "/products?search=phone&page=2",
    })
    await flushPromises()

    const trigger = wrapper.get("header [data-testid='language-switcher-trigger']")
    expect(trigger.attributes("aria-label")).toBe("Language")
    await trigger.trigger("click")

    const frenchOption = document.body.querySelector("[data-testid='language-switcher-option-fr']")
    expect(frenchOption).not.toBeNull()
    expect(frenchOption).not.toBeNull()
    const languageMenu = wrapper.findComponent({ name: "LanguageSwitcher" })
    const frenchMenuItem = languageMenu
      .findAllComponents({ name: "DropdownMenuItem" })
      .find(item => item.attributes("data-testid") === "language-switcher-option-fr")
    expect(frenchMenuItem).toBeDefined()
    await frenchMenuItem?.trigger("click")
    await flushPromises()

    expect(useRouter().currentRoute.value.path).toBe("/fr/produits")
    expect(useRouter().currentRoute.value.query).toEqual({ search: "phone", page: "2" })
    expect(wrapper.get("header [data-testid='language-switcher-trigger']").text()).toContain("Français")
    expect(window.localStorage.getItem("NT-LANG")).toBe("fr")

    wrapper.unmount()
    window.localStorage.clear()
    useNuxtApp().$queryClient.clear()
  })
})

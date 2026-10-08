import type { BanniereAdmin } from "@/types/api/vitrine"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"
import ContentPage from "@/pages/content.vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

function makeBanner(overrides: Partial<BanniereAdmin> = {}): BanniereAdmin {
  return {
    id: 1,
    emplacement: "principal",
    ordre: 1,
    active: true,
    fichier_large: "bannieres/large-1.jpg",
    largeur_large: 1600,
    hauteur_large: 600,
    fichier_mobile: "bannieres/mobile-1.jpg",
    largeur_mobile: 800,
    hauteur_mobile: 900,
    href: "/categorie/promo",
    libelle: "Promo rentree",
    alt: "Chaussures en cuir noires",
    focus: 50,
    creee_le: "2026-08-01T00:00:00.000Z",
    modifiee_le: "2026-08-15T00:00:00.000Z",
    modifiee_par: null,
    url_large: "https://cdn.example.com/branding/bannieres/large-1.jpg",
    url_mobile: "https://cdn.example.com/branding/bannieres/mobile-1.jpg",
    ...overrides,
  }
}

function seedSession() {
  useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
    userId: "u1",
    membreId: "m1",
    nom: "Admin",
    courriel: "admin@example.com",
    roles: ["direction"],
  })
}

function seedBanners(banners: BanniereAdmin[]) {
  useNuxtApp().$queryClient.setQueryData(apiQueryKeys.banners.all, banners)
}

describe("banner panel form footer", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("associates the footer's save button with the form by id, so it submits the same form it sits outside of", async () => {
    seedSession()
    seedBanners([makeBanner()])

    const wrapper = await mountSuspended(ContentPage, { route: "/content?new=1", attachTo: document.body })
    await flushPromises()

    const form = document.body.querySelector<HTMLFormElement>("[data-testid='banner-form']")
    const saveButton = document.body.querySelector<HTMLButtonElement>(
      "[data-testid='banner-panel-form-actions'] [data-testid='banner-form-save']",
    )

    expect(form?.id).toBeTruthy()
    expect(saveButton?.getAttribute("form")).toBe(form?.id)

    wrapper.unmount()
  })

  it("disables save in create mode until the large artwork is staged", async () => {
    seedSession()
    seedBanners([makeBanner()])

    const wrapper = await mountSuspended(ContentPage, { route: "/content?new=1", attachTo: document.body })
    await flushPromises()

    const saveButton = document.body.querySelector<HTMLButtonElement>(
      "[data-testid='banner-panel-form-actions'] [data-testid='banner-form-save']",
    )
    expect(saveButton?.disabled).toBe(true)

    wrapper.unmount()
  })

  it("closes the create panel when the footer's cancel control resets the form", async () => {
    seedSession()
    seedBanners([makeBanner()])

    const wrapper = await mountSuspended(ContentPage, { route: "/content?new=1", attachTo: document.body })
    await flushPromises()

    document.body
      .querySelector<HTMLFormElement>("[data-testid='banner-form']")
      ?.dispatchEvent(new Event("reset", { bubbles: true, cancelable: true }))
    await flushPromises()

    await vi.waitFor(() => expect(document.body.querySelector("[data-testid='banner-panel']")).toBeNull())

    wrapper.unmount()
  })
})

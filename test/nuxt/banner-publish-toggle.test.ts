import type { BanniereAdmin } from "@/types/api/vitrine"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody } from "h3"
import { afterEach, describe, expect, it } from "vitest"
import ContentPage from "@/pages/content.vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

let idCounter = 0

function makeBanner(overrides: Partial<BanniereAdmin> = {}): BanniereAdmin {
  idCounter += 1
  return {
    id: idCounter,
    emplacement: "principal",
    ordre: idCounter,
    active: true,
    fichier_large: `bannieres/large-${idCounter}.jpg`,
    largeur_large: 1600,
    hauteur_large: 600,
    fichier_mobile: `bannieres/mobile-${idCounter}.jpg`,
    largeur_mobile: 800,
    hauteur_mobile: 900,
    href: "/categorie/promo",
    libelle: `Banner ${idCounter}`,
    alt: `Alt text ${idCounter}`,
    focus: 50,
    creee_le: "2026-08-01T00:00:00.000Z",
    modifiee_le: "2026-08-15T00:00:00.000Z",
    modifiee_par: null,
    url_large: `https://cdn.example.com/branding/bannieres/large-${idCounter}.jpg`,
    url_mobile: `https://cdn.example.com/branding/bannieres/mobile-${idCounter}.jpg`,
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

describe("banner publish toggle", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("sends only the toggled active field, nothing else, when the publish switch is toggled off", async () => {
    seedSession()
    const banner = makeBanner({ active: true })
    seedBanners([banner])

    let observedBody: unknown
    const cleanup = registerEndpoint(`/api/v1/vitrine/administration/bannieres/${banner.id}`, {
      method: "PATCH",
      handler: async event => {
        observedBody = await readBody(event)
        return { ...banner, active: false }
      },
    })

    const wrapper = await mountSuspended(ContentPage, {
      route: `/content?banner=${banner.id}`,
      attachTo: document.body,
    })
    await flushPromises()

    const toggle = document.body.querySelector<HTMLButtonElement>("[data-testid='banner-panel-publish-toggle']")
    expect(toggle).not.toBeNull()
    toggle?.click()
    await flushPromises()

    expect(observedBody).toEqual({ active: false })

    cleanup()
    wrapper.unmount()
  })
})

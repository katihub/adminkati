import type { BanniereAdmin } from "@/types/api/vitrine"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
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
    focus: 74,
    creee_le: "2026-08-01T00:00:00.000Z",
    modifiee_le: "2026-08-15T00:00:00.000Z",
    modifiee_par: null,
    // The host `.env.test` pins into `SUPABASE_URL`, which `nuxt.config.ts`'s
    // `bannerImageOrigins` trusts — needed so this actually exercises IPX, not just an
    // untransformed passthrough URL that would trivially match between card and panel
    // either way.
    url_large: "https://api.test/supabase/storage/v1/object/public/branding/bannieres/large-1.jpg",
    url_mobile: "https://api.test/supabase/storage/v1/object/public/branding/bannieres/mobile-1.jpg",
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

describe("banner panel artwork", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("requests the exact same IPX URL as the grid card, so opening the panel is a cache hit rather than a second download", async () => {
    seedSession()
    const target = makeBanner()
    seedBanners([target])

    const wrapper = await mountSuspended(ContentPage, {
      route: `/content?banner=${target.id}`,
      attachTo: document.body,
    })
    await flushPromises()

    const cardSrc = document.body.querySelector("[data-testid='banner-card'] img")?.getAttribute("src")
    const panelSrc = document.body.querySelector("[data-testid='banner-panel-artwork-large'] img")?.getAttribute("src")

    expect(cardSrc).toContain("/_ipx/")
    expect(cardSrc).toBe(panelSrc)

    wrapper.unmount()
  })
})

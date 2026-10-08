import type { BanniereAdmin } from "@/types/api/vitrine"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
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

function seedSession(roles: string[]) {
  useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
    userId: "u1",
    membreId: "m1",
    nom: "Admin",
    courriel: "admin@example.com",
    roles,
  })
}

function seedBanners(banners: BanniereAdmin[]) {
  useNuxtApp().$queryClient.setQueryData(apiQueryKeys.banners.all, banners)
}

describe("banner role gating", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("hides every write affordance from the dom for a comptoir session", async () => {
    seedSession(["comptoir"])
    const banner = makeBanner()
    seedBanners([banner])

    const wrapper = await mountSuspended(ContentPage, {
      route: `/content?banner=${banner.id}`,
      attachTo: document.body,
    })
    await flushPromises()

    expect(document.body.querySelector("[data-testid='banner-filter-add-button']")).toBeNull()
    expect(document.body.querySelector("[data-testid='banner-card-drag-handle']")).toBeNull()
    expect(document.body.querySelector("[data-testid='banner-panel-actions']")).toBeNull()
    expect(document.body.querySelector("[data-testid='banner-panel-edit-button']")).toBeNull()
    expect(document.body.querySelector("[data-testid='banner-panel-publish-toggle']")).toBeNull()
    expect(document.body.querySelector("[data-testid='banner-panel-delete-trigger']")).toBeNull()

    wrapper.unmount()
  })

  it("shows every write affordance in the dom for a direction session", async () => {
    seedSession(["direction"])
    const banner = makeBanner()
    seedBanners([banner])

    const wrapper = await mountSuspended(ContentPage, {
      route: `/content?banner=${banner.id}`,
      attachTo: document.body,
    })
    await flushPromises()

    expect(document.body.querySelector("[data-testid='banner-filter-add-button']")).not.toBeNull()
    expect(document.body.querySelector("[data-testid='banner-card-drag-handle']")).not.toBeNull()
    expect(document.body.querySelector("[data-testid='banner-panel-actions']")).not.toBeNull()
    expect(document.body.querySelector("[data-testid='banner-panel-edit-button']")).not.toBeNull()
    expect(document.body.querySelector("[data-testid='banner-panel-publish-toggle']")).not.toBeNull()
    expect(document.body.querySelector("[data-testid='banner-panel-delete-trigger']")).not.toBeNull()

    wrapper.unmount()
  })
})

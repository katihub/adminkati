import type { BanniereAdmin } from "@/types/api/vitrine"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"
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

function seedSession(roles: string[] = ["direction"]) {
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

describe("banner panel url state", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("does not render a panel when no banner or new query param is present", async () => {
    seedSession()
    seedBanners([makeBanner(), makeBanner()])

    const wrapper = await mountSuspended(ContentPage, { route: "/content", attachTo: document.body })
    await flushPromises()

    expect(document.body.querySelector("[data-testid='banner-panel']")).toBeNull()

    wrapper.unmount()
  })

  it("opens the panel for the banner matching the banner query param", async () => {
    seedSession()
    const target = makeBanner({ libelle: "Promo ete" })
    seedBanners([target, makeBanner({ libelle: "Promo hiver" })])

    const wrapper = await mountSuspended(ContentPage, {
      route: `/content?banner=${target.id}`,
      attachTo: document.body,
    })
    await flushPromises()

    expect(document.body.querySelector("[data-testid='banner-panel']")).not.toBeNull()
    expect(document.body.querySelector("[data-testid='banner-panel-libelle']")?.textContent?.trim()).toBe("Promo ete")

    wrapper.unmount()
  })

  it("opens a promo banner without a mobile artwork, saying where it shows and what a phone gets", async () => {
    seedSession()
    const target = makeBanner({
      emplacement: "promo",
      fichier_mobile: null,
      largeur_mobile: null,
      hauteur_mobile: null,
      url_mobile: null,
    })
    seedBanners([makeBanner(), target])

    const wrapper = await mountSuspended(ContentPage, {
      route: `/content?banner=${target.id}`,
      attachTo: document.body,
    })
    await flushPromises()

    const text = (testid: string) => document.body.querySelector(`[data-testid='${testid}']`)?.textContent?.trim()
    expect(text("banner-panel-emplacement")).toBe("Promo")
    expect(text("banner-panel-mobile")).toBe("None: phones get the large artwork, cropped around the focus point.")
    expect(
      document.body.querySelector("[data-testid='banner-panel-artwork-large'] img")?.getAttribute("src"),
    ).toContain(`large-${target.id}.jpg`)

    wrapper.unmount()
  })

  it("closes the panel and clears the banner and new query params via the not-found close action", async () => {
    seedSession()
    seedBanners([makeBanner()])

    const wrapper = await mountSuspended(ContentPage, { route: "/content?banner=999999", attachTo: document.body })
    await flushPromises()

    expect(document.body.querySelector("[data-testid='banner-panel-not-found']")).not.toBeNull()

    document.body.querySelector<HTMLButtonElement>("[data-testid='banner-panel-not-found-close']")?.click()
    await flushPromises()

    await vi.waitFor(() => expect(document.body.querySelector("[data-testid='banner-panel']")).toBeNull())

    const route = useRoute()
    expect(route.query.banner).toBeUndefined()
    expect(route.query.new).toBeUndefined()

    wrapper.unmount()
  })

  it("opens create mode via the new query param without a not-found or view state", async () => {
    seedSession()
    seedBanners([makeBanner()])

    const wrapper = await mountSuspended(ContentPage, { route: "/content?new=1", attachTo: document.body })
    await flushPromises()

    expect(document.body.querySelector("[data-testid='banner-panel']")).not.toBeNull()
    expect(document.body.querySelector("[data-testid='banner-panel-not-found']")).toBeNull()
    expect(document.body.querySelector("[data-testid='banner-panel-view']")).toBeNull()

    wrapper.unmount()
  })

  it("renders the not-found state, never a view or loading state, for an id absent from the fetched list", async () => {
    seedSession()
    seedBanners([makeBanner()])

    const wrapper = await mountSuspended(ContentPage, { route: "/content?banner=999999", attachTo: document.body })
    await flushPromises()

    const panel = document.body.querySelector("[data-testid='banner-panel']")
    expect(panel).not.toBeNull()
    expect(panel?.querySelector("[data-testid='banner-panel-not-found']")).not.toBeNull()
    expect(panel?.querySelector("[data-testid='banner-panel-view']")).toBeNull()
    expect(panel?.querySelector("[data-testid$='loading']")).toBeNull()

    wrapper.unmount()
  })

  it("lands on the banners tab for a deep link carrying the banner query param", async () => {
    seedSession()
    const target = makeBanner()
    seedBanners([target])

    const wrapper = await mountSuspended(ContentPage, {
      route: `/content?banner=${target.id}`,
      attachTo: document.body,
    })
    await flushPromises()

    expect(document.body.querySelector("[data-testid='content-tab-banners']")?.getAttribute("aria-current")).toBe(
      "true",
    )

    wrapper.unmount()
  })
})

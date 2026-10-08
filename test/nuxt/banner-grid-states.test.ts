import type { BanniereAdmin } from "@/types/api/vitrine"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, describe, expect, it } from "vitest"
import ContentBannerGrid from "@/components/content/BannerGrid.vue"

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
    libelle: `Banniere ${idCounter}`,
    alt: `Alt ${idCounter}`,
    focus: 50,
    creee_le: "2026-08-01T00:00:00.000Z",
    modifiee_le: "2026-08-15T00:00:00.000Z",
    modifiee_par: null,
    url_large: `https://cdn.example.com/branding/bannieres/large-${idCounter}.jpg`,
    url_mobile: `https://cdn.example.com/branding/bannieres/mobile-${idCounter}.jpg`,
    ...overrides,
  }
}

interface BannerGridProps {
  banners: BanniereAdmin[]
  isPending: boolean
  error: unknown
  canWrite: boolean
  selectedId: number | null
  hasActiveFilters: boolean
  isReordering: boolean
}

const BASE_PROPS: BannerGridProps = {
  banners: [],
  isPending: false,
  error: null,
  canWrite: false,
  selectedId: null,
  hasActiveFilters: false,
  isReordering: false,
}

function mount(overrides: Partial<BannerGridProps> = {}) {
  return mountSuspended(ContentBannerGrid, {
    props: { ...BASE_PROPS, ...overrides },
  })
}

describe("content banner grid", () => {
  let wrapper: Awaited<ReturnType<typeof mount>>

  afterEach(() => wrapper?.unmount())

  it("shows the shared error card and relays its retry as the grid's own retry event", async () => {
    wrapper = await mount({ error: new Error("boom") })

    const errorState = wrapper.get("[data-testid='banner-grid-error']")
    expect(errorState.find("[role='alert']").exists()).toBe(true)

    await errorState.get("button").trigger("click")

    expect(wrapper.emitted("retry")).toHaveLength(1)
  })

  it("shows the zero-banners empty state, not the no-results state, when no filters are active", async () => {
    wrapper = await mount({ hasActiveFilters: false })

    expect(wrapper.find("[data-testid='banner-grid-empty']").exists()).toBe(true)
    expect(wrapper.find("[data-testid='banner-grid-no-results']").exists()).toBe(false)
  })

  it("offers an inline add-banner control in the empty state for a viewer who can write", async () => {
    wrapper = await mount({ hasActiveFilters: false, canWrite: true })

    await wrapper.get("[data-testid='banner-grid-add-button']").trigger("click")

    expect(wrapper.emitted("add")).toHaveLength(1)
  })

  it("hides the inline add-banner control in the empty state for a read-only viewer", async () => {
    wrapper = await mount({ hasActiveFilters: false, canWrite: false })

    expect(wrapper.find("[data-testid='banner-grid-add-button']").exists()).toBe(false)
  })

  it("shows a distinct no-results state, not the empty state, when filters exclude everything", async () => {
    wrapper = await mount({ hasActiveFilters: true })

    expect(wrapper.find("[data-testid='banner-grid-no-results']").exists()).toBe(true)
    expect(wrapper.find("[data-testid='banner-grid-empty']").exists()).toBe(false)
  })

  it("clears filters when the no-results state's clear-filters control is clicked", async () => {
    wrapper = await mount({ hasActiveFilters: true })

    await wrapper.get("[data-testid='banner-grid-clear-filters']").trigger("click")

    expect(wrapper.emitted("clearFilters")).toHaveLength(1)
  })

  it("shows only the content state once data has loaded, none of the other four states", async () => {
    const banners = [makeBanner(), makeBanner()]
    wrapper = await mount({ banners })

    expect(wrapper.find("[data-testid='banner-grid-loading']").exists()).toBe(false)
    expect(wrapper.find("[data-testid='banner-grid-error']").exists()).toBe(false)
    expect(wrapper.find("[data-testid='banner-grid-empty']").exists()).toBe(false)
    expect(wrapper.find("[data-testid='banner-grid-no-results']").exists()).toBe(false)
  })
})

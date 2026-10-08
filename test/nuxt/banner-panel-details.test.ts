import type { BanniereAdmin } from "@/types/api/vitrine"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import ContentBannerPanelDetails from "@/components/content/BannerPanelDetails.vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

const RAIL = "[data-testid='banner-panel-editor-rail']"
const EDITOR = "[data-testid='banner-editor-pill']"

function makeBanner(overrides: Partial<BanniereAdmin> = {}): BanniereAdmin {
  return {
    id: 7,
    emplacement: "promo",
    ordre: 1,
    active: true,
    fichier_large: "bannieres/large-7.jpg",
    largeur_large: 1600,
    hauteur_large: 600,
    fichier_mobile: null,
    largeur_mobile: null,
    hauteur_mobile: null,
    href: "/categorie/promo",
    libelle: "Promo été",
    alt: "Promo artwork",
    focus: 40,
    creee_le: "2026-08-01T00:00:00.000Z",
    modifiee_le: "2026-08-15T09:30:00.000Z",
    modifiee_par: "Awa Ngo <awa@example.com>",
    url_large: "https://cdn.example.com/branding/bannieres/large-7.jpg",
    url_mobile: null,
    ...overrides,
  }
}

function mountDetails(overrides: Partial<BanniereAdmin> = {}) {
  return mountSuspended(ContentBannerPanelDetails, {
    props: { banner: makeBanner(overrides) },
    attachTo: document.body,
  })
}

describe("banner panel details, edited-by rail", () => {
  beforeEach(() => {
    useNuxtApp().$queryClient.setQueryData(apiQueryKeys.team.list({ taille: 200 }), {
      pages: [{ total: 0, page: 1, taille: 200, pages: 1, elements: [] }],
      pageParams: [1],
    })
  })
  afterEach(() => {
    useNuxtApp().$queryClient.clear()
    document.body.innerHTML = ""
  })

  it('reads "Last edit by <person> on <date>"', async () => {
    const wrapper = await mountDetails()

    expect(wrapper.get(RAIL).text()).toMatch(/^Last edit by\s*AN\s*Awa Ngo\s*on\s*\S/)

    wrapper.unmount()
  })

  it("still dates the last edit when no person is on record", async () => {
    const wrapper = await mountDetails({ modifiee_par: null })

    expect(wrapper.find(EDITOR).exists()).toBe(false)
    expect(wrapper.get(RAIL).text()).toMatch(/^Last edit on\s*\S/)

    wrapper.unmount()
  })

  it("shows the alt text, so the default view says what the artwork is described as", async () => {
    const wrapper = await mountDetails({ alt: "Une paire de baskets blanches sur fond bleu" })

    const alt = wrapper.get("[data-testid='banner-panel-alt']")
    expect(alt.text()).toContain("Une paire de baskets blanches sur fond bleu")
    expect(alt.text()).toContain("Alt text")

    wrapper.unmount()
  })

  it("keeps the values other screens and tests read: title, placement and phone artwork", async () => {
    const wrapper = await mountDetails()

    expect(wrapper.get("[data-testid='banner-panel-libelle']").text()).toBe("Promo été")
    expect(wrapper.get("[data-testid='banner-panel-emplacement']").text()).toBe("Promo")
    expect(wrapper.get("[data-testid='banner-panel-mobile']").text()).toContain("phones get the large artwork")

    wrapper.unmount()
  })
})

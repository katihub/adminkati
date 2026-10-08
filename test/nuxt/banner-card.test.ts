import type { BanniereAdmin } from "@/types/api/vitrine"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, describe, expect, it } from "vitest"
import ContentBannerCard from "@/components/content/BannerCard.vue"

const banner: BanniereAdmin = {
  id: 12,
  emplacement: "principal",
  ordre: 1,
  active: true,
  fichier_large: "bannieres/large-12.jpg",
  largeur_large: 1600,
  hauteur_large: 600,
  fichier_mobile: "bannieres/mobile-12.jpg",
  largeur_mobile: 800,
  hauteur_mobile: 900,
  href: "/categorie/promo",
  libelle: "Promo rentrée",
  alt: "Chaussures en cuir noires",
  focus: 50,
  creee_le: "2026-08-01T00:00:00.000Z",
  modifiee_le: "2026-08-15T00:00:00.000Z",
  modifiee_par: null,
  // The storage host `.env.test` pins into `SUPABASE_URL`, which is what
  // `nuxt.config.ts`'s `bannerImageOrigins` trusts for IPX. It used to be the
  // production Supabase host, which only matched on a machine whose own `.env`
  // named it — an untrusted host passes straight through untransformed, so the
  // assertion below silently stopped testing anything.
  url_large: "https://api.test/supabase/storage/v1/object/public/branding/bannieres/large-12.jpg",
  url_mobile: "https://api.test/supabase/storage/v1/object/public/branding/bannieres/mobile-12.jpg",
}

function mount(overrides: { banner?: BanniereAdmin; canWrite?: boolean } = {}) {
  return mountSuspended(ContentBannerCard, {
    props: {
      banner: overrides.banner ?? banner,
      canWrite: overrides.canWrite ?? false,
    },
  })
}

describe("content banner card", () => {
  let wrapper: Awaited<ReturnType<typeof mount>>

  afterEach(() => wrapper?.unmount())

  it("resizes proportionally instead of asking IPX for a fixed width and height", async () => {
    wrapper = await mount()

    /**
     * Giving `<NuxtImg>` both `width` and `height` makes `@nuxt/image`'s ipx provider
     *  collapse them into a single `s_<w>x<h>` resize, which crops server-side (default
     *  center gravity) before the browser ever sees the image — silently discarding
     *  whatever `object-position` below would have kept in frame for an off-center focus
     *  point. `width` alone resizes without cropping, leaving the full width for the
     *  client-side crop to work with — the bug this test guards against.
     */
    const image = wrapper.get("[data-testid='banner-card'] img")
    expect(image.attributes("src")).not.toMatch(/\/_ipx\/[^/]*s_\d+x\d+/)
  })

  it("renders a banner without a mobile artwork from its large one, and says a phone has no variant", async () => {
    wrapper = await mount({
      banner: {
        ...banner,
        emplacement: "promo",
        fichier_mobile: null,
        largeur_mobile: null,
        hauteur_mobile: null,
        url_mobile: null,
      },
    })

    expect(wrapper.get("[data-testid='banner-card'] img").attributes("src")).toContain("large-12.jpg")
    expect(wrapper.get("[data-testid='banner-card']").classes()).toContain("aspect-[16/10]")
    expect(wrapper.get("[data-testid='banner-card-no-mobile']").text()).toBe("No mobile artwork")
  })

  it("keeps the wide frame and no warning for a main banner with its mobile artwork", async () => {
    wrapper = await mount()

    expect(wrapper.get("[data-testid='banner-card']").classes()).toContain("aspect-[21/9]")
    expect(wrapper.find("[data-testid='banner-card-no-mobile']").exists()).toBe(false)
  })

  it("shows an active status pill when the banner is active", async () => {
    wrapper = await mount({ banner: { ...banner, active: true } })

    expect(wrapper.get("[data-testid='banner-card-status']").text()).toBe("Active")
  })

  it("shows an inactive status pill when the banner is inactive", async () => {
    wrapper = await mount({ banner: { ...banner, active: false } })

    expect(wrapper.get("[data-testid='banner-card-status']").text()).toBe("Inactive")
  })

  it("emits select with the banner's id when the card is clicked", async () => {
    wrapper = await mount()

    await wrapper.get("[data-testid='banner-card']").trigger("click")

    expect(wrapper.emitted("select")).toEqual([[12]])
  })

  it("hides the drag handle for a read-only viewer", async () => {
    wrapper = await mount({ canWrite: false })

    expect(wrapper.find("[data-testid='banner-card-drag-handle']").exists()).toBe(false)
  })

  it("shows the drag handle for a viewer who can write", async () => {
    wrapper = await mount({ canWrite: true })

    expect(wrapper.find("[data-testid='banner-card-drag-handle']").exists()).toBe(true)
  })

  it("does not emit select when the drag handle is clicked, only the card", async () => {
    wrapper = await mount({ canWrite: true })

    await wrapper.get("[data-testid='banner-card-drag-handle']").trigger("click")

    expect(wrapper.emitted("select")).toBeUndefined()
  })

  it("lets a pointerdown on the drag handle bubble up, so SortableJS can still see it start a drag", async () => {
    /**
     * `vue-draggable-plus`/SortableJS starts a drag by listening for `pointerdown`
     *  bubbling up from `.banner-drag-handle` to the sortable container — stopping its
     *  propagation here (as `@click.stop` correctly does for `click`) would silently
     *  break dragging with no visible error.
     */
    wrapper = await mount({ canWrite: true })

    let bubbledToParent = false
    wrapper.element.parentElement?.addEventListener("pointerdown", () => {
      bubbledToParent = true
    })

    await wrapper.get("[data-testid='banner-card-drag-handle']").trigger("pointerdown")

    expect(bubbledToParent).toBe(true)
  })
})

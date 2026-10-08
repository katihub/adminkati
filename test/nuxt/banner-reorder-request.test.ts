import type { BanniereAdmin, EmplacementBanniere } from "@/types/api/vitrine"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody } from "h3"
import { afterEach, describe, expect, it } from "vitest"
import { nextTick } from "vue"
import { VueDraggable } from "vue-draggable-plus"
import ContentBannerGrid from "@/components/content/BannerGrid.vue"
import ContentPage from "@/pages/content.vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

function makeBanner(id: number, emplacement: EmplacementBanniere = "principal"): BanniereAdmin {
  return {
    id,
    emplacement,
    ordre: id,
    active: true,
    fichier_large: `bannieres/large-${id}.jpg`,
    largeur_large: 1600,
    hauteur_large: 600,
    fichier_mobile: `bannieres/mobile-${id}.jpg`,
    largeur_mobile: 800,
    hauteur_mobile: 900,
    href: "/categorie/promo",
    libelle: `Banner ${id}`,
    alt: `Banner artwork ${id}`,
    focus: 50,
    creee_le: "2026-08-01T00:00:00.000Z",
    modifiee_le: "2026-08-15T00:00:00.000Z",
    modifiee_par: null,
    url_large: `https://cdn.example.com/branding/bannieres/large-${id}.jpg`,
    url_mobile: `https://cdn.example.com/branding/bannieres/mobile-${id}.jpg`,
  }
}

function seedDirectionSession() {
  useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
    userId: "u1",
    membreId: "m1",
    nom: "Admin",
    courriel: "admin@example.com",
    roles: ["direction"],
  })
}

function serveReorder(onBody: (body: unknown) => void, banners: BanniereAdmin[]) {
  return registerEndpoint("/api/v1/vitrine/administration/bannieres/reordonner", {
    method: "POST",
    handler: async event => {
      onBody(await readBody(event))
      return banners
    },
  })
}

describe("banner reordering", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("sends the main carousel's placement and every one of its ids in the dropped order", async () => {
    const banners = [1, 2, 3, 4, 5].map(id => makeBanner(id))
    seedDirectionSession()
    useNuxtApp().$queryClient.setQueryData(apiQueryKeys.banners.all, banners)

    let observedBody: unknown
    const cleanup = serveReorder(body => (observedBody = body), banners)

    const wrapper = await mountSuspended(ContentPage, { route: "/content", attachTo: document.body })
    const draggable = wrapper.get("[data-testid='banner-group-principal']").findComponent(VueDraggable)
    const droppedOrder = [banners[4], ...banners.slice(0, 4)]

    draggable.vm.$emit("update:modelValue", droppedOrder)
    await nextTick()
    draggable.vm.$emit("end")
    await flushPromises()

    expect(observedBody).toEqual({ emplacement: "principal", ids: [5, 1, 2, 3, 4] })

    cleanup()
    wrapper.unmount()
  })

  it("groups the banners by carousel and reorders the promo one on its own, without the main banners", async () => {
    const banners = [makeBanner(1), makeBanner(2), makeBanner(7, "promo"), makeBanner(8, "promo")]
    seedDirectionSession()
    useNuxtApp().$queryClient.setQueryData(apiQueryKeys.banners.all, banners)

    let observedBody: unknown
    const cleanup = serveReorder(body => (observedBody = body), banners)

    const wrapper = await mountSuspended(ContentPage, { route: "/content", attachTo: document.body })
    const group = (emplacement: EmplacementBanniere) => wrapper.get(`[data-testid='banner-group-${emplacement}']`)

    expect(group("principal").get("[data-testid='banner-group-title']").text()).toBe("Main banner")
    expect(
      group("principal")
        .findAll("[data-testid='banner-card-libelle']")
        .map(card => card.text()),
    ).toEqual(["Banner 1", "Banner 2"])
    expect(group("promo").get("[data-testid='banner-group-title']").text()).toBe("Promo")
    expect(
      group("promo")
        .findAll("[data-testid='banner-card-libelle']")
        .map(card => card.text()),
    ).toEqual(["Banner 7", "Banner 8"])

    const draggable = group("promo").findComponent(VueDraggable)
    draggable.vm.$emit("update:modelValue", [banners[3], banners[2]])
    await nextTick()
    draggable.vm.$emit("end")
    await flushPromises()

    expect(observedBody).toEqual({ emplacement: "promo", ids: [8, 7] })

    cleanup()
    wrapper.unmount()
  })

  it("shows an empty promo carousel rather than hiding it", async () => {
    const wrapper = await mountSuspended(ContentBannerGrid, {
      props: {
        banners: [makeBanner(1)],
        isPending: false,
        error: null,
        canWrite: true,
        selectedId: null,
        hasActiveFilters: false,
        isReordering: false,
      },
    })

    expect(wrapper.get("[data-testid='banner-group-promo'] [data-testid='banner-group-empty']").text()).toBe(
      "No banner in this carousel yet.",
    )
    expect(wrapper.get("[data-testid='banner-group-promo'] [data-testid='banner-group-count']").text()).toBe(
      "no banners",
    )

    wrapper.unmount()
  })

  it("hides drag handles while a filter is active", async () => {
    const wrapper = await mountSuspended(ContentBannerGrid, {
      props: {
        banners: [makeBanner(1)],
        isPending: false,
        error: null,
        canWrite: true,
        selectedId: null,
        hasActiveFilters: true,
        isReordering: false,
      },
    })

    expect(wrapper.find("[data-testid='banner-card-drag-handle']").exists()).toBe(false)

    wrapper.unmount()
  })
})

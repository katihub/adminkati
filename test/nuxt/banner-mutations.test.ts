import type { H3Event } from "h3"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { describe, expect, it } from "vitest"
import { defineComponent, h } from "vue"
import { useBanniereMutations } from "@/composables/useBanniereMutations"
import { useBannieres } from "@/composables/useBannieres"
import { apiQueryKeys } from "@/utils/api-query-keys"

/**
 * `registerEndpoint`'s mock bridge (`node-mock-http`, via `@nuxt/test-utils`) assigns the
 * client's original `FormData` straight onto the mock request instead of serializing it with a
 * real multipart boundary, so `h3`'s `readFormData`/`readMultipartFormData` cannot parse it here
 * — confirmed independent of any banner code, with a bare `$fetch(url, { body: new FormData() })`
 * against a fresh `registerEndpoint` failing identically. Reading the object straight off the
 * mock request is this harness's own escape hatch for inspecting a multipart send.
 */
function formDataFromMockRequest(event: H3Event): FormData {
  return (event.node.req as unknown as { body: FormData }).body
}

const fixtureBanner = {
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
  libelle: "Promo rentree",
  alt: "Chaussures en cuir noires",
  focus: 50,
  creee_le: "2026-08-01T00:00:00.000Z",
  modifiee_le: "2026-08-15T00:00:00.000Z",
  modifiee_par: "7b4f5d9e-0c7a-4f1f-a9ae-111111111111",
  url_large: "https://cdn.example.com/branding/bannieres/large-12.jpg",
  url_mobile: "https://cdn.example.com/branding/bannieres/mobile-12.jpg",
}

const listKey = apiQueryKeys.banners.all

describe("banner API integration", () => {
  it("fetches the complete banner list", async () => {
    const cleanup = registerEndpoint("/api/v1/vitrine/administration/bannieres", {
      method: "GET",
      handler: () => [fixtureBanner],
    })
    let query: ReturnType<typeof useBannieres> | undefined
    const Probe = defineComponent({
      setup() {
        query = useBannieres()
        return () => h("div")
      },
    })

    const wrapper = await mountSuspended(Probe)
    await flushPromises()

    expect(query?.data.value).toEqual([fixtureBanner])

    cleanup()
    wrapper.unmount()
  })

  it("sends the create multipart body with every field and both artworks, and invalidates the list", async () => {
    const queryClient = useNuxtApp().$queryClient
    queryClient.setQueryData(listKey, [fixtureBanner])

    const observed: Record<string, FormDataEntryValue | null> = {}
    const cleanup = registerEndpoint("/api/v1/vitrine/administration/bannieres", {
      method: "POST",
      handler: event => {
        const formData = formDataFromMockRequest(event)
        for (const key of ["emplacement", "href", "libelle", "alt", "focus", "active", "large", "mobile"])
          observed[key] = formData.get(key)
        return fixtureBanner
      },
    })

    const large = new File(["large-bytes"], "large.jpg", { type: "image/jpeg" })
    const mobile = new File(["mobile-bytes"], "mobile.jpg", { type: "image/jpeg" })
    let mutations: ReturnType<typeof useBanniereMutations> | undefined
    const Probe = defineComponent({
      async setup() {
        mutations = useBanniereMutations()
        await mutations.create.mutateAsync({
          large,
          mobile,
          fields: {
            emplacement: "principal",
            href: "/categorie/test",
            libelle: "Test banner",
            alt: "Alt text long enough",
            focus: 60,
            active: true,
          },
        })
        return () => h("div")
      },
    })

    const wrapper = await mountSuspended(Probe)
    await flushPromises()

    expect(observed.emplacement).toBe("principal")
    expect(observed.href).toBe("/categorie/test")
    expect(observed.libelle).toBe("Test banner")
    expect(observed.alt).toBe("Alt text long enough")
    expect(observed.focus).toBe("60")
    expect(observed.active).toBe("true")
    expect(observed.large).toBeInstanceOf(File)
    expect((observed.large as File).name).toBe("large.jpg")
    expect(observed.mobile).toBeInstanceOf(File)
    expect((observed.mobile as File).name).toBe("mobile.jpg")
    expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true)

    cleanup()
    wrapper.unmount()
    queryClient.clear()
  })
})

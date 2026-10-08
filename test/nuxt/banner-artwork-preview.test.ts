import { mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, describe, expect, it } from "vitest"
import BannerArtworkPreview from "@/components/content/BannerArtworkPreview.vue"

// The host `.env.test` pins into `SUPABASE_URL`: `nuxt.config.ts` trusts only that one
// for IPX, and an untrusted host would pass through untransformed.
const src = "https://api.test/supabase/storage/v1/object/public/branding/bannieres/large-1.jpg"

function mount(overrides: { focus?: number } = {}) {
  return mountSuspended(BannerArtworkPreview, {
    props: {
      testid: "preview",
      src,
      alt: "Chaussures en cuir noires",
      aspectClass: "aspect-[21/9] w-full",
      focus: overrides.focus,
    },
  })
}

describe("banner artwork preview", () => {
  let wrapper: Awaited<ReturnType<typeof mount>>

  afterEach(() => wrapper?.unmount())

  it("requests a resized IPX thumbnail, not the full artwork", async () => {
    wrapper = await mount()

    const image = wrapper.get("img")
    expect(image.attributes("src")).toContain("/_ipx/")
    expect(image.attributes("src")).not.toBe(src)
  })
})

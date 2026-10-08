import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import ApiErrorCard from "@/components/ApiErrorCard.vue"

function mount(error: unknown) {
  return mountSuspended(ApiErrorCard, { props: { error } })
}

describe("api error card", () => {
  it("shows a human headline for a known status", async () => {
    const wrapper = await mount({ statusCode: 500, message: "Internal Server Error" })

    expect(wrapper.text()).toContain("The service had a problem. Try again shortly.")

    wrapper.unmount()
  })

  /**
   * The requirement this guards: no developer context ever shows in an error the user
   *  can see — not a raw exception string, not a backend stack trace, not an
   *  unlocalized backend message.
   */
  it("never renders the raw error message, however developer-ish it is", async () => {
    const wrapper = await mount({
      statusCode: 409,
      message: '[PATCH] "/api/v1/vitrine/administration/bannieres/12": Cette caisse est déjà validée.',
    })

    expect(wrapper.text()).not.toContain("PATCH")
    expect(wrapper.text()).not.toContain("/api/v1/")
    expect(wrapper.text()).not.toContain("Cette caisse")
    expect(wrapper.text()).toContain("Someone changed this before you did.")

    wrapper.unmount()
  })

  it("emits retry when its action is clicked", async () => {
    const wrapper = await mount({ statusCode: 500 })

    await wrapper.get("button").trigger("click")

    expect(wrapper.emitted("retry")).toHaveLength(1)

    wrapper.unmount()
  })
})

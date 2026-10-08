import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import InfoTip from "@/components/InfoTip.vue"

const TRIGGER = "[data-testid='info-trigger']"

function mountTip() {
  return mountSuspended(InfoTip, {
    props: { label: "More information", text: "Leave empty for no end date." },
    attrs: { "data-testid": "info-trigger" },
    attachTo: document.body,
  })
}

describe("products overview info tip", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("keeps its text out of the page until the icon is reached", async () => {
    const wrapper = await mountTip()

    expect(document.body.textContent).not.toContain("Leave empty for no end date.")

    await wrapper.get(TRIGGER).trigger("focus")
    await flushPromises()

    expect(document.body.textContent).toContain("Leave empty for no end date.")

    wrapper.unmount()
  })

  it('names itself "More information" unless it is given a more specific name', async () => {
    const plain = await mountSuspended(InfoTip, { props: { text: "Some help." }, attachTo: document.body })
    expect(plain.get("button").attributes("aria-label")).toBe("More information")
    plain.unmount()

    const named = await mountSuspended(InfoTip, {
      props: { label: "About the end date", text: "Some help." },
      attachTo: document.body,
    })
    expect(named.get("button").attributes("aria-label")).toBe("About the end date")
    named.unmount()
  })
})

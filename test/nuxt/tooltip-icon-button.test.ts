import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it, vi } from "vitest"
import TooltipIconButton from "@/components/TooltipIconButton.vue"

function mountButton(props: Record<string, unknown> = {}, attrs: Record<string, unknown> = {}) {
  return mountSuspended(TooltipIconButton, {
    props: { icon: "ph:pencil-simple", label: "Replace the artwork", ...props },
    attrs,
  })
}

describe("icon-only button with a tooltip", () => {
  it("is named for assistive tech, since it has no text of its own", async () => {
    const wrapper = await mountButton()
    const button = wrapper.get("button")

    expect(button.attributes("aria-label")).toBe("Replace the artwork")
    expect(button.text()).toBe("")
  })

  it("never submits the form it sits in", async () => {
    const wrapper = await mountButton()

    expect(wrapper.get("button").attributes("type")).toBe("button")
  })

  it("hands attributes and clicks to the button itself", async () => {
    const onClick = vi.fn()
    const wrapper = await mountButton({}, { "data-testid": "replace", onClick: onClick })

    await wrapper.get("[data-testid='replace']").trigger("click")

    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

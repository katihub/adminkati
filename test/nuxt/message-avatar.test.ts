import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import AssistantMessageAvatar from "@/components/assistant/MessageAvatar.vue"

describe("assistant message avatar", () => {
  it("always shows the sparkle icon for the assistant, regardless of name or email", async () => {
    const wrapper = await mountSuspended(AssistantMessageAvatar, {
      props: { kind: "assistant", name: "Should be ignored", email: "ignored@example.com" },
    })

    expect(wrapper.find("[data-testid='assistant-message-avatar-icon']").exists()).toBe(true)
    expect(wrapper.find("[data-testid='assistant-message-avatar-initials']").exists()).toBe(false)

    wrapper.unmount()
  })

  it("shows the customer's initials when an email is present", async () => {
    const wrapper = await mountSuspended(AssistantMessageAvatar, {
      props: { kind: "visiteur", email: "jane.doe@example.com" },
    })

    expect(wrapper.get("[data-testid='assistant-message-avatar-initials']").text()).toBe("JD")

    wrapper.unmount()
  })

  it("falls back to the letter C for a customer without an email", async () => {
    const wrapper = await mountSuspended(AssistantMessageAvatar, {
      props: { kind: "visiteur", email: null },
    })

    expect(wrapper.get("[data-testid='assistant-message-avatar-letter']").text()).toBe("C")

    wrapper.unmount()
  })

  it("falls back to a human's initials from their name when there is no email", async () => {
    const wrapper = await mountSuspended(AssistantMessageAvatar, {
      props: { kind: "equipe", email: null, name: "Awa Ngo" },
    })

    expect(wrapper.get("[data-testid='assistant-message-avatar-initials']").text()).toBe("AN")

    wrapper.unmount()
  })

  it("falls back to a generic icon for a human with neither email nor name", async () => {
    const wrapper = await mountSuspended(AssistantMessageAvatar, {
      props: { kind: "equipe", email: null, name: null },
    })

    expect(wrapper.find("[data-testid='assistant-message-avatar-icon']").exists()).toBe(true)
    expect(wrapper.find("[data-testid='assistant-message-avatar-initials']").exists()).toBe(false)

    wrapper.unmount()
  })
})

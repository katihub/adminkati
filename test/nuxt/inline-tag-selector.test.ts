import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { describe, expect, it } from "vitest"
import InlineTagSelector from "@/components/InlineTagSelector.vue"

const options = [
  { id: "direction", label: "Direction" },
  { id: "comptoir", label: "Counter" },
]

describe("inline tag selector", () => {
  it("holds pending options until they are explicitly added", async () => {
    const wrapper = await mountSuspended(InlineTagSelector, {
      props: {
        options,
        selectedIds: ["comptoir"],
        label: "Roles",
        searchPlaceholder: "Search roles…",
        noResultsLabel: "No roles found.",
        addLabel: "Add role",
        addSelectedLabel: "Add roles",
        removeItemLabel: (label: string) => `Remove ${label}`,
        moreItemsLabel: (count: number) => `${count} more roles`,
        testIds: {
          root: "team-member-roles",
          item: "team-member-role",
          remove: "team-member-role-remove",
          overflow: "team-member-role-overflow",
          add: "team-member-role-add",
        },
      },
      attachTo: document.body,
    })

    await wrapper.get("[data-testid='team-member-role-add']").trigger("click")
    await flushPromises()

    const option = Array.from(document.body.querySelectorAll<HTMLElement>("[data-slot='command-item']")).find(element =>
      element.textContent?.includes("Direction"),
    )
    if (!option) throw new Error("the available Direction role was not rendered")

    option.click()
    await flushPromises()

    expect(wrapper.emitted("update:selectedIds")).toBeUndefined()

    const addButton = Array.from(document.body.querySelectorAll("button")).find(
      element => element.textContent?.trim() === "Add roles",
    )
    if (!addButton) throw new Error("the role confirmation action was not rendered")

    addButton.click()
    await flushPromises()

    expect(wrapper.emitted("update:selectedIds")).toEqual([[["comptoir", "direction"]]])

    wrapper.unmount()
  })
})

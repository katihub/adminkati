import { mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, describe, expect, it, vi } from "vitest"
import { defineComponent, h, ref } from "vue"
import DiscardDialog from "@/components/team/DiscardDialog.vue"
import { useCatalogueDraftGuard } from "@/composables/useCatalogueDraftGuard"

const wrappers: Array<{ unmount: () => void }> = []

describe("catalogue draft discard confirmation", () => {
  afterEach(() => {
    wrappers.splice(0).forEach(wrapper => wrapper.unmount())
    document.body.innerHTML = ""
  })

  it("executes a pending transition once after the real dialog closes on confirmation but not on cancellation", async () => {
    const transition = vi.fn()
    const dirty = ref(true)
    let guard: ReturnType<typeof useCatalogueDraftGuard>
    const Harness = defineComponent({
      setup() {
        guard = useCatalogueDraftGuard(dirty, ref(false))
        return () => [
          h(
            "button",
            { "data-testid": "request-transition", onClick: () => guard.request(transition) },
            "Select another product",
          ),
          h(DiscardDialog, {
            open: guard.open.value,
            "onUpdate:open": (open: boolean) => {
              if (!open) guard.cancel()
            },
            onConfirm: guard.confirm,
          }),
        ]
      },
    })
    const wrapper = await mountSuspended(Harness, { attachTo: document.body })
    wrappers.push(wrapper)

    await wrapper.get("[data-testid='request-transition']").trigger("click")
    await vi.waitFor(() => expect(document.querySelector("[data-testid='team-discard-dialog']")).not.toBeNull())
    const cancel = document.querySelector<HTMLButtonElement>(
      "[data-testid='team-discard-dialog'] button:not([data-testid='team-discard-confirm'])",
    )
    expect(cancel).not.toBeNull()
    cancel!.click()
    await Promise.resolve()
    guard!.confirm()
    expect(transition).not.toHaveBeenCalled()

    await vi.waitFor(() => expect(document.querySelector("[data-testid='team-discard-dialog']")).toBeNull())
    dirty.value = true

    await wrapper.get("[data-testid='request-transition']").trigger("click")
    await vi.waitFor(() => expect(document.querySelector("[data-testid='team-discard-confirm']")).not.toBeNull())
    const confirm = document.querySelector<HTMLButtonElement>("[data-testid='team-discard-confirm']")!
    confirm.click()
    await Promise.resolve()
    expect(transition).toHaveBeenCalledTimes(1)
    guard!.confirm()
    expect(transition).toHaveBeenCalledTimes(1)
  })
})

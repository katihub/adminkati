import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import ActionBar from "@/components/orders/ActionBar.vue"

describe("orders action bar", () => {
  it("renders only transitions allowed for the current status and role", async () => {
    const wrapper = await mountSuspended(ActionBar, {
      props: { status: "soumise", roles: ["comptoir"] },
    })

    expect(
      wrapper.findAll("[data-testid='orders-transition-action']").map(button => button.attributes("data-transition")),
    ).toEqual(["confirmee", "refusee"])

    wrapper.unmount()
  })

  it("colors the same target status differently depending on what else is on offer in the current status", async () => {
    // annulation_demandee (Suspend) is the most severe option in en_preparation (no `close`
    // present there) — destructive. In prete_au_retrait, `close` is present and outranks it,
    // so Suspend downgrades to warning.
    const preparing = await mountSuspended(ActionBar, {
      props: { status: "en_preparation", roles: ["comptoir"] },
    })
    expect(preparing.get("[data-transition='prete_au_retrait']").attributes("data-severity")).toBe("primary")
    expect(preparing.get("[data-transition='en_remise']").attributes("data-severity")).toBe("secondary")
    expect(preparing.get("[data-transition='annulation_demandee']").attributes("data-severity")).toBe("destructive")
    preparing.unmount()

    const ready = await mountSuspended(ActionBar, {
      props: { status: "prete_au_retrait", roles: ["comptoir"] },
    })
    expect(ready.get("[data-transition='close']").attributes("data-severity")).toBe("destructive")
    expect(ready.get("[data-transition='annulation_demandee']").attributes("data-severity")).toBe("warning")
    ready.unmount()
  })

  it("emits the chosen transition and disables actions while busy", async () => {
    const wrapper = await mountSuspended(ActionBar, {
      props: { status: "confirmee", roles: ["preparation"] },
    })
    const action = wrapper.get("[data-transition='en_preparation']")

    await action.trigger("click")
    expect(wrapper.emitted("select")).toEqual([["en_preparation"]])

    await wrapper.setProps({ busy: true })
    expect(action.attributes("disabled")).toBeDefined()

    wrapper.unmount()
  })
})

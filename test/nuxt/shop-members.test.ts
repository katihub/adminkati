import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import ShopMembers from "@/components/operations/ShopMembers/ShopMembers.vue"

const owner = {
  id: "m1",
  courriel: "awa@nowtech.cm",
  nom: "Awa Ngono",
  telephone: "+237 699 12 34 56",
  roles: ["proprietaire"],
  actif: true,
}
const manager = {
  id: "m2",
  courriel: "paul@nowtech.cm",
  nom: "Paul Eto",
  telephone: null,
  roles: ["gestionnaire"],
  actif: false,
}

describe("shop members in the seller record", () => {
  it("lets the team call or e-mail each member, and says when no phone was given", async () => {
    const wrapper = await mountSuspended(ShopMembers, { props: { members: [owner, manager] } })
    const phones = wrapper.findAll("[data-testid='shop-member-phone']")
    expect(phones).toHaveLength(1)
    expect(phones[0]!.attributes("href")).toBe("tel:+237699123456")
    expect(phones[0]!.text()).toBe("+237 699 12 34 56")
    expect(wrapper.find("a[href='mailto:awa@nowtech.cm']").exists()).toBe(true)
    expect(wrapper.text()).toContain("No phone given")
  })
})

import type { TeamMember } from "@/types/api/equipe"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"
import ProductsInventoryActorPill from "@/components/products/InventoryActorPill.vue"
import { makeMember, seedRoster } from "./inventory-fixture"

const PILL = "[data-testid='inventory-actor-pill']"
const YOU = "[data-testid='inventory-actor-you']"
const CROWN = "[data-testid='banner-editor-crown']"
const CARD = "[data-testid='inventory-actor-card']"
const SYSTEM = "[data-testid='inventory-actor-system']"
const UUID = "3f2a8c1e-9b7d-4e0a-8c55-1d2e3f4a5b6c"

interface Actor {
  type: "equipe" | "systeme"
  id: string | null
  role: string | null
}

function seedSession() {
  useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
    userId: "u1",
    membreId: "m1",
    nom: "Ada",
    courriel: "ada@example.com",
    roles: ["direction"],
  })
}

async function mountPill(acteur: Actor, roster: TeamMember[] = []) {
  seedSession()
  seedRoster(roster)
  return mountSuspended(ProductsInventoryActorPill, { props: { acteur }, attachTo: document.body })
}

async function openCard(wrapper: Awaited<ReturnType<typeof mountPill>>) {
  await wrapper.get(PILL).trigger("focus")
  await vi.waitFor(() => expect(document.body.querySelector(CARD)).not.toBeNull())
  return document.body.querySelector(CARD) as HTMLElement
}

describe("inventory actor pill", () => {
  afterEach(() => {
    useNuxtApp().$i18n.locale.value = "en"
    useNuxtApp().$queryClient.clear()
    document.body.innerHTML = ""
  })

  describe("the signed-in member", () => {
    it("shows their session name and initials", async () => {
      const wrapper = await mountPill({ type: "equipe", id: "m1", role: "direction" })
      const pill = wrapper.get(PILL)

      expect(pill.text()).toContain("Ada")
      expect(pill.text()).toContain("A")
      wrapper.unmount()
    })
  })

  describe("another member found in the roster", () => {
    it("shows the roster name by id, with initials, and never You", async () => {
      const wrapper = await mountPill({ type: "equipe", id: "m2", role: "comptoir" }, [
        makeMember({ id: "m2", nom: "Awa Ngo" }),
      ])
      const pill = wrapper.get(PILL)

      expect(pill.text()).toContain("Awa Ngo")
      expect(pill.text()).toContain("AN")
      expect(wrapper.find(YOU).exists()).toBe(false)
      wrapper.unmount()
    })

    it("matches by id, not by role or name", async () => {
      const wrapper = await mountPill({ type: "equipe", id: "m3", role: "comptoir" }, [
        makeMember({ id: "m2", nom: "Awa Ngo" }),
        makeMember({ id: "m3", nom: "Paul Biya" }),
      ])

      expect(wrapper.get(PILL).text()).toContain("Paul Biya")
      expect(wrapper.get(PILL).text()).not.toContain("Awa Ngo")
      wrapper.unmount()
    })

    it("wears a crown for the direction role", async () => {
      const wrapper = await mountPill({ type: "equipe", id: "m2", role: "direction" }, [
        makeMember({ id: "m2", roles: ["direction"] }),
      ])

      expect(wrapper.get(PILL).find(CROWN).exists()).toBe(true)
      wrapper.unmount()
    })

    it("wears no crown for other roles", async () => {
      const wrapper = await mountPill({ type: "equipe", id: "m2", role: "comptoir" }, [
        makeMember({ id: "m2", roles: ["comptoir"] }),
      ])

      expect(wrapper.find(CROWN).exists()).toBe(false)
      wrapper.unmount()
    })

    it("can be reached from the keyboard", async () => {
      const wrapper = await mountPill({ type: "equipe", id: "m2", role: "comptoir" }, [makeMember({ id: "m2" })])

      expect(wrapper.get(PILL).attributes("tabindex")).toBe("0")
      wrapper.unmount()
    })
  })

  describe("a member missing from the roster", () => {
    it("falls back to the translated role labels and keeps the raw id out of the text", async () => {
      const wrapper = await mountPill({ type: "equipe", id: UUID, role: "direction,comptoir" })
      const pill = wrapper.get(PILL)

      expect(pill.text()).toContain("Direction, Counter")
      expect(pill.text()).not.toContain(UUID)
      expect(pill.text()).not.toContain("You")
      wrapper.unmount()
    })

    it("shows unknown role codes as they are", async () => {
      const wrapper = await mountPill({ type: "equipe", id: UUID, role: "direction,mystere" })

      expect(wrapper.get(PILL).text()).toContain("Direction, mystere")
      wrapper.unmount()
    })

    it("says Unknown when there is no role either", async () => {
      const wrapper = await mountPill({ type: "equipe", id: UUID, role: null })

      expect(wrapper.get(PILL).text()).toContain("Unknown")
      wrapper.unmount()
    })

    it("keeps the id reachable as the pill's title", async () => {
      const wrapper = await mountPill({ type: "equipe", id: UUID, role: "comptoir" })

      expect(wrapper.get(PILL).element.closest("[title]")?.getAttribute("title")).toBe(UUID)
      wrapper.unmount()
    })
  })

  describe("the hover card", () => {
    it("opens on focus and introduces a roster member", async () => {
      const wrapper = await mountPill({ type: "equipe", id: "m2", role: "comptoir" }, [
        makeMember({ id: "m2", nom: "Awa Ngo", courriel: "awa@example.com", roles: ["comptoir"] }),
      ])
      expect(document.body.querySelector(CARD)).toBeNull()

      const card = await openCard(wrapper)

      expect(card.textContent).toContain("Awa Ngo")
      expect(card.textContent).toContain("Counter")
      expect(card.textContent).toContain("awa@example.com")
      wrapper.unmount()
    })

    it("says no team profile is available for an unresolved member", async () => {
      const wrapper = await mountPill({ type: "equipe", id: UUID, role: "comptoir" })
      const card = await openCard(wrapper)

      expect(card.textContent).toContain("No team profile available")
      wrapper.unmount()
    })
  })

  describe("a system movement", () => {
    it("reads System and offers no hover card", async () => {
      const wrapper = await mountPill({ type: "systeme", id: null, role: null })

      expect(wrapper.get(SYSTEM).text()).toBe("System")
      expect(wrapper.find(PILL).exists()).toBe(false)

      await wrapper.get(SYSTEM).trigger("focus")
      await new Promise(resolve => setTimeout(resolve, 400))
      expect(document.body.querySelector(CARD)).toBeNull()
      wrapper.unmount()
    })

    it("reads Système in French", async () => {
      const i18n = useNuxtApp().$i18n
      await i18n.loadLocaleMessages("fr")
      i18n.locale.value = "fr"
      await flushPromises()
      const wrapper = await mountPill({ type: "systeme", id: null, role: null })

      expect(wrapper.get(SYSTEM).text()).toBe("Système")
      wrapper.unmount()
    })
  })
})

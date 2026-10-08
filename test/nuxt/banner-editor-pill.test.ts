import type { TeamMember } from "@/types/api/equipe"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import ContentBannerEditorPill from "@/components/content/BannerEditorPill.vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

const PILL = "[data-testid='banner-editor-pill']"
const CARD = "[data-testid='banner-editor-card']"
const CROWN = "[data-testid='banner-editor-crown']"
const COPY = "[data-testid='banner-editor-copy']"
const CARD_LOADING = "[data-testid='banner-editor-card-loading']"

const EDITOR = { name: "Awa Ngo", email: "awa@example.com" }

function member(overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    id: "m1",
    courriel: "awa@example.com",
    nom: "Awa Ngo",
    telephone: "+237 677 12 34 56",
    roles: ["direction", "comptoir"],
    comptoirs: ["Douala"],
    actif: true,
    creeLe: "2025-03-12T09:00:00.000Z",
    premiereConnexionLe: null,
    desactiveLe: null,
    ...overrides,
  }
}

function seedRoster(elements: TeamMember[]) {
  useNuxtApp().$queryClient.setQueryData(apiQueryKeys.team.list({ taille: 200 }), {
    pages: [{ total: elements.length, page: 1, taille: 200, pages: 1, elements }],
    pageParams: [1],
  })
}

function mountPill(editor = EDITOR) {
  return mountSuspended(ContentBannerEditorPill, { props: { editor }, attachTo: document.body })
}

/** The card is portalled to <body>, and opens after a short delay once the pill takes focus. */
async function openCard(wrapper: Awaited<ReturnType<typeof mountPill>>) {
  await wrapper.get(PILL).trigger("focus")
  await vi.waitFor(() => expect(document.body.querySelector(CARD)).not.toBeNull())
  return document.body.querySelector(CARD) as HTMLElement
}

describe("banner editor pill and profile card", () => {
  const writeText = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    writeText.mockClear()
    // The component reads the window's navigator, which is not always the global one under happy-dom.
    for (const target of new Set([window.navigator, globalThis.navigator]))
      Object.defineProperty(target, "clipboard", { value: { writeText }, configurable: true })
  })
  afterEach(() => {
    useNuxtApp().$i18n.locale.value = "en"
    useNuxtApp().$queryClient.clear()
    document.body.innerHTML = ""
  })

  describe("the pill", () => {
    it("names the editor and shows their initials", async () => {
      seedRoster([member()])
      const wrapper = await mountPill()

      expect(wrapper.get(PILL).text()).toContain("Awa Ngo")
      expect(wrapper.get(PILL).text()).toContain("AN")
      expect(wrapper.get(PILL).text()).not.toContain("awa@example.com")

      wrapper.unmount()
    })

    it("wears a crown when the person has the direction role", async () => {
      seedRoster([member({ roles: ["comptoir", "direction"] })])
      const wrapper = await mountPill()

      expect(wrapper.get(PILL).find(CROWN).exists()).toBe(true)

      wrapper.unmount()
    })

    it("wears no crown for any other role", async () => {
      seedRoster([member({ roles: ["comptoir", "livreur"] })])
      const wrapper = await mountPill()

      expect(wrapper.find(CROWN).exists()).toBe(false)

      wrapper.unmount()
    })

    it("wears no crown when the person is not in the team directory", async () => {
      seedRoster([])
      const wrapper = await mountPill()

      expect(wrapper.find(CROWN).exists()).toBe(false)

      wrapper.unmount()
    })

    it("finds the person even when the stamp has no email to match on", async () => {
      seedRoster([member()])
      const wrapper = await mountPill({ name: "Awa Ngo", email: null as unknown as string })

      expect(wrapper.get(PILL).text()).toContain("Awa Ngo")
      expect(wrapper.find(CROWN).exists()).toBe(false)

      wrapper.unmount()
    })

    it("can be reached from the keyboard", async () => {
      seedRoster([member()])
      const wrapper = await mountPill()

      expect(wrapper.get(PILL).attributes("tabindex")).toBe("0")

      wrapper.unmount()
    })
  })

  describe("the card", () => {
    it("opens when the pill takes focus, and stays closed until then", async () => {
      seedRoster([member()])
      const wrapper = await mountPill()
      expect(document.body.querySelector(CARD)).toBeNull()

      await openCard(wrapper)

      wrapper.unmount()
    })

    it("introduces the person: name, roles, counters and since when", async () => {
      seedRoster([member()])
      const wrapper = await mountPill()
      const card = await openCard(wrapper)

      expect(card.textContent).toContain("Awa Ngo")
      expect(card.textContent).toContain("Direction")
      expect(card.textContent).toContain("Counter")
      expect(card.textContent).toContain("Douala")
      expect(card.textContent).toContain("Mar 2025")
      expect(card.textContent).toContain("Active")

      wrapper.unmount()
    })

    it("puts the crown beside the name here too", async () => {
      seedRoster([member()])
      const wrapper = await mountPill()
      const card = await openCard(wrapper)

      expect(card.querySelector(CROWN)).not.toBeNull()

      wrapper.unmount()
    })

    it("speaks French when the panel does", async () => {
      const i18n = useNuxtApp().$i18n
      await i18n.loadLocaleMessages("fr")
      i18n.locale.value = "fr"
      await flushPromises()
      seedRoster([member()])
      const wrapper = await mountPill()
      const card = await openCard(wrapper)

      expect(card.textContent).toContain("Comptoir")
      expect(card.textContent).toContain("mars 2025")
      expect(card.textContent).toContain("Actif")
      expect(card.querySelector(COPY)?.getAttribute("aria-label")).toBe("Copier l'e-mail")

      wrapper.unmount()
    })

    it("marks a deactivated member as inactive, with the day they were deactivated", async () => {
      seedRoster([member({ actif: false, desactiveLe: "2026-09-02T10:00:00.000Z" })])
      const wrapper = await mountPill()
      const card = await openCard(wrapper)

      expect(card.textContent).toContain("Inactive")
      expect(card.textContent).not.toContain("Active")
      expect(card.textContent).toContain("Deactivated")
      expect(card.textContent).toContain("Sep 2, 2026")

      wrapper.unmount()
    })

    it("says whole shop when the member has no counters of their own", async () => {
      seedRoster([member({ comptoirs: [] })])
      const wrapper = await mountPill()
      const card = await openCard(wrapper)

      expect(card.textContent).toContain("Mar 2025")
      expect(card.textContent).toContain("Whole shop")

      wrapper.unmount()
    })

    it("says so when the person is not in the team directory, and still shows who the stamp names", async () => {
      seedRoster([])
      const wrapper = await mountPill()
      const card = await openCard(wrapper)

      expect(card.textContent).toContain("Awa Ngo")
      expect(card.textContent).toContain("awa@example.com")
      expect(card.textContent).toContain("No team profile available")
      expect(card.textContent).not.toContain("Direction")

      wrapper.unmount()
    })

    it("waits for the directory instead of claiming the person is missing from it", async () => {
      const cleanup = registerEndpoint("/api/v1/equipe/membres/annuaire", () => new Promise(() => {}))
      const wrapper = await mountPill()
      const card = await openCard(wrapper)

      expect(card.querySelector(CARD_LOADING)).not.toBeNull()
      expect(card.textContent).not.toContain("No team profile available")

      wrapper.unmount()
      cleanup()
    })
  })

  describe("copying the email", () => {
    it("is an icon-only button next to the address, named for assistive tech", async () => {
      seedRoster([member()])
      const wrapper = await mountPill()
      const card = await openCard(wrapper)
      const button = card.querySelector(COPY) as HTMLButtonElement

      expect(card.textContent).toContain("awa@example.com")
      expect(button.textContent?.trim()).toBe("")
      expect(button.getAttribute("aria-label")).toBe("Copy email")

      wrapper.unmount()
    })

    it("puts the address on the clipboard and says it did", async () => {
      seedRoster([member()])
      const wrapper = await mountPill()
      const card = await openCard(wrapper)
      const button = card.querySelector(COPY) as HTMLButtonElement

      button.click()
      await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith("awa@example.com"))
      await vi.waitFor(() => expect(button.getAttribute("aria-label")).toBe("Email copied"))

      wrapper.unmount()
    })

    it("does not claim success when the browser refuses the copy", async () => {
      writeText.mockRejectedValueOnce(new Error("denied"))
      seedRoster([member()])
      const wrapper = await mountPill()
      const card = await openCard(wrapper)
      const button = card.querySelector(COPY) as HTMLButtonElement

      button.click()
      await vi.waitFor(() => expect(writeText).toHaveBeenCalled())
      await flushPromises()

      expect(button.getAttribute("aria-label")).toBe("Copy email")

      wrapper.unmount()
    })

    it("copies from a person who is not in the directory too", async () => {
      seedRoster([])
      const wrapper = await mountPill()
      const card = await openCard(wrapper)

      ;(card.querySelector(COPY) as HTMLButtonElement).click()
      await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith("awa@example.com"))

      wrapper.unmount()
    })

    it("offers no copy button when the stamp carries no address", async () => {
      seedRoster([])
      const wrapper = await mountPill({ name: "Awa Ngo", email: null as unknown as string })
      const card = await openCard(wrapper)

      expect(card.querySelector(COPY)).toBeNull()

      wrapper.unmount()
    })
  })
})

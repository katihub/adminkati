import type { KatiReport, KatiReviewList } from "@/composables/useKatiApprentissage"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import OperationsPage from "@/pages/operations.vue"

const BASE = "/api/v1/assistant/administration/kati"

const review: KatiReviewList = {
  jours: 30,
  total: 3,
  elements: [
    {
      question: "je veux le tchop",
      frequence: 3,
      dernierLe: "2026-10-30T09:00:00.000Z",
      types: ["incomprise"],
      passations: 0,
      ids: ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"],
      conversationId: null,
    },
  ],
}

const report: KatiReport = {
  jours: 7,
  questions: 120,
  tauxComprehension: 91.7,
  tauxPassation: 4.2,
  partIa: 100,
  dureeMedianeMs: 4200,
  jetons: { entree: 400_000, sortie: 20_000 },
  replis: {},
  plusFrequentes: [{ question: "un laptop de 200 000f", frequence: 9 }],
  nonComprises: [],
}

const cleanups: (() => void)[] = []
function endpoint(path: string, options: Parameters<typeof registerEndpoint>[1]) {
  cleanups.push(registerEndpoint(path, options))
}

function seedSession() {
  useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
    userId: "u1",
    membreId: "m1",
    nom: "Ada",
    courriel: "ada@example.com",
    roles: ["comptoir"],
  })
}

describe("Kati review workspace", () => {
  afterEach(() => {
    while (cleanups.length > 0) cleanups.pop()?.()
    useNuxtApp().$queryClient.clear()
  })

  it("shows the weekly report and the questions to review, and teaches a synonym from one of them", async () => {
    seedSession()
    const taught: unknown[] = []
    endpoint(`${BASE}/a-revoir`, { method: "GET", handler: () => review })
    endpoint(`${BASE}/rapport`, { method: "GET", handler: () => report })
    endpoint(`${BASE}/corrections`, { method: "GET", handler: () => [] })
    endpoint(`${BASE}/corrections`, {
      method: "POST",
      handler: async event => {
        taught.push(await readBody(event))
        return { id: "c1" }
      },
    })

    const wrapper = await mountSuspended(OperationsPage, {
      route: "/operations?tab=kati-review",
      attachTo: document.body,
    })
    await flushPromises()

    await vi.waitFor(() => expect(wrapper.findAll("[data-testid='kati-review-item']")).toHaveLength(1))
    expect(wrapper.get("[data-testid='kati-report']").text()).toContain("91.7")
    expect(wrapper.get("[data-testid='kati-review-item']").text()).toContain("je veux le tchop")

    const synonym = wrapper.get("[data-testid='kati-review-item']").findAll("button")[0]!
    await synonym.trigger("click")
    await flushPromises()
    const target = document.body.querySelector<HTMLInputElement>("[data-testid='kati-target']")!
    target.value = "alimentation"
    target.dispatchEvent(new Event("input"))
    await flushPromises()
    document.body.querySelector<HTMLButtonElement>("[data-testid='kati-submit']")!.click()

    await vi.waitFor(() =>
      expect(taught).toEqual([
        { genre: "synonyme", expression: "je veux le tchop", cible: "alimentation", tours: review.elements[0]!.ids },
      ]),
    )
    wrapper.unmount()
  })
})

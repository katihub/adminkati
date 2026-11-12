import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { getQuery } from "h3"
import { afterEach, describe, expect, it, vi } from "vitest"
import AuditPage from "@/pages/audit.vue"

const downloadBlob = vi.hoisted(() => vi.fn())
vi.mock("@/utils/download-file", () => ({ downloadBlob }))

/** The audit page (12 November 2026): the journal, with a name on each author and the IP address. */
const entries = [
  {
    id: "42",
    action: "marketplace.retrait.approuve",
    cibleType: "finance_vendeur",
    cibleId: "RET-1",
    acteurType: "equipe",
    acteurId: "m1",
    acteurRole: "direction",
    acteurNom: "Arnauld",
    acteurBoutique: null,
    ip: "41.202.1.10",
    agent: "Mozilla/5.0",
    detail: { motif: "Pièces conformes" },
    creeLe: "2026-11-12T08:00:00.000Z",
  },
  {
    id: "41",
    action: "vendeur.boutique.logo_change",
    cibleType: "boutique",
    cibleId: "shop-1",
    acteurType: "vendeur",
    acteurId: "u2",
    acteurRole: null,
    acteurNom: "Aline",
    acteurBoutique: "Helogan",
    ip: null,
    agent: null,
    detail: null,
    creeLe: "2026-11-12T07:00:00.000Z",
  },
]

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach(cleanup => cleanup())
  cleanups = []
  downloadBlob.mockReset()
  useNuxtApp().$queryClient.clear()
})

describe("audit page", () => {
  it("is reserved to the direction", () => {
    const route = useRouter().resolve("/audit")
    expect(route.matched.length).toBeGreaterThan(0)
    expect(route.meta.roles).toEqual(["direction"])
  })

  it("lists the actions with their author, object and IP, filters them and exports the selection", async () => {
    const queries: Array<Record<string, unknown>> = []
    const exports: Array<Record<string, unknown>> = []
    cleanups = [
      registerEndpoint("/api/v1/audit", {
        method: "GET",
        handler: event => {
          queries.push(getQuery(event))
          return { total: 2, page: 1, taille: 50, pages: 1, elements: entries }
        },
      }),
      registerEndpoint("/api/v1/audit/export", {
        method: "GET",
        handler: event => {
          exports.push(getQuery(event))
          return "Date;Action\r\n"
        },
      }),
      registerEndpoint("/api/v1/equipe", {
        method: "GET",
        handler: () => ({ total: 0, page: 1, taille: 200, pages: 1, elements: [] }),
      }),
    ]
    const wrapper = await mountSuspended(AuditPage)
    await vi.waitFor(() => expect(wrapper.find('[data-testid="audit-entry-42"]').exists()).toBe(true))

    const first = wrapper.get('[data-testid="audit-entry-42"]')
    expect(first.get('[data-testid="audit-entry-author"]').text()).toContain("Arnauld")
    expect(first.get('[data-testid="audit-entry-ip"]').text()).toBe("41.202.1.10")
    expect(first.text()).toContain("Pièces conformes")
    expect(wrapper.get('[data-testid="audit-entry-41"] [data-testid="audit-entry-author"]').text()).toContain(
      "Aline · Helogan",
    )

    await wrapper.get('[data-testid="audit-category"]').setValue("argent")
    await vi.waitFor(() => expect(queries.at(-1)).toEqual(expect.objectContaining({ categorie: "argent", page: "1" })))

    await wrapper.get('[data-testid="audit-export"]').trigger("click")
    await vi.waitFor(() => expect(downloadBlob).toHaveBeenCalledTimes(1))
    expect(exports[0]).toEqual({ categorie: "argent" })
    wrapper.unmount()
  })
})

import type { BanniereAdmin } from "@/types/api/vitrine"
import type { Role } from "@/types/session"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { afterEach, describe, expect, it, vi } from "vitest"
import SystemEvidence from "@/components/admin/SystemEvidence/SystemEvidence.vue"
import BannerOverview from "@/components/content/BannerOverview/BannerOverview.vue"
import OutboundNotificationsWorkspace from "@/components/operations/OutboundNotificationsWorkspace.vue"
import RoleGuide from "@/components/team/RoleGuide/RoleGuide.vue"
import { TEAM_ROLES } from "@/types/api/equipe"

const abandonedId = "77777777-7777-4777-8777-777777777777"
const cleanups: Array<() => void> = []
const wrappers: Array<{ unmount: () => void }> = []

function seedSession(roles: Role[]) {
  useNuxtApp().$queryClient.setQueryData(["v1", "moi"], {
    userId: "admin-governance",
    membreId: "admin-governance",
    nom: "Governance reader",
    courriel: "reader@example.test",
    roles,
    comptoirs: [],
  })
}

function registerQueue() {
  const reads = vi.fn()
  cleanups.push(
    registerEndpoint("/api/v1/notifications/synthese", {
      method: "GET",
      handler: () => {
        reads()
        return { en_attente: 1, en_cours: 0, envoyee: 1, abandonnee: 1, attentePlusAncienneMinutes: 2 }
      },
    }),
    registerEndpoint("/api/v1/notifications", {
      method: "GET",
      handler: () => ({
        elements: [
          {
            id: abandonedId,
            evenement: "commande.confirmee",
            destinataire: "private-buyer@example.test",
            destinataireType: "client",
            sujet: "Order awaiting notification",
            objetType: "commande",
            objetId: "order-private",
            statut: "abandonnee",
            tentatives: 8,
            prochaineTentativeLe: null,
            derniereErreur: "Provider unavailable",
            fournisseur: null,
            envoyeeLe: null,
            creeLe: "2026-10-30T10:00:00.000Z",
          },
        ],
        total: 1,
        page: 1,
        taille: 30,
        pages: 1,
      }),
    }),
  )
  return reads
}

describe("administration governance", () => {
  afterEach(() => {
    wrappers.splice(0).forEach(wrapper => wrapper.unmount())
    cleanups.splice(0).forEach(cleanup => cleanup())
    useNuxtApp().$queryClient.clear()
  })

  it("does not present stale successful recovery evidence while its current status is loading", async () => {
    const wrapper = await mountSuspended(SystemEvidence, {
      props: {
        data: {
          verifieLe: "2026-10-30T12:00:00.000Z",
          fuseau: "Africa/Douala",
          sauvegarde: { statut: "ok", date: "2026-10-30T11:00:00.000Z", horsSite: true },
          restauration: { statut: "ok", date: "2026-10-29T11:00:00.000Z" },
        },
        loading: true,
        error: null,
      },
    })
    wrappers.push(wrapper)
    expect(wrapper.find("[data-testid='admin-system-sauvegarde']").exists()).toBe(false)
    expect(wrapper.find("[data-testid='admin-system-restauration']").exists()).toBe(false)
  })

  it("offers retry on recovery status failure without displaying successful evidence", async () => {
    const wrapper = await mountSuspended(SystemEvidence, {
      props: { data: undefined, loading: false, error: { statusCode: 404, message: "Unavailable" } },
    })
    wrappers.push(wrapper)
    expect(wrapper.find("[data-testid='admin-system-sauvegarde']").exists()).toBe(false)
    expect(wrapper.find("[data-testid='admin-system-restauration']").exists()).toBe(false)
    await wrapper.get("button").trigger("click")
    expect(wrapper.emitted("retry")).toHaveLength(1)
  })

  it("labels absent recovery reports as unconfigured and off-site evidence as unconfirmed", async () => {
    const wrapper = await mountSuspended(SystemEvidence, {
      props: {
        data: {
          verifieLe: "2026-10-30T12:00:00.000Z",
          fuseau: "Africa/Douala",
          sauvegarde: { statut: "non_configuree", date: null, horsSite: null },
          restauration: { statut: "non_configuree", date: null },
        },
        loading: false,
        error: null,
      },
    })
    wrappers.push(wrapper)
    for (const kind of ["sauvegarde", "restauration"]) {
      const article = wrapper.get(`[data-testid='admin-system-${kind}']`)
      expect(article.text()).toMatch(/Not configured|Non configurée/)
      expect(article.text()).toMatch(/No usable dated evidence|Aucune preuve datée exploitable/)
      expect(article.text()).not.toMatch(/Recent successful report|Rapport récent réussi/)
    }
    expect(wrapper.text()).toMatch(/Not confirmed|Non confirmée/)
  })

  it("counts actual banner placements, publication and dedicated mobile variants separately", async () => {
    const base: BanniereAdmin = {
      id: 1,
      emplacement: "principal",
      ordre: 0,
      active: true,
      fichier_large: "large.webp",
      largeur_large: 1333,
      hauteur_large: 444,
      fichier_mobile: null,
      largeur_mobile: null,
      hauteur_mobile: null,
      href: "/catalogue",
      libelle: "Banner",
      alt: "Products",
      focus: 50,
      creee_le: "2026-10-30T00:00:00.000Z",
      modifiee_le: "2026-10-30T00:00:00.000Z",
      modifiee_par: null,
      url_large: "https://example.test/banner.webp",
      url_mobile: null,
    }
    const banners: BanniereAdmin[] = [
      base,
      { ...base, id: 2, active: false, url_mobile: "https://example.test/mobile.webp" },
      { ...base, id: 3, emplacement: "promo" },
      { ...base, id: 4, emplacement: "pub_accueil", active: false, url_mobile: "https://example.test/ad-mobile.webp" },
    ]
    const wrapper = await mountSuspended(BannerOverview, { props: { banners, isPending: false, error: null } })
    wrappers.push(wrapper)
    for (const [metric, expected] of Object.entries({ total: 4, active: 2, principal: 2, promo: 1, mobile: 2 })) {
      expect(wrapper.get(`[data-testid='banner-overview-${metric}']`).text()).toMatch(new RegExp(`\\b${expected}\\b`))
    }
  })

  it.each([
    { isPending: true, error: null },
    { isPending: false, error: new Error("Unavailable") },
  ])(
    "keeps banner totals unknown while loading or failed instead of announcing a successful empty catalogue",
    async state => {
      const wrapper = await mountSuspended(BannerOverview, { props: { banners: [], ...state } })
      wrappers.push(wrapper)
      for (const metric of ["total", "active", "principal", "promo", "mobile"]) {
        const count = wrapper.find(`[data-testid='banner-overview-${metric}']`)
        expect(count.exists() ? count.text() : "").not.toMatch(/\b0\b/)
      }
    },
  )

  it("explains every existing team role and highlights only assigned roles without offering assignment controls", async () => {
    const wrapper = await mountSuspended(RoleGuide, { props: { selectedRoles: ["comptoir", "point_focal"] } })
    wrappers.push(wrapper)
    for (const role of TEAM_ROLES) {
      const article = wrapper.get(`[data-testid='team-role-guide-${role}']`)
      expect(article.text().trim().length).toBeGreaterThan(30)
      expect(article.attributes("aria-current") === "true").toBe(role === "comptoir" || role === "point_focal")
    }
    expect(wrapper.find("button,input,select,[role='checkbox']").exists()).toBe(false)
  })

  it("does not expose notification recipients or sending controls to a non-direction session", async () => {
    seedSession(["comptoir"])
    const reads = registerQueue()
    const wrapper = await mountSuspended(OutboundNotificationsWorkspace)
    wrappers.push(wrapper)
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(wrapper.find("[data-testid='outbound-notifications-dispatch']").exists()).toBe(false)
    expect(wrapper.find(`[data-testid='outbound-notification-retry-${abandonedId}']`).exists()).toBe(false)
    expect(wrapper.text()).not.toContain("private-buyer@example.test")
    expect(reads).not.toHaveBeenCalled()
  })

  it("requires confirmation and allows direction to cancel dispatch without sending", async () => {
    seedSession(["direction"])
    registerQueue()
    const dispatch = vi.fn()
    cleanups.push(
      registerEndpoint("/api/v1/notifications/traiter", {
        method: "POST",
        handler: () => {
          dispatch()
          return { prises: 1, envoyees: 1, reprogrammees: 0, abandonnees: 0 }
        },
      }),
    )
    const wrapper = await mountSuspended(OutboundNotificationsWorkspace, { attachTo: document.body })
    wrappers.push(wrapper)
    await wrapper.get("[data-testid='outbound-notifications-dispatch']").trigger("click")
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(dispatch).not.toHaveBeenCalled()
    const cancel = document.querySelector<HTMLButtonElement>("[data-testid='outbound-notifications-dispatch-cancel']")
    expect(cancel).not.toBeNull()
    cancel!.click()
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(dispatch).not.toHaveBeenCalled()
  })

  it("submits one dispatch when direction double-confirms before the DOM can disable its action", async () => {
    seedSession(["direction"])
    registerQueue()
    const dispatch = vi.fn()
    let release: (() => void) | undefined
    const pending = new Promise<void>(resolve => {
      release = resolve
    })
    cleanups.push(
      registerEndpoint("/api/v1/notifications/traiter", {
        method: "POST",
        handler: async () => {
          dispatch()
          await pending
          return { prises: 1, envoyees: 1, reprogrammees: 0, abandonnees: 0 }
        },
      }),
    )
    const wrapper = await mountSuspended(OutboundNotificationsWorkspace, { attachTo: document.body })
    wrappers.push(wrapper)
    await wrapper.get("[data-testid='outbound-notifications-dispatch']").trigger("click")
    const button = document.querySelector<HTMLButtonElement>("[data-testid='outbound-notifications-dispatch-confirm']")
    expect(button).not.toBeNull()
    button!.click()
    button!.click()
    try {
      await vi.waitFor(() => expect(dispatch).toHaveBeenCalled())
      await new Promise(resolve => setTimeout(resolve, 50))
      expect(dispatch).toHaveBeenCalledTimes(1)
    } finally {
      release?.()
    }
  })
})

import type { PointVenteAdmin } from "@/types/api/vitrine"
import type { Role } from "@/types/session"
import { apiQueryKeys } from "@/utils/api-query-keys"

/**
 * The counters every perimeter screen reads, seeded into the cache rather than
 * served: the panel's only source is `GET administration/points-vente`, and the
 * screens under test care about what the list says, not about how it arrived.
 */
export function makeComptoirPoints(overrides: Partial<PointVenteAdmin>[] = []): PointVenteAdmin[] {
  const defaults: Partial<PointVenteAdmin>[] =
    overrides.length > 0
      ? overrides
      : [
          { cle: "Akwa", libelle: "Akwa" },
          { cle: "Centre-ville", libelle: "Centre-ville" },
        ]

  return defaults.map((point, index) => ({
    id: index + 1,
    cle: `Comptoir-${index + 1}`,
    libelle: `Comptoir ${index + 1}`,
    ville: "Douala",
    quartier: "Quartier",
    repere: "Repère",
    telephones: [],
    carte: null,
    horaires: null,
    latitude: null,
    longitude: null,
    ordre: (index + 1) * 10,
    active: true,
    creee_le: "2026-09-01T08:00:00.000Z",
    modifiee_le: "2026-09-01T08:00:00.000Z",
    modifiee_par: null,
    ...point,
  }))
}

/** A signed-in session plus the counters it may read. `comptoirs` is the caller's own perimeter. */
export function seedSession(
  options: {
    roles?: Role[]
    comptoirs?: string[]
    points?: PointVenteAdmin[]
  } = {},
) {
  const queryClient = useNuxtApp().$queryClient
  queryClient.setQueryData(["v1", "moi"], {
    userId: "u1",
    membreId: "m1",
    nom: "Admin",
    courriel: "admin@example.com",
    roles: options.roles ?? ["direction"],
    comptoirs: options.comptoirs ?? [],
  })
  queryClient.setQueryData(apiQueryKeys.pointsOfSale.all, options.points ?? makeComptoirPoints())
}

/** The common case: a director, who is the only role allowed to write a member's counters. */
export function seedDirectionWithComptoirs(points: PointVenteAdmin[] = makeComptoirPoints()) {
  seedSession({ roles: ["direction"], points })
}

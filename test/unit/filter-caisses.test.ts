import type { CaisseListItem } from "../../app/types/api/caisse"
import type { TeamMember } from "../../app/types/api/equipe"
import { describe, expect, it } from "vitest"
import { filterCaisses } from "../../app/utils/filter-caisses"

function makeCaisse(overrides: Partial<CaisseListItem> = {}): CaisseListItem {
  return {
    id: "caisse-1",
    porteurId: "membre-1",
    journee: "2026-09-08T00:00:00.000Z",
    statut: "ouverte",
    montantAttendu: 10_000,
    montantCompte: null,
    ecart: null,
    compteePar: null,
    compteeLe: null,
    valideePar: null,
    valideeLe: null,
    note: null,
    creeLe: "2026-09-08T08:00:00.000Z",
    ecarts: [],
    _count: { encaissements: 1 },
    ...overrides,
  }
}

function makeMember(overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    id: "membre-1",
    courriel: "awa@example.com",
    nom: "Awa Ngo",
    telephone: null,
    roles: ["comptoir"],
    comptoirs: [],
    actif: true,
    creeLe: "2026-01-01T00:00:00.000Z",
    invitLe: null,
    premiereConnexionLe: null,
    desactiveLe: null,
    ...overrides,
  }
}

const TEAM = [makeMember({ id: "membre-1", nom: "Awa Ngo" }), makeMember({ id: "membre-2", nom: "Paul Eto" })]

describe("filterCaisses", () => {
  it("keeps only ouverte and litige caisses under the needs-attention filter", () => {
    const caisses = [
      makeCaisse({ id: "c1", statut: "ouverte" }),
      makeCaisse({ id: "c2", statut: "litige" }),
      makeCaisse({ id: "c3", statut: "comptee" }),
      makeCaisse({ id: "c4", statut: "validee" }),
    ]

    const result = filterCaisses(caisses, { searchTerm: "", statusFilter: "attention", selectedPorteurId: null }, TEAM)

    expect(result.map(c => c.id)).toEqual(["c1", "c2"])
  })

  it("keeps only the exact status when a real status filter is set", () => {
    const caisses = [makeCaisse({ id: "c1", statut: "ouverte" }), makeCaisse({ id: "c2", statut: "comptee" })]

    const result = filterCaisses(caisses, { searchTerm: "", statusFilter: "comptee", selectedPorteurId: null }, TEAM)

    expect(result.map(c => c.id)).toEqual(["c2"])
  })

  it("keeps everything when the status filter is undefined (all)", () => {
    const caisses = [makeCaisse({ id: "c1", statut: "ouverte" }), makeCaisse({ id: "c2", statut: "validee" })]

    const result = filterCaisses(caisses, { searchTerm: "", statusFilter: undefined, selectedPorteurId: null }, TEAM)

    expect(result.map(c => c.id)).toEqual(["c1", "c2"])
  })

  it("filters by the resolved porteur name, case-insensitively", () => {
    const caisses = [makeCaisse({ id: "c1", porteurId: "membre-1" }), makeCaisse({ id: "c2", porteurId: "membre-2" })]

    const result = filterCaisses(
      caisses,
      { searchTerm: "paul", statusFilter: undefined, selectedPorteurId: null },
      TEAM,
    )

    expect(result.map(c => c.id)).toEqual(["c2"])
  })

  it("filters to one porteur when selectedPorteurId is set", () => {
    const caisses = [makeCaisse({ id: "c1", porteurId: "membre-1" }), makeCaisse({ id: "c2", porteurId: "membre-2" })]

    const result = filterCaisses(
      caisses,
      { searchTerm: "", statusFilter: undefined, selectedPorteurId: "membre-2" },
      TEAM,
    )

    expect(result.map(c => c.id)).toEqual(["c2"])
  })

  it("composes status, search, and porteur filters together", () => {
    const caisses = [
      makeCaisse({ id: "c1", porteurId: "membre-1", statut: "ouverte" }),
      makeCaisse({ id: "c2", porteurId: "membre-1", statut: "validee" }),
      makeCaisse({ id: "c3", porteurId: "membre-2", statut: "ouverte" }),
    ]

    const result = filterCaisses(
      caisses,
      { searchTerm: "awa", statusFilter: "attention", selectedPorteurId: "membre-1" },
      TEAM,
    )

    expect(result.map(c => c.id)).toEqual(["c1"])
  })

  it("excludes a caisse whose porteur isn't in the roster yet, when searching by name", () => {
    const caisses = [makeCaisse({ id: "c1", porteurId: "membre-unknown" })]

    const result = filterCaisses(
      caisses,
      { searchTerm: "anything", statusFilter: undefined, selectedPorteurId: null },
      TEAM,
    )

    expect(result).toEqual([])
  })
})

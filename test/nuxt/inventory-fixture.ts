import type { TeamMember } from "@/types/api/equipe"
import type { InventaireHistorique, InventaireProduit, MouvementStock } from "@/types/api/inventaire"
import { apiQueryKeys } from "@/utils/api-query-keys"
import { stubEndpoint } from "./delivery-fixture"

const PRODUCT_PATH = "/api/v1/catalogue/administration/produits"

export function inventoryPath(productId: number) {
  return `${PRODUCT_PATH}/${productId}/inventaire`
}

export function makeInventory(overrides: Partial<InventaireProduit> = {}): InventaireProduit {
  return {
    produit_id: 42,
    quantite_stock: 5,
    statut_stock: "en_stock",
    modifie_le: "2026-09-29T10:00:00.000Z",
    disponibilite_forcee: null,
    ...overrides,
  }
}

export function makeMovement(overrides: Partial<MouvementStock> = {}): MouvementStock {
  return {
    id: "mv-1",
    type: "reception",
    variation: 5,
    quantite_avant: 0,
    quantite_apres: 5,
    motif: null,
    acteur: { type: "equipe", id: "m1", role: "direction" },
    commande_reference: null,
    cree_le: "2026-09-29T10:00:00.000Z",
    ...overrides,
  }
}

export function makeHistory(overrides: Partial<InventaireHistorique> = {}): InventaireHistorique {
  const mouvements = overrides.mouvements ?? []
  return {
    inventaire: makeInventory(),
    mouvements,
    page: 1,
    taille: 20,
    pages: 1,
    total: mouvements.length,
    ...overrides,
  }
}

/** Serves a saved product's inventory so mounting its form never hits an unregistered route. */
export function stubInventory(
  productId: number,
  history: InventaireHistorique = makeHistory({ inventaire: makeInventory({ produit_id: productId }) }),
) {
  stubEndpoint(inventoryPath(productId), "GET", () => history)
}

export function makeMember(overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    id: "m2",
    courriel: "awa@example.com",
    nom: "Awa Ngo",
    telephone: "+237 677 12 34 56",
    roles: ["comptoir"],
    comptoirs: ["Douala"],
    actif: true,
    creeLe: "2025-03-12T09:00:00.000Z",
    premiereConnexionLe: null,
    desactiveLe: null,
    ...overrides,
  }
}

/** Seeds the team roster the actor pill reads, so mounting it never fires an unstubbed request. */
export function seedRoster(elements: TeamMember[] = []) {
  useNuxtApp().$queryClient.setQueryData(apiQueryKeys.team.list({ taille: 200 }), {
    pages: [{ total: elements.length, page: 1, taille: 200, pages: 1, elements }],
    pageParams: [1],
  })
}

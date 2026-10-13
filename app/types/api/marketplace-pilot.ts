export type PilotStatus = "brouillon" | "pret" | "en_cours" | "suspendu" | "termine"
export type PilotDecision = "go" | "prolonger" | "bloque"
export type PilotAction = "demarrer" | "suspendre" | "terminer"

export interface PilotPolicy {
  joursObservationMinimum: number
  commandesLivreesMinimum: number
  tauxLivraisonMinimumBps: number
  tauxAnnulationMaximumBps: number
  tauxLitigeMaximumBps: number
  tempsRapprochementMaximumMinutes: number
  backlogSupportMaximum: number
}

export interface PilotMeasures {
  joursObserves: number
  commandesLivrees: number
  tauxLivraisonBps: number
  tauxAnnulationBps: number
  tauxLitigeBps: number
  tempsRapprochementP95Minutes: number
  backlogSupport: number
  ecartsFinanciersInexpliques: number
  incidentsCritiquesOuverts: number
  retoursTestes: boolean
  remboursementsTestes: boolean
  responsabilitesLogistiquesAuditables: boolean
}

export interface PilotEvaluation {
  id: string
  decision: PilotDecision
  bloquants: string[]
  observations: string[]
  creeLe: string
}

export interface MarketplacePilot {
  id: string
  nom: string
  statut: PilotStatus
  commenceLe: string | null
  termineLe: string | null
  plafondCommandesJournalier: number
  perimetre: { boutiqueIds?: string[] }
  politiqueGoNoGo: PilotPolicy
  ville: { nom: string; slug: string }
  evaluations: PilotEvaluation[]
}

export interface PilotMeasurement {
  periode: { debut: string | null; fin: string }
  mesures: PilotMeasures
}

export interface PilotReferences {
  villes: Array<{ id: string; nom: string; statut: string }>
  boutiques: Array<{ id: string; nom: string; villesLivraison: string[]; vendeur: string }>
}

export interface CreatePilotInput {
  villeId: string
  nom: string
  plafondCommandesJournalier: number
  boutiqueIds: string[]
  politique: PilotPolicy
}

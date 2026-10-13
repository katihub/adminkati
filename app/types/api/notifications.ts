export const OUTBOUND_NOTIFICATION_STATUSES = ["en_attente", "en_cours", "envoyee", "abandonnee"] as const
export type OutboundNotificationStatus = (typeof OUTBOUND_NOTIFICATION_STATUSES)[number]

export interface OutboundNotification {
  id: string
  evenement: string
  destinataire: string
  destinataireType: "client" | "vendeur" | "equipe"
  sujet: string
  objetType: string
  objetId: string
  statut: OutboundNotificationStatus
  tentatives: number
  prochaineTentativeLe: string
  derniereErreur: string | null
  fournisseur: string | null
  envoyeeLe: string | null
  creeLe: string
}

export interface OutboundNotificationsPage {
  elements: OutboundNotification[]
  total: number
  page: number
  taille: number
  pages: number
}

export type OutboundNotificationsSummary = Record<OutboundNotificationStatus, number> & {
  attentePlusAncienneMinutes: number
}

export interface OutboundNotificationFilters {
  statut?: OutboundNotificationStatus
  page?: number
  taille?: number
}

export interface OutboundDispatchReport {
  prises: number
  envoyees: number
  reprogrammees: number
  abandonnees: number
  ignore?: "fournisseur_absent" | "deja_en_cours"
}

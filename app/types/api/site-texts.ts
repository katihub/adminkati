/** Editable site texts: legal pages, About, FAQ and e-mails, versioned and published by the direction. */
export type SiteTextType = "legal" | "editorial" | "faq" | "courriel"
export type SiteTextStatus = "brouillon" | "soumis" | "publie" | "archive"
export type SiteTextEnglish = "absent" | "a_jour" | "a_mettre_a_jour"
export type SiteTextChange = "mineur" | "important"
export type TeamRole = "direction" | "comptoir" | "preparation" | "livreur" | "point_focal"

export interface PageBlock {
  titre: string
  texte: string
}

export interface PageSection {
  cle?: string
  titre: string
  paragraphes: string[]
  puces?: string[]
  blocs?: PageBlock[]
}

export interface PageContent {
  titre: string
  accroche?: string
  intro: string
  sections: PageSection[]
}

export interface FaqQuestion {
  id: string
  question: string
  reponse: string
  fiche?: string
}

export interface FaqContent {
  titre: string
  intro: string
  rubriques: Array<{ id: string; titre: string; questions: FaqQuestion[] }>
}

export interface EmailContent {
  sujet: string
  paragraphes: string[]
  bouton?: string
}

export type SiteTextContent = PageContent | FaqContent | EmailContent

export interface SiteTextVersion {
  id: string
  contenuCle: string
  numero: number | null
  statut: SiteTextStatus
  fr: SiteTextContent
  en: SiteTextContent | null
  anglais: SiteTextEnglish
  nature: SiteTextChange
  resume: string | null
  commentaireRenvoi: string | null
  baseVersionId: string | null
  redigeParNom?: string | null
  publieParNom?: string | null
  soumisLe: string | null
  publieLe: string | null
  modifieLe: string
}

export type SiteTextHistoryEntry = Omit<SiteTextVersion, "fr" | "en">

export interface SiteTextSummary {
  cle: string
  type: SiteTextType
  titre: string | null
  publiee: { numero: number; publieLe: string; anglais: SiteTextEnglish } | null
  enCours: {
    id: string
    statut: SiteTextStatus
    anglais: SiteTextEnglish
    modifieLe: string
    commentaireRenvoi: string | null
    redigeParNom: string | null
  } | null
}

export interface SiteTextDetail {
  cle: string
  type: SiteTextType
  publiee: SiteTextVersion | null
  enCours: SiteTextVersion | null
  historique: SiteTextHistoryEntry[]
  defaut: { fr: SiteTextContent; en: SiteTextContent | null } | null
  variables: string[]
}

export interface SiteTextRights {
  rediger: boolean
  publier: boolean
  reglages: boolean
}

export interface SiteTextSettings {
  rolesRedaction: TeamRole[]
}

export interface SaveDraftInput {
  fr: SiteTextContent
  en?: SiteTextContent | null
  nature?: SiteTextChange
  resume?: string | null
  anglaisConfirme?: boolean
}

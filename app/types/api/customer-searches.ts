/** Mirrors `GET /v1/catalogue/administration/requetes-clients`. */
export type CustomerSearchPeriod = 7 | 30 | 90

export interface CustomerSearchDashboard {
  periodeJours: CustomerSearchPeriod
  resume: {
    total: number
    uniques: number
    aujourdhui: number
  }
  populaires: Array<{
    requete: string
    occurrences: number
    derniere: string
  }>
  recentes: Array<{
    id: string
    requete: string
    rayon: string | null
    creeLe: string
  }>
}

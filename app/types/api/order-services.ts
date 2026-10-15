/** KatiHub's paid order services settings (direction only). */
export interface OrderServicesSettings {
  id: number
  assuranceActive: boolean
  /** Basis points of the products: 500 = 5 %. */
  assuranceTauxBps: number
  modifieLe: string
  modifiePar: string | null
}

export interface OrderServicesSettingsUpdate {
  assuranceActive?: boolean
  assuranceTauxBps?: number
}

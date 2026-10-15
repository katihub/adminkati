/** A neighbourhood of a city, proposed in the storefront's dropdowns. */
export interface LocalityDistrict {
  id: string
  nom: string
  actif: boolean
  ordre: number
}

/** A city of the dropdown lists and its neighbourhoods (direction view, inactive ones included). */
export interface LocalityCity {
  id: string
  nom: string
  active: boolean
  ordre: number
  quartiers: LocalityDistrict[]
}

export interface LocalityUpdate {
  nom?: string
  active?: boolean
  ordre?: number
}

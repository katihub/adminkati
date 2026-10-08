import { stripDiacritics } from "./slug"

function foldForSearch(value: string): string {
  return stripDiacritics(value).toLowerCase()
}

/**
 * Case- and accent-insensitive `includes`, for filtering option lists as the user types.
 * The catalogue's own names are inconsistent about accents ("Securité Electronique",
 * "Réseaux et Télecommunication", "Caméras de Surveillance"), so a plain lowercase match
 * made "securite" or "camera" find nothing even though the option was right there.
 */
export function includesIgnoringAccents(text: string, query: string): boolean {
  return foldForSearch(text).includes(foldForSearch(query))
}

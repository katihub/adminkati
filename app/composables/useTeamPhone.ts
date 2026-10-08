/**
 * LE FORMAT DU TÉLÉPHONE N'ÉTAIT ANNONCÉ NULLE PART.
 *
 * `InscrireMembreDto` et `ModifierMembreDto` n'acceptent qu'une seule forme —
 * `+237 6XX XX XX XX`, espaces compris (`src/equipe/equipe.dto.ts:26-52`). Le
 * panel, lui, affichait un `<input type="tel">` nu : on saisissait
 * « 677000001 », le backend refusait, et le motif n'arrivait qu'après
 * l'aller-retour. Le motif est donc recopié ici À L'IDENTIQUE pour que le refus
 * arrive avant l'appel, et le placeholder dit la forme attendue au lieu de la
 * laisser deviner.
 */
export const TEAM_PHONE_PATTERN = /^\+237 6\d{2} \d{2} \d{2} \d{2}$/

/** Ce que le champ montre tant qu'il est vide : la forme, pas un exemple de numéro réel. */
export const TEAM_PHONE_PLACEHOLDER = "+237 6XX XX XX XX"

/**
 * Vide vaut valide : le champ est facultatif des deux côtés du fil, et
 * `@IsOptional()` saute la validation quand rien n'est envoyé.
 */
export function isTeamPhoneValid(value: string): boolean {
  const trimmed = value.trim()
  return trimmed === "" || TEAM_PHONE_PATTERN.test(trimmed)
}

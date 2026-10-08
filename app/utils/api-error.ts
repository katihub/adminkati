const statusKeys: Record<number, string> = {
  400: "errors.badRequest",
  401: "errors.unauthorized",
  403: "errors.forbidden",
  404: "errors.notFound",
  409: "errors.conflict",
  413: "errors.tooLarge",
  429: "errors.tooManyRequests",
}

const reasonKeys: Record<string, string> = {
  deactivated: "errors.deactivated",
  invalid_credentials: "auth.login.errors.invalidCredentials",
  not_team: "auth.login.errors.notTeam",
}

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined
}

export function getErrorData(record: Record<string, unknown>): Record<string, unknown> {
  const rawData = asRecord(record.data)
  return asRecord(rawData?.data) ?? rawData ?? {}
}

export function getStatus(record: Record<string, unknown>): number {
  if (typeof record.statusCode === "number") return record.statusCode
  if (typeof record.status === "number") return record.status
  return 0
}

function getStatusHeadline(status: number): string {
  if (status === 0) return "errors.unreachable"
  return statusKeys[status] ?? (status >= 500 ? "errors.server" : "errors.unknown")
}

/**
 * LE MESSAGE DU BACKEND REMONTE QUAND C'EN EST UN, et l'ancienne règle disait
 * le contraire.
 *
 * Elle refusait `record.message` comme du « texte de développeur ». C'était
 * vrai d'un tableau `class-validator` (« motif must be a string »), et faux de
 * tout le reste : ce backend écrit ses refus en français, pour l'opérateur, et
 * ce sont les seules phrases qui disent QUOI FAIRE. « Désignez le livreur qui
 * emporte cette commande. » devenait « Nous n'avons pas pu traiter cette
 * demande. », et — pire — tout 409 devenait « Quelqu'un d'autre a modifié cet
 * élément avant vous », qui affirme une modification concurrente n'ayant pas
 * eu lieu et cache la vraie instruction.
 *
 * La distinction est le TYPE : une chaîne est une phrase rédigée, un tableau
 * est la sortie mécanique du validateur. La première s'affiche telle quelle
 * (`headline`), la seconde retombe sur la clé générique.
 */
export function toApiError(error: unknown): { status: number; headlineKey: string; headline?: string } {
  const record = asRecord(error) ?? {}
  const data = getErrorData(record)
  const status = getStatus(record)
  const reason = typeof data.reason === "string" ? data.reason : ""
  const headlineKey = reasonKeys[reason] ?? getStatusHeadline(status)
  const message = typeof data.message === "string" ? data.message.trim() : ""
  return { status, headlineKey, ...(message ? { headline: message } : {}) }
}

/** La phrase à montrer : celle du backend si elle existe, sinon la clé traduite. */
export function apiErrorText(error: unknown, t: (key: string) => string): string {
  const { headline, headlineKey } = toApiError(error)
  return headline ?? t(headlineKey)
}

import type { StatutDemandeAssistance } from "@/types/api/assistant"

/** Ordered as the request moves: the queue to work first, then what is done. */
export const ASSISTANT_REQUEST_STATUSES: readonly StatutDemandeAssistance[] = ["nouvelle", "repondue", "close"]

export const ASSISTANT_REQUEST_STATUS_TONE: Record<StatutDemandeAssistance, string> = {
  nouvelle: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  repondue: "bg-success/10 text-success",
  close: "bg-muted text-muted-foreground",
}

/** The backend's bounds on `POST …/reponse` — mirrored so the button says no before the server does. */
export const REPLY_MIN_LENGTH = 2
export const REPLY_MAX_LENGTH = 4000
export const FICHE_TITLE_MIN_LENGTH = 3
export const FICHE_TITLE_MAX_LENGTH = 200

export function parseAssistantRequestStatus(value: string | undefined): StatutDemandeAssistance {
  return ASSISTANT_REQUEST_STATUSES.includes(value as StatutDemandeAssistance)
    ? (value as StatutDemandeAssistance)
    : "nouvelle"
}

export function isReplyLengthValid(reply: string): boolean {
  const length = reply.trim().length
  return length >= REPLY_MIN_LENGTH && length <= REPLY_MAX_LENGTH
}

export function isFicheTitleValid(title: string): boolean {
  const length = title.trim().length
  return length >= FICHE_TITLE_MIN_LENGTH && length <= FICHE_TITLE_MAX_LENGTH
}

/**
 * A starting title for the fiche. The question is what the next visitor will
 * ask, so it is the natural title — cut to the backend's ceiling on a word
 * boundary where one exists, so the operator edits a phrase, not a stump.
 */
export function ficheTitleFromQuestion(question: string): string {
  const normalized = question.replace(/\s+/g, " ").trim()
  if (normalized.length <= FICHE_TITLE_MAX_LENGTH) return normalized
  const cut = normalized.slice(0, FICHE_TITLE_MAX_LENGTH - 1)
  const lastSpace = cut.lastIndexOf(" ")
  return `${(lastSpace > FICHE_TITLE_MIN_LENGTH ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

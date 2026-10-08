export interface BannerEditor {
  name: string
  email: string | null
}

/** What the backend writes when the caller is not a team member: not a person. */
const UNKNOWN_CALLER = "inconnu"

/**
 * The backend writes `modifiee_par` as "Name <email>" (`nom()` in `vitrine.controller.ts`).
 * This pulls out the name to show and the email, kept for the profile card.
 */
function editorIdentity(text: string): BannerEditor {
  const open = text.lastIndexOf("<")
  if (!text.endsWith(">") || open === -1) return { name: text, email: null }

  const email = text.slice(open + 1, -1).trim()
  return { name: text.slice(0, open).trim() || email, email }
}

export function parseEditor(value: string | null | undefined): BannerEditor | null {
  const text = (value ?? "").trim()
  if (!text || text === UNKNOWN_CALLER) return null

  return editorIdentity(text)
}

import { getInitials } from "./initials"

/** "jane.doe@x.com" -> "jane doe", so getInitials can split it the same way it splits a real name. */
function emailToNameLike(email: string): string {
  return email.split("@", 1)[0]!.replace(/[.+_-]+/g, " ")
}

/** Initials from an email's local part when present, else from a name, else null when neither is. */
export function initialsFromEmailOrName(
  email: string | null | undefined,
  name: string | null | undefined,
): string | null {
  if (email) return getInitials(emailToNameLike(email)) || null
  if (name) return getInitials(name) || null
  return null
}

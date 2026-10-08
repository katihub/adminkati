/** First letter of up to the first two words, uppercased — "Awa Ngo" → "AN". */
export function getInitials(name: string | null | undefined): string {
  return (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.slice(0, 1).toLocaleUpperCase())
    .join("")
}

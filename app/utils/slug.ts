const COMBINING_DIACRITICS_START = 0x0300
const COMBINING_DIACRITICS_END = 0x036f

/** `Écran` → `Ecran`: decomposes each accented letter and drops the combining mark. */
export function stripDiacritics(value: string): string {
  return Array.from(value.normalize("NFD"))
    .filter(char => {
      const code = char.codePointAt(0) ?? 0
      return code < COMBINING_DIACRITICS_START || code > COMBINING_DIACRITICS_END
    })
    .join("")
}

/** Lowercase, accent-stripped, hyphen-separated slug — safe to drop straight into a URL path. */
export function slugify(value: string): string {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

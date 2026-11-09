/**
 * REGISTERING A KATI COURIER FROM KATI EXPRESS (9 November 2026).
 * The direction or a focal point fills one form; the sponsor is optional.
 * The backend checks everything again: these helpers only guide the form.
 */
export interface CourierRegistration {
  nom: string
  dateNaissance: string
  lieuNaissance: string
  villeResidence: string
  quartierResidence: string
  courriel: string
  telephone: string
  parrainNom: string
  parrainLien: string
  parrainTelephone: string
  villeLivraison: string
  quartiersLivraison: string[]
  /** The vehicle's plate, optional. */
  immatriculation: string
}

export type CourierRegistrationError =
  | "name"
  | "birthDate"
  | "minor"
  | "birthPlace"
  | "residence"
  | "email"
  | "phone"
  | "sponsorPhone"
  | "plate"
  | "districts"

const PHONE = /^\+?[\d\s.-]{8,20}$/
const PLATE = /^[A-Z0-9][A-Z0-9 -]{1,18}[A-Z0-9]$/

/** A plate as the backend keeps it: upper case, single spaces. */
export function normalizePlate(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase()
}

export function emptyCourierRegistration(): CourierRegistration {
  return {
    nom: "",
    dateNaissance: "",
    lieuNaissance: "",
    villeResidence: "",
    quartierResidence: "",
    courriel: "",
    telephone: "",
    parrainNom: "",
    parrainLien: "",
    parrainTelephone: "",
    villeLivraison: "",
    quartiersLivraison: [],
    immatriculation: "",
  }
}

/** 18 years old on the given day. */
export function isAdult(birthDate: string, today = new Date()): boolean {
  const [year, month, day] = birthDate.split("-").map(Number)
  if (!year || !month || !day) return false
  const eighteenth = new Date(Date.UTC(year + 18, month - 1, day))
  return eighteenth.getTime() <= Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
}

/** The first problem of the form, or null when it can be sent. */
export function courierRegistrationError(
  form: CourierRegistration,
  today = new Date(),
): CourierRegistrationError | null {
  if (form.nom.trim().length < 3) return "name"
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.dateNaissance)) return "birthDate"
  if (!isAdult(form.dateNaissance, today)) return "minor"
  if (form.lieuNaissance.trim().length < 2) return "birthPlace"
  if (!form.villeResidence.trim() || form.quartierResidence.trim().length < 2) return "residence"
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.courriel.trim())) return "email"
  if (!PHONE.test(form.telephone.trim())) return "phone"
  if (form.parrainTelephone.trim() && !PHONE.test(form.parrainTelephone.trim())) return "sponsorPhone"
  if (form.immatriculation.trim() && !PLATE.test(normalizePlate(form.immatriculation))) return "plate"
  if (!form.villeLivraison || !form.quartiersLivraison.length) return "districts"
  return null
}

/** What the API receives: trimmed, the e-mail in lower case, empty sponsor fields left out. */
export function courierRegistrationBody(form: CourierRegistration) {
  const optional = (value: string) => value.trim() || undefined
  return {
    nom: form.nom.trim(),
    dateNaissance: form.dateNaissance,
    lieuNaissance: form.lieuNaissance.trim(),
    villeResidence: form.villeResidence.trim(),
    quartierResidence: form.quartierResidence.trim(),
    courriel: form.courriel.trim().toLowerCase(),
    telephone: form.telephone.trim(),
    parrainNom: optional(form.parrainNom),
    parrainLien: optional(form.parrainLien),
    parrainTelephone: optional(form.parrainTelephone),
    villeLivraison: form.villeLivraison,
    quartiersLivraison: [...form.quartiersLivraison],
    immatriculation: optional(normalizePlate(form.immatriculation)),
  }
}

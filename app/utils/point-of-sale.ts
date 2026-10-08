import type { PointVenteFormInput, PointVenteValues } from "../schemas/point-vente"
import type {
  CreerPointVenteInput,
  ModifierPointVenteInput,
  PointVenteAdmin,
  TelephonePointVente,
} from "@/types/api/vitrine"
import { includesIgnoringAccents } from "./search-text"

export type PointVenteContactField = "telephones" | "whatsapp" | "horaires" | "carte" | "coordonnees"

/**
 * What the storefront cannot show yet for this counter. The counters were migrated from a
 * hard-coded list without opening hours or map pins, so the list says what is left to fill
 * instead of letting an incomplete card pass for a finished one.
 */
function telephoneField(point: PointVenteAdmin): PointVenteContactField | null {
  return point.telephones.length === 0 ? "telephones" : null
}

function whatsappField(point: PointVenteAdmin): PointVenteContactField | null {
  return point.telephones.some(telephone => telephone.whatsapp) ? null : "whatsapp"
}

function optionalContactField(value: string | null, field: PointVenteContactField): PointVenteContactField | null {
  return value ? null : field
}

function coordinateField(point: PointVenteAdmin): PointVenteContactField | null {
  return point.latitude === null || point.longitude === null ? "coordonnees" : null
}

export function missingContactFields(point: PointVenteAdmin): PointVenteContactField[] {
  return [
    telephoneField(point),
    whatsappField(point),
    optionalContactField(point.horaires, "horaires"),
    optionalContactField(point.carte, "carte"),
    coordinateField(point),
  ].filter((field): field is PointVenteContactField => field !== null)
}

export interface PointVenteFilter {
  query: string
  status: "all" | "active" | "inactive"
  details: "all" | "complete" | "missing"
}

function matchesDetails(point: PointVenteAdmin, details: PointVenteFilter["details"]): boolean {
  if (details === "all") return true
  return missingContactFields(point).length > 0 === (details === "missing")
}

function matchesStatus(point: PointVenteAdmin, status: PointVenteFilter["status"]): boolean {
  if (status === "all") return true
  return point.active === (status === "active")
}

function matchesQuery(point: PointVenteAdmin, needle: string): boolean {
  if (!needle) return true
  return [point.libelle, point.ville, point.quartier, point.cle].some(field => includesIgnoringAccents(field, needle))
}

function matchesFilter(point: PointVenteAdmin, filter: PointVenteFilter, needle: string): boolean {
  if (!matchesStatus(point, filter.status)) return false
  if (!matchesDetails(point, filter.details)) return false
  return matchesQuery(point, needle)
}

export function filterPoints(
  points: readonly PointVenteAdmin[],
  { query, status, details }: PointVenteFilter,
): PointVenteAdmin[] {
  const needle = query.trim()
  const filter = { query, status, details }
  return points.filter(point => matchesFilter(point, filter, needle))
}

export const POINT_VENTE_SECTIONS = ["identity", "contact", "map"] as const
export type PointVenteSection = (typeof POINT_VENTE_SECTIONS)[number]

const SECTION_OF_FIELD: Readonly<Record<string, PointVenteSection>> = {
  cle: "identity",
  libelle: "identity",
  ville: "identity",
  quartier: "identity",
  repere: "identity",
  telephones: "contact",
  whatsapp: "contact",
  horaires: "contact",
  coordonnees: "map",
  carte: "map",
  latitude: "map",
  longitude: "map",
}

/** The section a refusal path such as `telephones.1` belongs to, or `null` for none. */
export function sectionOfPath(path: string): PointVenteSection | null {
  return SECTION_OF_FIELD[path.split(".")[0]!] ?? null
}

/** What the comptoir team pastes into a chat or reads over the phone, one fact per line. */
export function customerDetailsText(point: PointVenteAdmin): string {
  return [
    point.libelle,
    `${point.quartier}, ${point.ville}`,
    point.repere,
    point.telephones.map(telephone => telephone.numero).join(" / "),
    point.horaires ?? "",
  ]
    .filter(Boolean)
    .join("\n")
}

/** Google Maps, because that is the app a customer in Douala already has on their phone. */
export function mapLink(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
}

/**
 * The hosts a counter's map link may point to, and the folder each one requires. Mirrors
 * `HOTES_CARTE` (`src/vitrine/lien-carte.ts:23-32` in nowtech-backend). The link is published as is on the storefront and in the
 * assistant's answers, so the backend refuses any other host; the panel says so before saving.
 * A host dedicated to maps accepts any path (`null`); `google.com` and `goo.gl` serve much more
 * than maps and only pass under `/maps/`.
 */
const MAP_LINK_HOSTS: Readonly<Record<string, string | null>> = {
  "maps.app.goo.gl": null,
  "maps.google.com": null,
  "maps.google.cm": null,
  "www.google.com": "/maps/",
  "google.com": "/maps/",
  "www.google.cm": "/maps/",
  "google.cm": "/maps/",
  "goo.gl": "/maps/",
}

/** `@Length(12, 500)` on `carte` in the DTO. */
const MAP_LINK_LENGTH = { min: 12, max: 500 } as const

function parseUrl(value: string): URL | null {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

function hasValidMapLinkLength(value: string): boolean {
  return value.length >= MAP_LINK_LENGTH.min && value.length <= MAP_LINK_LENGTH.max
}

function parseMapLink(value: string): URL | null {
  if (/\s/.test(value)) return null
  if (!hasValidMapLinkLength(value)) return null
  return parseUrl(value)
}

function hasNoMapCredentials(url: URL): boolean {
  return !url.username && !url.password && !url.port
}

function isAllowedMapHost(url: URL): boolean {
  return Object.hasOwn(MAP_LINK_HOSTS, url.hostname)
}

function hasValidMapUrlBase(url: URL | null): url is URL {
  return url !== null && url.protocol === "https:" && hasNoMapCredentials(url) && isAllowedMapHost(url)
}

function shortLinkHasTarget(url: URL): boolean {
  if (url.pathname.length > 1) return true
  return url.hostname !== "maps.app.goo.gl" && url.search.length > 1
}

function pathHasTarget(url: URL, folder: string): boolean {
  return url.pathname.startsWith(folder) && url.pathname.length > folder.length
}

function hasMapTarget(url: URL): boolean {
  const folder = MAP_LINK_HOSTS[url.hostname]
  if (!folder) return shortLinkHasTarget(url)
  if (url.pathname === folder.slice(0, -1)) return url.search.length > 1
  return pathHasTarget(url, folder)
}

/**
 * The link as the backend will store it (`normaliserLienCarte`): trimmed, and a short link
 * stripped of the `?g_st=ic` tracking that the Google Maps "Share" button appends.
 */
export function normalizeMapLink(raw: string): string {
  const typed = raw.trim()
  const url = parseUrl(typed)
  if (url?.hostname !== "maps.app.goo.gl") return typed
  url.search = ""
  url.hash = ""
  return url.toString()
}

/** Same rule as `estLienCarte`: https, a listed host, and a path or query that opens a place. */
export function isMapLink(value: string): boolean {
  const url = parseMapLink(value)
  // `https://maps.google.com@example.cm/` looks like a map and leads elsewhere.
  if (!hasValidMapUrlBase(url)) return false
  // A short link's query is only tracking; on `maps.google.com`, `/?q=Akwa` does open a place.
  return hasMapTarget(url)
}

/**
 * "4.051056, 9.767868" — what Google Maps copies when you click a pin. Splitting it on paste
 * fills both halves at once, where a single field would receive a value it must refuse.
 *
 * A bare comma is not a separator: "4,051056" is one latitude typed with a French decimal
 * comma, and reading it as the pair (4, 51056) would silently move the pin.
 */
export function splitCoordinatePair(text: string): [string, string] | null {
  const parts = text
    .trim()
    .split(/;|,?\s+/)
    .filter(Boolean)
  return parts.length === 2 && parts.every(part => /^-?\d+(?:\.\d+)?$/.test(part)) ? [parts[0]!, parts[1]!] : null
}

/**
 * The whole list after moving the item at `index` one step, or `null` past either end. Used for
 * the counters and for a counter's numbers alike: both are saved as a complete ordered list.
 */
export function moveItem<T>(items: readonly T[], index: number, offset: -1 | 1): T[] | null {
  const to = index + offset
  if (!isItemPosition(items, index) || !isItemPosition(items, to)) return null
  const next = [...items]
  next.splice(to, 0, ...next.splice(index, 1))
  return next
}

function isItemPosition<T>(items: readonly T[], index: number): boolean {
  return index >= 0 && index < items.length
}

/**
 * The full id list after moving one entry by `offset` positions, or `null` at either end.
 * The backend takes the whole order at once (a partial list is refused), so a single step
 * still sends every id.
 */
export function moveId(ids: readonly number[], id: number, offset: -1 | 1): number[] | null {
  return moveItem(ids, ids.indexOf(id), offset)
}

export function sortByIds(points: readonly PointVenteAdmin[], ids: readonly number[]): PointVenteAdmin[] {
  const position = new Map(ids.map((id, index) => [id, index]))
  return [...points].sort((a, b) => (position.get(a.id) ?? Infinity) - (position.get(b.id) ?? Infinity))
}

/** A new number starts as WhatsApp: every number the shop publishes today answers on it. */
export function emptyTelephoneRow(): TelephonePointVente {
  return { numero: "", whatsapp: true }
}

/**
 * The key a new counter gets from its label: "Akwa Paris Dancing" gives "Akwa-Paris-Dancing",
 * the spelling the existing keys already use. The label, not the district, because two counters
 * in Akwa would otherwise both be offered the key "Akwa".
 */
export function cleFromLibelle(libelle: string, maxLength: number): string {
  return libelle.trim().replace(/\s+/g, "-").slice(0, maxLength)
}

export function toPointVenteForm(point: PointVenteAdmin | null): PointVenteFormInput {
  if (!point) return emptyPointVenteForm()

  const { cle, libelle, ville, quartier, repere, telephones, carte, horaires, latitude, longitude, active } = point
  return {
    cle,
    libelle,
    ville,
    quartier,
    repere,
    // A counter without a number still shows one empty row: that is where the first one goes.
    telephones: telephoneRows(telephones),
    carte: emptyText(carte),
    horaires: emptyText(horaires),
    latitude: coordinateText(latitude),
    longitude: coordinateText(longitude),
    active,
  }
}

function emptyPointVenteForm(): PointVenteFormInput {
  return {
    cle: "",
    libelle: "",
    ville: "",
    quartier: "",
    repere: "",
    telephones: [emptyTelephoneRow()],
    carte: "",
    horaires: "",
    latitude: "",
    longitude: "",
    active: true,
  }
}

function telephoneRows(telephones: readonly TelephonePointVente[]): TelephonePointVente[] {
  return telephones.length ? telephones.map(telephone => ({ ...telephone })) : [emptyTelephoneRow()]
}

function emptyText(value: string | null): string {
  return value ?? ""
}

function coordinateText(value: number | null): string {
  return value === null ? "" : String(value)
}

/** Blank optional fields are left out rather than sent as `null`: there is nothing to clear yet. */
export function buildCreerPointVente(values: PointVenteValues): CreerPointVenteInput {
  const { telephones, carte, horaires, latitude, longitude, ...required } = values
  return {
    ...required,
    ...telephonePayload(telephones),
    ...textPayload("carte", carte),
    ...textPayload("horaires", horaires),
    ...coordinatePayload(latitude, longitude),
  }
}

function telephonePayload(telephones: TelephonePointVente[]) {
  return telephones.length ? { telephones } : {}
}

function textPayload(field: "carte" | "horaires", value: string | null) {
  return value ? { [field]: value } : {}
}

function coordinatePayload(latitude: number | null, longitude: number | null) {
  return latitude !== null && longitude !== null ? { latitude, longitude } : {}
}

type PatchableField = "libelle" | "ville" | "quartier" | "repere" | "carte" | "horaires" | "active"
const PATCHABLE_FIELDS: readonly PatchableField[] = [
  "libelle",
  "ville",
  "quartier",
  "repere",
  "carte",
  "horaires",
  "active",
]

function sameTelephones(a: readonly TelephonePointVente[], b: readonly TelephonePointVente[]): boolean {
  return (
    a.length === b.length &&
    a.every((telephone, index) => telephone.numero === b[index]?.numero && telephone.whatsapp === b[index]?.whatsapp)
  )
}

/**
 * Only what changed — an empty `PATCH` is a 400 (« Aucun champ à modifier. »), so the form
 * never sends one. `cle` is never part of it: the backend has no way to rename a key that
 * orders already store.
 *
 * `telephones` travels whole, because the backend replaces the list instead of merging it.
 * The coordinates travel as a pair even when one half changed: the DTO validates both as soon
 * as either is present, so a lone `latitude` would be refused.
 */
export function buildModifierPointVente(values: PointVenteValues, original: PointVenteAdmin): ModifierPointVenteInput {
  const patch = changedFields(values, original)
  if (!sameTelephones(values.telephones, original.telephones)) patch.telephones = values.telephones
  addChangedCoordinates(patch, values, original)
  return patch as ModifierPointVenteInput
}

function changedFields(values: PointVenteValues, original: PointVenteAdmin): Record<string, unknown> {
  return Object.fromEntries(
    PATCHABLE_FIELDS.filter(field => values[field] !== original[field]).map(field => [field, values[field]]),
  )
}

function addChangedCoordinates(patch: Record<string, unknown>, values: PointVenteValues, original: PointVenteAdmin) {
  if (values.latitude === original.latitude && values.longitude === original.longitude) return
  patch.latitude = values.latitude
  patch.longitude = values.longitude
}

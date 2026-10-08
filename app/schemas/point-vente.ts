import { z } from "zod/v4"
import { isMapLink, normalizeMapLink } from "../utils/point-of-sale"
import { cameroonPhone } from "../utils/whatsapp"

/**
 * The backend's `@Length(min, max)` for each text field. Exported because the refusal quotes
 * them: "too short" alone left the operator guessing how long a landmark has to be.
 * `cle` is capped at 40 like the `varchar(40)` `comptoir` columns of profiles, addresses and
 * orders that store it.
 */
export const POINT_VENTE_LENGTHS = {
  cle: { min: 1, max: 40 },
  libelle: { min: 2, max: 80 },
  ville: { min: 2, max: 60 },
  quartier: { min: 2, max: 80 },
  repere: { min: 4, max: 240 },
  horaires: { min: 2, max: 200 },
} as const

type LengthField = keyof typeof POINT_VENTE_LENGTHS

const LENGTH_ERROR = "pointsOfSale.form.errors.length"

/** Blank passes: `requiredText` refuses it on its own terms, and `optionalText` publishes nothing. */
function withinLength(field: LengthField) {
  const { min, max } = POINT_VENTE_LENGTHS[field]
  return (value: string) => value === "" || (value.length >= min && value.length <= max)
}

/** An empty field says "required" alone rather than also quoting the lengths. */
function requiredText(field: LengthField) {
  return z.string().trim().min(1, { error: "validation.required" }).refine(withinLength(field), { error: LENGTH_ERROR })
}

/** Blank means "not published": it is sent as `null`, which is how the backend clears a field. */
function optionalText(field: LengthField) {
  return z
    .string()
    .trim()
    .refine(withinLength(field), { error: LENGTH_ERROR })
    .transform(value => value || null)
}

/**
 * `NUMEROS_PAR_COMPTOIR` (`src/vitrine/vitrine.dto.ts:212`). The form stops offering a new row
 * there, so the schema never meets a seventh.
 */
export const POINT_VENTE_TELEPHONES_MAX = 6

function invalidPhoneMessage(saved: string | null): string | null {
  if (!saved) return "pointsOfSale.form.errors.telephone"
  return null
}

function invalidWhatsappMessage(row: { numero: string; whatsapp: boolean }): string | null {
  return row.whatsapp && !cameroonPhone(row.numero, "mobile") ? "pointsOfSale.form.errors.whatsapp" : null
}

function phoneMessage(
  row: { numero: string; whatsapp: boolean },
  saved: string | null,
  seen: ReadonlySet<string>,
): string | null {
  const formatMessage = invalidPhoneMessage(saved)
  if (formatMessage) return formatMessage
  const whatsappMessage = invalidWhatsappMessage(row)
  if (whatsappMessage) return whatsappMessage
  return seen.has(saved!) ? "pointsOfSale.form.errors.duplicateTelephone" : null
}

function addTelephoneIssue(ctx: z.RefinementCtx, index: number, message: string | null) {
  if (message) ctx.addIssue({ code: "custom", path: [index], message })
}

function validateTelephoneRow(
  row: { numero: string; whatsapp: boolean },
  index: number,
  seen: Set<string>,
  ctx: z.RefinementCtx,
) {
  if (!row.numero.trim()) return
  const saved = cameroonPhone(row.numero, "any")
  const message = phoneMessage(row, saved, seen)
  if (saved) seen.add(saved)
  addTelephoneIssue(ctx, index, message)
}

/**
 * The ordered list of numbers, read from the form's rows. An empty row is dropped rather than
 * refused — it is the row the form offers for a next number. Each refusal lands on its row
 * (`telephones.1`), which is what the operator has to fix, and the saved list carries the
 * `+237 XXX XX XX XX` form the backend stores.
 */
const telephones = z
  .array(z.object({ numero: z.string(), whatsapp: z.boolean() }))
  .superRefine((rows, ctx) => {
    const seen = new Set<string>()
    rows.forEach((row, index) => validateTelephoneRow(row, index, seen, ctx))
  })
  .transform(rows =>
    rows.flatMap(row => {
      const numero = cameroonPhone(row.numero, "any")
      return numero ? [{ numero, whatsapp: row.whatsapp }] : []
    }),
  )

/** Blank means no link; anything else must be a Google Maps link the backend will publish. */
const carte = z
  .string()
  .transform(normalizeMapLink)
  .refine(value => value === "" || isMapLink(value), { error: "pointsOfSale.form.errors.carte" })
  .transform(value => value || null)

/**
 * Accepts the decimal comma a French keyboard produces: "4,0511" is the same degree as
 * "4.0511", and refusing it would read as the coordinate being wrong.
 */
function coordinate(bound: number) {
  return z
    .string()
    .trim()
    .transform(value => (value === "" ? null : Number(value.replace(",", "."))))
    .refine(value => value === null || (Number.isFinite(value) && Math.abs(value) <= bound), {
      error: "pointsOfSale.form.errors.coordinate",
    })
}

/**
 * Mirrors `CreerPointVenteDto` / `ModifierPointVenteDto` (`src/vitrine/vitrine.dto.ts:191-517` in
 * nowtech-backend), read from the form's strings. One schema for create and edit: in edit mode
 * the form carries the existing `cle`, which is valid by construction and never sent.
 */
const identityFields = {
  cle: requiredText("cle"),
  libelle: requiredText("libelle"),
  ville: requiredText("ville"),
  quartier: requiredText("quartier"),
  repere: requiredText("repere"),
}

const contactInfoFields = {
  telephones,
  carte,
  horaires: optionalText("horaires"),
  latitude: coordinate(90),
  longitude: coordinate(180),
}

function coordinatePairPath(value: { latitude: number | null; longitude: number | null }) {
  if ((value.latitude === null) === (value.longitude === null)) return null
  return value.latitude === null ? "latitude" : "longitude"
}

/** Identity is validated before an operator can continue to contact information. */
export const pointVenteIdentitySchema = z.object(identityFields)

/** Contact values stay optional, except that supplied values must be publishable together. */
export const pointVenteContactInfoSchema = z.object(contactInfoFields).superRefine((value, ctx) => {
  const path = coordinatePairPath(value)
  if (!path) return
  ctx.addIssue({ code: "custom", path: [path], message: "pointsOfSale.form.errors.coordinatesPair" })
})

export const pointVenteSchema = z
  .object({
    ...identityFields,
    ...contactInfoFields,
    active: z.boolean(),
  })
  .superRefine((value, ctx) => {
    // Half a coordinate places the pin on a whole parallel, and the backend refuses it for that reason.
    const path = coordinatePairPath(value)
    if (!path) return
    ctx.addIssue({ code: "custom", path: [path], message: "pointsOfSale.form.errors.coordinatesPair" })
  })

export type PointVenteFormInput = z.input<typeof pointVenteSchema>
export type PointVenteValues = z.output<typeof pointVenteSchema>

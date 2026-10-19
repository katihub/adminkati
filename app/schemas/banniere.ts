import type { EmplacementBanniere } from "../types/api/vitrine"
import { z } from "zod/v4"

/**
 * Internal path only, per `CHEMIN_INTERNE` (`vitrine.dto.ts:41`) — `//example.com` and
 *  `https://…` are open-redirect vectors and are rejected before the request ever leaves the
 *  browser.
 */
const HREF_PATTERN = /^\/(?!\/)[\w\-/?=&.%]*$/

export const BANNIERE_ALT_MIN_LENGTH = 10
export const BANNIERE_ALT_MAX_LENGTH = 400

/**
 * Exported standalone so `BannerHrefPicker`'s custom-path input (a later phase) can
 * validate one raw string inline, before it ever joins the object `BannerForm` submits.
 */
export const hrefSchema = z
  .string()
  .trim()
  .min(1, { error: "validation.required" })
  .max(300, { error: "validation.tooLong" })
  .regex(HREF_PATTERN, { error: "validation.invalidInternalPath" })

const focusSchema = z
  .number({ error: "validation.required" })
  .int({ error: "validation.outOfRange" })
  .min(0, { error: "validation.outOfRange" })
  .max(100, { error: "validation.outOfRange" })
  .optional()

/**
 * The placements, in the order the home page's opening row shows them. Mirrors `EMPLACEMENTS`
 * (`vitrine.dto.ts:65`), which also refuses `null`.
 */
export const BANNIERE_EMPLACEMENTS = [
  "principal",
  "promo",
  "pub_accueil",
] as const satisfies readonly EmplacementBanniere[]

/** Mirrors `CreerBanniereDto` / `ModifierBanniereDto` (`vitrine.dto.ts:84-147` in nowtech-backend) — one schema for both create and edit. */
export const banniereSchema = z.object({
  emplacement: z.enum(BANNIERE_EMPLACEMENTS, { error: "validation.required" }),
  href: hrefSchema,
  libelle: z.string().trim().min(1, { error: "validation.required" }).max(80, { error: "validation.tooLong" }),
  description: z.string().trim().max(180, { error: "validation.tooLong" }).optional(),
  action: z
    .string()
    .trim()
    .min(1, { error: "validation.required" })
    .max(40, { error: "validation.tooLong" })
    .optional(),
  tonalite: z.enum(["navy", "light", "orange"]).optional(),
  alt: z
    .string()
    .trim()
    .min(1, { error: "validation.required" })
    .min(BANNIERE_ALT_MIN_LENGTH, { error: "validation.tooShort" })
    .max(BANNIERE_ALT_MAX_LENGTH, { error: "validation.tooLong" }),
  focus: focusSchema,
  active: z.boolean().optional(),
})

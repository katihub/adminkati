import { z } from "zod/v4"

export const DELAI_MAX_VALEUR = 999

export const DELAI_UNITES = ["minutes", "heures", "jours_ouvres", "jours", "semaines", "mois"] as const

const valeurSchema = z
  .number({ error: "validation.required" })
  .int({ error: "validation.outOfRange" })
  .min(1, { error: "validation.outOfRange" })
  .max(DELAI_MAX_VALEUR, { error: "validation.outOfRange" })

const uniteSchema = z.enum(DELAI_UNITES, { error: "validation.required" })

interface Bounds {
  min_valeur?: number
  max_valeur?: number | null
}

function maxBelowMin({ min_valeur, max_valeur }: Bounds) {
  return typeof min_valeur === "number" && typeof max_valeur === "number" && max_valeur < min_valeur
}

const maxAboveMin = {
  message: "validation.outOfRange",
  path: ["max_valeur"],
}

export const delaiLivraisonSchema = z
  .object({
    min_valeur: valeurSchema,
    max_valeur: valeurSchema.nullable().optional(),
    unite: uniteSchema,
  })
  .refine(value => !maxBelowMin(value), maxAboveMin)

export const delaiLivraisonPatchSchema = z
  .object({
    min_valeur: valeurSchema.optional(),
    max_valeur: valeurSchema.nullable().optional(),
    unite: uniteSchema.optional(),
    actif: z.boolean().optional(),
  })
  .refine(value => !maxBelowMin(value), maxAboveMin)

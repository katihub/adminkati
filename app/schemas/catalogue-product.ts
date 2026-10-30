import { z } from "zod"

const optionalText = (min: number, max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine(value => !value || value.length >= min)
export const catalogueProductDraftSchema = z.object({
  nom: z.string().trim().min(2).max(240),
  marque: optionalText(1, 120),
  categorieId: z.string().uuid(),
  description: optionalText(2, 10000),
  descriptionCourte: optionalText(10, 300),
  ficheTechnique: optionalText(2, 20000),
  slug: z.string().trim(),
  motif: z.string().trim().max(300),
})
export const catalogueOfferDraftSchema = z
  .object({
    prixFcfa: z.coerce.number().int().min(1).max(2000000000),
    prixReferenceFcfa: z.union([z.literal(""), z.coerce.number().int().min(1).max(2000000000)]),
    quantiteMinimale: z.coerce.number().int().min(1).max(9999),
    garantieMois: z.coerce.number().int().min(0).max(120),
    delaiMaxJours: z.coerce.number().int().min(0).max(3),
    motif: z.string().trim().min(5).max(300),
  })
  .refine(value => value.prixReferenceFcfa === "" || value.prixReferenceFcfa >= value.prixFcfa)

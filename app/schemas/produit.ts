import { z } from "zod/v4"

const PRIX_MAX = 1_000_000_000

export const DESCRIPTION_MAX_LENGTH = 500
export const FICHE_TECHNIQUE_MAX_LENGTH = 20_000
const STOCK_INITIAL_MAX = 2_000_000_000

const prixSchema = z
  .number({ error: "validation.required" })
  .int({ error: "validation.outOfRange" })
  .min(0, { error: "validation.outOfRange" })
  .max(PRIX_MAX, { error: "validation.outOfRange" })

const prixOptionnelSchema = prixSchema.nullable().optional()

/**
 * Exported so `ImageGallery` can validate one `{url, alt}` entry inline, before it ever
 *  joins the array `DetailForm` submits — one URL check, not a second copy of it.
 */
export const imageSchema = z.object({
  url: z.url({ error: "validation.invalidUrl" }),
  alt: z.string().trim().max(300, { error: "validation.tooLong" }).optional(),
})

/**
 * Shared by the add and the edit form (R5: same layout, add just starts empty) —
 * `CreerProduitDto` requires `nom`/`prix`; every other field is optional or
 * nullable here for the same reason `ModifierProduitDto` treats them as a partial patch.
 * Stock is deliberately absent: it is written only through the inventory endpoints.
 */
const produitShape = {
  nom: z.string().trim().min(1, { error: "validation.required" }).max(300, { error: "validation.tooLong" }),
  prix: prixSchema,
  prix_reference: prixOptionnelSchema,
  remise_pct: z
    .number({ error: "validation.required" })
    .int({ error: "validation.outOfRange" })
    .min(0, { error: "validation.outOfRange" })
    .max(100, { error: "validation.outOfRange" })
    .nullable()
    .optional(),
  // Le backend attend de l'ISO-8601 (`@IsISO8601`) ou null. Le champ de
  // saisie rend « 2026-09-30 » ; la conversion se fait dans le formulaire,
  // parce qu'une date sans heure n'est pas la même instant selon le fuseau.
  promo_debut: z.string().trim().min(1).nullable().optional(),
  promo_fin: z.string().trim().min(1).nullable().optional(),
  marque: z.string().trim().max(120, { error: "validation.tooLong" }).nullable().optional(),
  categorie_principale_id: z.number().int().positive().nullable().optional(),
  categories_ids: z.array(z.number().int().positive()).max(20, { error: "validation.tooLarge" }).optional(),
  url_source: z.string().trim().max(1000, { error: "validation.tooLong" }).nullable().optional(),
  caracteristiques: z
    .array(z.string().trim().min(1, { error: "validation.required" }))
    .max(12, { error: "validation.tooLarge" })
    .optional(),
  description: z.string().trim().max(DESCRIPTION_MAX_LENGTH, { error: "validation.tooLong" }).nullable().optional(),
  fiche_technique: z
    .string()
    .trim()
    .max(FICHE_TECHNIQUE_MAX_LENGTH, { error: "validation.tooLong" })
    .nullable()
    .optional(),
  delai_livraison_id: z.number().int().positive().nullable().optional(),
  images: z.array(imageSchema).max(20, { error: "validation.tooLarge" }).optional(),
  slug: z.string().trim().max(200, { error: "validation.tooLong" }).optional(),
}

/** Strict so a stray `en_stock` or a create-only field on an update fails loudly instead of being dropped. */
export const produitUpdateSchema = z.strictObject(produitShape)

export const produitCreateSchema = z.strictObject({
  ...produitShape,
  quantite_stock_initiale: z
    .number({ error: "validation.required" })
    .int({ error: "validation.outOfRange" })
    .min(0, { error: "validation.outOfRange" })
    .max(STOCK_INITIAL_MAX, { error: "validation.outOfRange" })
    .optional(),
  /** Creates the product with a status and no count; the form sends it only for Out of stock. */
  disponibilite_forcee: z.enum(["en_stock", "rupture"]).optional(),
})

export type ProduitCreateInput = z.infer<typeof produitCreateSchema>
export type ProduitUpdateInput = z.infer<typeof produitUpdateSchema>

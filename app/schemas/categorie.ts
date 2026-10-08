import { z } from "zod/v4"

const categoryNameSchema = z
  .string()
  .trim()
  .min(1, { error: "validation.required" })
  .max(200, { error: "validation.tooLong" })

const departmentIdSchema = z
  .string()
  .trim()
  .min(1, { error: "validation.required" })
  .max(60, { error: "validation.tooLong" })

/** Mirrors `src/catalogue/administration.dto.ts:176-205` in NowTech-backend-. */
export const categorieSchema = z
  .object({
    nom: categoryNameSchema,
    slug: categoryNameSchema,
    parent_id: z.number().int().positive().nullable(),
    rayon_id: departmentIdSchema.nullish(),
  })
  .superRefine((category, context) => {
    if (category.parent_id === null && !category.rayon_id) {
      context.addIssue({
        code: "custom",
        path: ["rayon_id"],
        message: "validation.required",
      })
    }

    if (category.parent_id !== null && category.rayon_id !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["rayon_id"],
        message: "validation.invalidCategoryDepartment",
      })
    }
  })

export type CategorieInput = z.infer<typeof categorieSchema>

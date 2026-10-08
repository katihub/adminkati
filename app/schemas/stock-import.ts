import { z } from "zod/v4"

export const stockImportSetupSchema = z.object({
  mode: z.enum(["reception", "count"]),
  motif: z.string().trim().min(1, { error: "validation.required" }).max(200, { error: "validation.tooLong" }),
})

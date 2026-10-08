import { z } from "zod/v4"

const MOTIF_MAX_LENGTH = 200

export const ajustementStockSchema = z
  .object({
    type: z.enum(["reception", "correction"]),
    variation: z
      .number({ error: "validation.required" })
      .int({ error: "validation.outOfRange" })
      .refine(value => value !== 0, { error: "validation.outOfRange" }),
    motif: z
      .string()
      .trim()
      .min(1, { error: "validation.required" })
      .max(MOTIF_MAX_LENGTH, { error: "validation.tooLong" }),
  })
  .refine(input => input.type !== "reception" || input.variation > 0, {
    path: ["variation"],
    error: "validation.outOfRange",
  })

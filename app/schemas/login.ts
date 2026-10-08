import { z } from "zod/v4"

/**
 * Messages are i18n **keys**, not prose: `nuxt-zod-i18n` localises the root
 * (v3) `zod` registry, which is a different module instance from `zod/v4`, so
 * its messages can never reach this schema. The form layer translates them.
 *
 * GOTCHA: presence, never policy. Enforcing the signup password rule here
 * would leak that rule to an unauthenticated caller and reject legacy
 * passwords before the server ever sees them.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, { error: "validation.required" })
    .max(254, { error: "validation.tooLong" })
    .pipe(z.email({ error: "validation.email" })),
  password: z.string().min(1, { error: "validation.required" }).max(200, { error: "validation.tooLong" }),
})

export type LoginInput = z.infer<typeof loginSchema>

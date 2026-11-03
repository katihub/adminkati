import { defineEventHandler, getRequestURL, readBody, setResponseStatus } from "h3"
import { z } from "zod/v4"
import { createAuthClient } from "../../utils/supabase"

/**
 * « MOT DE PASSE OUBLIÉ » : Supabase envoie le lien qui ouvre la page « Choisir mon mot de passe ».
 * The answer is the same whether the address exists or not, so the form never reveals who has an account.
 */
const schema = z.object({ email: z.string().trim().toLowerCase().max(254).pipe(z.email()) })

export default defineEventHandler(async event => {
  const parsed = schema.safeParse(await readBody(event).catch(() => null))
  if (!parsed.success) {
    setResponseStatus(event, 400)
    return { reason: "invalid_input" }
  }
  const redirectTo = `${getRequestURL(event).origin}/fr/choisir-mot-de-passe`
  try {
    await createAuthClient().auth.resetPasswordForEmail(parsed.data.email, { redirectTo })
  } catch {
    // Same neutral answer: a failure must not tell an attacker the address exists.
  }
  return { ok: true }
})

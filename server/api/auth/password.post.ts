import { defineEventHandler, readBody, setResponseStatus } from "h3"
import { z } from "zod/v4"
import { passwordFailure } from "../../utils/password"

/**
 * « CHOISIR MON MOT DE PASSE » : the token comes from the Supabase link (invitation or reset), the
 * password from the form. Never log this body: it carries both.
 */
const schema = z.object({
  accessToken: z.string().min(20).max(4000),
  password: z.string().min(8).max(200),
})

export default defineEventHandler(async event => {
  const parsed = schema.safeParse(await readBody(event).catch(() => null))
  if (!parsed.success) {
    setResponseStatus(event, 400)
    return { reason: "invalid_input" }
  }
  const config = useRuntimeConfig()
  try {
    await $fetch(`${config.supabaseUrl}/auth/v1/user`, {
      method: "PUT",
      headers: { apikey: config.supabaseAnonKey, authorization: `Bearer ${parsed.data.accessToken}` },
      body: { password: parsed.data.password },
    })
    return { ok: true }
  } catch (error: any) {
    const failure = passwordFailure(error?.response?.status)
    setResponseStatus(event, failure.statusCode)
    return { reason: failure.reason }
  }
})

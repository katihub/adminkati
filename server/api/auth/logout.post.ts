import { defineEventHandler, setResponseStatus } from "h3"
import { endSession, readSession } from "../../utils/session"
import { revoke } from "../../utils/supabase"

export default defineEventHandler(async event => {
  const session = await readSession(event)
  try {
    if (session) await revoke(session.accessToken, session.refreshToken)
  } finally {
    endSession(event)
  }
  setResponseStatus(event, 204)
})

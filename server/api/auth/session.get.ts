import { defineEventHandler, send } from "h3"
import { readSession, toPublicSession } from "../../utils/session"

export default defineEventHandler(async event => {
  const session = await readSession(event)
  if (!session) return send(event, "null", "application/json")
  return toPublicSession(session)
})

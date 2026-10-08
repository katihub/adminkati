import { defineEventHandler } from "h3"
import { readSession } from "../utils/session"

export default defineEventHandler(async event => {
  event.context.session = (await readSession(event)) ?? undefined
})

import type { SessionData } from "@/types/session"
import type { H3Event } from "h3"
import { withRefreshLock } from "./refresh-lock"
import { endSession, readSession, writeSession } from "./session"
import { refresh } from "./supabase"

export async function ensureFreshSession(event: H3Event): Promise<SessionData | null> {
  const session = await readSession(event)
  if (!session) return null
  if (session.expiresAt - Math.floor(Date.now() / 1000) >= 60) return session
  try {
    const tokens = await withRefreshLock(session.user.userId, () => refresh(session.refreshToken))
    const fresh = { ...session, ...tokens }
    await writeSession(event, fresh)
    return fresh
  } catch {
    endSession(event)
    return null
  }
}

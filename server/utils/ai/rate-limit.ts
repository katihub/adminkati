export type AcquireResult =
  | { ok: true; release: () => void }
  | { ok: false; reason: "busy" }
  | { ok: false; reason: "quota_exceeded"; retryAfterSeconds: number }

export interface GenerationLimiter {
  acquire: (userId: string) => AcquireResult
}

export interface GenerationLimiterOptions {
  limit: number
  windowMs?: number
  now?: () => number
}

const ONE_HOUR_MS = 3_600_000

interface UserWindow {
  startedAt: number
  used: number
  /** The token of the acquire holding the lock; a stale release carries an older token and changes nothing. */
  lock: symbol | null
}

/**
 * A fixed window per user plus a single in-flight lock. Process-local on purpose: this holds only while one Node
 * process serves the panel, and the shared-storage replacement belongs behind this same interface.
 */
export function createGenerationLimiter(options: GenerationLimiterOptions): GenerationLimiter {
  const windowMs = options.windowMs ?? ONE_HOUR_MS
  const now = options.now ?? Date.now
  const windows = new Map<string, UserWindow>()

  function windowFor(userId: string, at: number): UserWindow {
    const existing = windows.get(userId)
    if (existing && at - existing.startedAt < windowMs) return existing
    const fresh: UserWindow = { startedAt: at, used: 0, lock: existing?.lock ?? null }
    windows.set(userId, fresh)
    return fresh
  }

  return {
    acquire(userId) {
      const at = now()
      const window = windowFor(userId, at)
      if (window.lock) return { ok: false, reason: "busy" }
      if (window.used >= options.limit) {
        const remainingMs = window.startedAt + windowMs - at
        return { ok: false, reason: "quota_exceeded", retryAfterSeconds: Math.max(1, Math.ceil(remainingMs / 1000)) }
      }

      const token = Symbol("generation")
      window.used += 1
      window.lock = token
      return {
        ok: true,
        release() {
          const current = windows.get(userId)
          if (current?.lock === token) current.lock = null
        },
      }
    },
  }
}

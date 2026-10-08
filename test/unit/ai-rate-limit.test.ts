import { describe, expect, it } from "vitest"
import { createGenerationLimiter } from "../../server/utils/ai/rate-limit"

describe("createGenerationLimiter", () => {
  it("allows exactly `limit` acquires within the window, then refuses with quota_exceeded", () => {
    let now = 0
    const limiter = createGenerationLimiter({ limit: 2, windowMs: 1_000, now: () => now })

    const first = limiter.acquire("u1")
    expect(first.ok).toBe(true)
    if (first.ok) first.release()

    const second = limiter.acquire("u1")
    expect(second.ok).toBe(true)
    if (second.ok) second.release()

    const third = limiter.acquire("u1")
    expect(third.ok).toBe(false)
    expect(third).toMatchObject({ ok: false, reason: "quota_exceeded" })
  })

  it("computes retryAfterSeconds as the ceiling of the remaining window", () => {
    let now = 0
    const limiter = createGenerationLimiter({ limit: 1, windowMs: 10_000, now: () => now })

    const first = limiter.acquire("u1")
    if (first.ok) first.release()

    now = 3_500
    const refused = limiter.acquire("u1")

    expect(refused).toEqual({ ok: false, reason: "quota_exceeded", retryAfterSeconds: 7 })
  })

  it("retryAfterSeconds is never below 1 even a millisecond before the window closes", () => {
    let now = 0
    const limiter = createGenerationLimiter({ limit: 1, windowMs: 1_000, now: () => now })

    const first = limiter.acquire("u1")
    if (first.ok) first.release()

    now = 999
    const refused = limiter.acquire("u1")

    expect(refused).toMatchObject({ ok: false, reason: "quota_exceeded", retryAfterSeconds: 1 })
  })

  it("refuses a second concurrent acquire for the same user as busy without consuming quota", () => {
    let now = 0
    const limiter = createGenerationLimiter({ limit: 3, windowMs: 10_000, now: () => now })

    const first = limiter.acquire("u1")
    expect(first.ok).toBe(true)

    expect(limiter.acquire("u1")).toEqual({ ok: false, reason: "busy" })
    expect(limiter.acquire("u1")).toEqual({ ok: false, reason: "busy" })

    if (first.ok) first.release()

    // Only the first acquire used a unit, so two of the three remain. Had a "busy" refusal used one, a single unit would.
    for (let remaining = 0; remaining < 2; remaining++) {
      const next = limiter.acquire("u1")
      expect(next.ok).toBe(true)
      if (next.ok) next.release()
    }
    expect(limiter.acquire("u1")).toMatchObject({ ok: false, reason: "quota_exceeded" })
  })

  it("reports busy rather than quota_exceeded when both conditions could apply", () => {
    let now = 0
    const limiter = createGenerationLimiter({ limit: 1, windowMs: 10_000, now: () => now })

    const first = limiter.acquire("u1")
    expect(first.ok).toBe(true)

    const second = limiter.acquire("u1")
    expect(second).toEqual({ ok: false, reason: "busy" })
  })

  it("release is idempotent and a stale release does not free a later acquire's lock", () => {
    let now = 0
    const limiter = createGenerationLimiter({ limit: 5, windowMs: 10_000, now: () => now })

    const first = limiter.acquire("u1")
    expect(first.ok).toBe(true)
    if (first.ok) first.release()

    const second = limiter.acquire("u1")
    expect(second.ok).toBe(true)

    if (first.ok) first.release()
    if (first.ok) first.release()

    const third = limiter.acquire("u1")
    expect(third).toEqual({ ok: false, reason: "busy" })
  })

  it("gives each user an independent allowance and an independent lock", () => {
    let now = 0
    const limiter = createGenerationLimiter({ limit: 1, windowMs: 10_000, now: () => now })

    const u1First = limiter.acquire("u1")
    expect(u1First.ok).toBe(true)

    const u2First = limiter.acquire("u2")
    expect(u2First.ok).toBe(true)

    const u1Second = limiter.acquire("u1")
    expect(u1Second).toEqual({ ok: false, reason: "busy" })
  })

  it("resets a user's allowance once the window has fully elapsed", () => {
    let now = 0
    const limiter = createGenerationLimiter({ limit: 1, windowMs: 1_000, now: () => now })

    const first = limiter.acquire("u1")
    if (first.ok) first.release()

    const refused = limiter.acquire("u1")
    expect(refused.ok).toBe(false)

    now = 1_000
    const afterWindow = limiter.acquire("u1")
    expect(afterWindow.ok).toBe(true)
  })

  it("supports the default 50-per-hour scenario: 50 succeed, the 51st is refused with the exact retry hint", () => {
    let now = 0
    const limiter = createGenerationLimiter({ limit: 50, now: () => now })

    for (let i = 0; i < 50; i++) {
      now = i * 1_000
      const result = limiter.acquire("u1")
      expect(result.ok).toBe(true)
      if (result.ok) result.release()
    }

    now = 50_000
    const refused = limiter.acquire("u1")
    const expectedRetryAfterSeconds = Math.ceil((3_600_000 - 50_000) / 1_000)

    expect(refused).toEqual({ ok: false, reason: "quota_exceeded", retryAfterSeconds: expectedRetryAfterSeconds })
  })
})

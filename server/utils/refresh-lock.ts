const inFlight = new Map<string, Promise<unknown>>()

// GOTCHA: process-local. Correct only while the deployment is a single Node process (Coolify,
// node-server preset, no replicas). A second replica gives each process its own Map, both refresh
// at once, Supabase's rotation invalidates one of them, and the user is logged out with nothing
// failing loudly to explain why. Moving to replicas means moving this to shared storage.
export function withRefreshLock<T>(userId: string, run: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(userId) as Promise<T> | undefined
  if (existing) return existing

  const current = run().finally(() => inFlight.delete(userId))
  inFlight.set(userId, current)
  return current
}

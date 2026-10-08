/**
 * Headers for a request the panel makes to the backend on behalf of a signed-in operator.
 *
 * `sharedSecret` identifies this server to the backend's rate limiter. Without it, every
 * operator shared one quota keyed on this server's address (127.0.0.1 locally, a few Vercel
 * IPs in production), and opening a single product fired enough parallel requests to trip it:
 * 20 simultaneous calls came back as 9 successes and 11 × 429, surfacing as "the cost history
 * is unavailable" and as filters that seemed to do nothing. This proxy only runs with a valid
 * operator session, so those calls are already authenticated and role-checked by the backend.
 *
 * No visitor address is declared here on purpose: the backend skips its quota for a trusted
 * server that declares none, and counts the declared address otherwise. Sign-in does not go
 * through this proxy, so password attempts stay rate-limited exactly as before.
 */
export function buildProxyHeaders(
  inbound: Record<string, string | undefined>,
  accessToken: string,
  clientIp?: string,
  sharedSecret?: string,
): Record<string, string> {
  const headers: Record<string, string> = { authorization: `Bearer ${accessToken}` }
  // `x-nom-fichier` carries the datasheet's original filename: the object is
  // stored under a UUID, but the visitor who downloads it should receive
  // `APC-BV1000I.pdf`. Dropping the header here made the backend fall back to
  // `fiche-technique.pdf` for every upload, with nothing to explain why.
  for (const key of ["content-type", "cle-idempotence", "user-agent", "x-nom-fichier"] as const) {
    if (inbound[key]) headers[key] = inbound[key]
  }
  if (clientIp) headers["x-forwarded-for"] = clientIp
  if (sharedSecret) headers["x-secret-service"] = sharedSecret
  return headers
}

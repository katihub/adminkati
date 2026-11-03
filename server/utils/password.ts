/** What a refused password update means for the person on the page: an expired link or a refused password. */
export function passwordFailure(status: number | undefined): {
  statusCode: 400 | 401
  reason: "expired_link" | "rejected"
} {
  return status === 401 || status === 403
    ? { statusCode: 401, reason: "expired_link" }
    : { statusCode: 400, reason: "rejected" }
}

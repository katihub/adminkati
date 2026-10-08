import { ProductCopyError, maskSecrets } from "./errors"

/**
 * One line per failed generation, in the server log, so a generic message in the panel can be traced to its cause.
 * Known refusals carry their reason and OpenAI's sanitised explanation; anything else is logged with its error
 * name, message and first stack lines, with key-shaped strings and URLs masked. No product text is included.
 */
export function logProductCopyFailure(requestId: string, actorId: string, error: unknown): void {
  const record =
    error instanceof ProductCopyError
      ? {
          event: "ai.product_copy_failure",
          requestId,
          actorId,
          reason: error.reason,
          statusCode: error.statusCode,
          ...(error.retryAfterSeconds !== undefined && { retryAfterSeconds: error.retryAfterSeconds }),
          ...(error.incompleteReason && { incompleteReason: error.incompleteReason }),
          ...(error.providerDetail && { providerDetail: error.providerDetail }),
        }
      : {
          event: "ai.product_copy_failure",
          requestId,
          actorId,
          reason: "unexpected",
          errorName: error instanceof Error ? error.name : typeof error,
          message: maskSecrets(error instanceof Error ? error.message : String(error)).slice(0, 500),
          stack: maskSecrets(error instanceof Error ? (error.stack ?? "") : "")
            .split("\n")
            .slice(0, 8)
            .join("\n"),
        }
  try {
    console.error(JSON.stringify(record))
  } catch {
    // Logging a failure must never become a second failure.
  }
}

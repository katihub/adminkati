import type { AppError, Err, ErrorCode, Ok, Result } from "../types/result"

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value })

export const err = (code: ErrorCode, message: string, cause?: unknown): Err<AppError> => ({
  ok: false,
  error: { code, message, cause },
})

export async function attempt<T>(fn: () => Promise<T> | T, fail: (cause: unknown) => AppError): Promise<Result<T>> {
  try {
    return ok(await fn())
  } catch (cause) {
    return { ok: false, error: fail(cause) }
  }
}

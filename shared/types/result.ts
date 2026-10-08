export interface Ok<T> {
  ok: true
  value: T
}

export interface Err<E> {
  ok: false
  error: E
}

export type Result<T, E = AppError> = Ok<T> | Err<E>

export type ErrorCode =
  | "validation"
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "external"
  | "internal"

export interface AppError {
  code: ErrorCode
  /** A translation code such as `order.not_found`, safe to show once translated. */
  message: string
  /** The original error, for logs only. Never sent to the client. */
  cause?: unknown
}

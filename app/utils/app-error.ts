import type { AppError, ErrorCode } from "#shared/types/result"
import { asRecord, getErrorData, getStatus } from "./api-error"

const messageByCode: Record<ErrorCode, string> = {
  validation: "errors.badRequest",
  unauthenticated: "errors.unauthorized",
  forbidden: "errors.forbidden",
  not_found: "errors.notFound",
  conflict: "errors.conflict",
  external: "errors.server",
  internal: "errors.server",
}

const codeByStatus: Record<number, ErrorCode> = {
  400: "validation",
  401: "unauthenticated",
  403: "forbidden",
  404: "not_found",
  409: "conflict",
}

function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === "string" && Object.hasOwn(messageByCode, value)
}

export function toAppError(cause: unknown): AppError {
  const record = asRecord(cause) ?? {}
  const { code } = getErrorData(record)
  const sentMessage = asRecord(record.data)?.statusMessage

  if (isErrorCode(code)) {
    return { code, message: typeof sentMessage === "string" ? sentMessage : messageByCode[code], cause }
  }
  // Proxied backend errors carry no code and French prose, so the status decides and the prose is dropped.
  const fallback = codeByStatus[getStatus(record)] ?? "internal"
  return { code: fallback, message: messageByCode[fallback], cause }
}

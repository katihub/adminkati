import {
  createError,
  defineEventHandler,
  getMethod,
  getRequestHeader,
  getRequestHeaders,
  getRequestIP,
  getRequestURL,
  getRouterParam,
  readRawBody,
  sendProxy,
} from "h3"
import { ensureFreshSession } from "../../utils/api-session"
import { buildProxyHeaders } from "../../utils/proxy-headers"
import { buildProxyTarget } from "../../utils/proxy-target"

const MAX_RAW_API_BODY_BYTES = 5_000_000
// Banner creation sends two artworks in one multipart request; the backend's
// own per-file ceiling is 15 MB. Keep the JSON/raw-image path at 5 MB and
// widen only multipart bodies — see nuxt.config.ts's matching upload key.
const MAX_MULTIPART_API_BODY_BYTES = 16_000_000
// A manufacturer's datasheet is a raw `application/pdf` body, not multipart, so
// it took the 5 MB path and was refused at 413 while the backend accepts 25 —
// the largest real sheet in this catalogue (an Andeli regulator manual) is
// 22.6 MB. Its own ceiling matches the backend's, one byte below the limiter's.
const MAX_PDF_API_BODY_BYTES = 26_214_400

export default defineEventHandler(async event => {
  const session = await ensureFreshSession(event)
  if (!session) throw createError({ statusCode: 401, statusMessage: "Authentication required" })
  const config = useRuntimeConfig()
  const path = getRouterParam(event, "path") ?? ""
  // The router param excludes the query string, which carries every list filter and page number.
  const target = buildProxyTarget(config.apiBaseUrl, path, getRequestURL(event).search)
  const headers = buildProxyHeaders(
    getRequestHeaders(event),
    session.accessToken,
    getRequestIP(event, { xForwardedFor: true }),
    config.backendSharedSecret,
  )
  const body = ["GET", "HEAD"].includes(getMethod(event)) ? undefined : await readRawBody(event, false)
  const contentType = getRequestHeader(event, "content-type") ?? ""
  const isMultipart = contentType.startsWith("multipart/form-data")
  const isPdf = contentType.startsWith("application/pdf")
  const maxBodyBytes = isMultipart
    ? MAX_MULTIPART_API_BODY_BYTES
    : isPdf
      ? MAX_PDF_API_BODY_BYTES
      : MAX_RAW_API_BODY_BYTES
  if (body && body.byteLength > maxBodyBytes) throw createError({ statusCode: 413, statusMessage: "Payload Too Large" })
  return sendProxy(event, target, {
    fetchOptions: { method: getMethod(event), headers, body: body as unknown as BodyInit | undefined },
  })
})

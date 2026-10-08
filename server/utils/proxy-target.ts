/** `search` is the raw query string including its leading `?`, or empty. */
export function buildProxyTarget(baseUrl: string, path: string, search = ""): string {
  return `${baseUrl}/v1/${path}${search}`
}

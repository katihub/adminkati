import { describe, expect, it } from "vitest"
import { buildProxyHeaders } from "../../server/utils/proxy-headers"

describe("buildProxyHeaders", () => {
  it("forwards only the allowlisted request metadata", () => {
    const headers = buildProxyHeaders(
      {
        cookie: "nt-session=secret",
        authorization: "Bearer attacker",
        "content-type": "application/json",
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "browser",
        "cle-idempotence": "abc",
        "x-untrusted": "drop",
      },
      "fresh-token",
      "203.0.113.4",
    )

    expect(headers).toEqual({
      authorization: "Bearer fresh-token",
      "content-type": "application/json",
      "cle-idempotence": "abc",
      "x-forwarded-for": "203.0.113.4",
      "user-agent": "browser",
    })
  })
})

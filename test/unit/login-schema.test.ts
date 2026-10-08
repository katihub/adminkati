import { describe, expect, it } from "vitest"
import { loginSchema } from "../../app/schemas/login"

function messagesFor(input: unknown, field: string) {
  const result = loginSchema.safeParse(input)

  return (result.error?.issues ?? []).filter(issue => issue.path[0] === field).map(issue => issue.message)
}

describe("loginSchema", () => {
  it("accepts a valid credential pair and normalizes the email to trimmed lowercase", () => {
    const result = loginSchema.safeParse({
      email: "  Ada@Example.COM ",
      password: "correct horse battery staple",
    })

    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      email: "ada@example.com",
      password: "correct horse battery staple",
    })
  })

  it("reports a missing email as the required key rather than translated prose", () => {
    expect(messagesFor({ email: "", password: "secret" }, "email")[0]).toBe("validation.required")
  })

  it("reports a malformed email as the email key", () => {
    expect(messagesFor({ email: "ada-at-example", password: "secret" }, "email")).toContain("validation.email")
  })

  it("reports a missing password as the required key", () => {
    expect(messagesFor({ email: "ada@example.com", password: "" }, "password")[0]).toBe("validation.required")
  })

  it("rejects an email past the RFC 5321 ceiling so unbounded input cannot reach an auth call", () => {
    const email = `${"a".repeat(288)}@example.com`

    expect(email).toHaveLength(300)
    expect(messagesFor({ email, password: "secret" }, "email")).toContain("validation.tooLong")
  })

  it("rejects a password past the length bound so unbounded input cannot reach an auth call", () => {
    const password = "b".repeat(500)

    expect(messagesFor({ email: "ada@example.com", password }, "password")).toContain("validation.tooLong")
  })

  it("accepts a short password, because signing in checks presence and never password policy", () => {
    const result = loginSchema.safeParse({ email: "ada@example.com", password: "a" })

    expect(result.success).toBe(true)
  })
})

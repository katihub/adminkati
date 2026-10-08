import { describe, expect, it } from "vitest"
import {
  FICHE_TITLE_MAX_LENGTH,
  ficheTitleFromQuestion,
  isFicheTitleValid,
  isReplyLengthValid,
  parseAssistantRequestStatus,
} from "../../app/utils/assistant-requests"

describe("assistant request status from the URL", () => {
  it("accepts the three contract statuses and falls back to the new-request queue", () => {
    expect(parseAssistantRequestStatus("repondue")).toBe("repondue")
    expect(parseAssistantRequestStatus("close")).toBe("close")
    expect(parseAssistantRequestStatus(undefined)).toBe("nouvelle")
    expect(parseAssistantRequestStatus("toutes")).toBe("nouvelle")
  })
})

describe("reply and fiche bounds", () => {
  it("measures the reply as it will be sent, trimmed, within 2 to 4000 characters", () => {
    expect(isReplyLengthValid(" a ")).toBe(false)
    expect(isReplyLengthValid("ok")).toBe(true)
    expect(isReplyLengthValid("x".repeat(4000))).toBe(true)
    expect(isReplyLengthValid("x".repeat(4001))).toBe(false)
  })

  it("requires a fiche title of 3 to 200 characters", () => {
    expect(isFicheTitleValid("  ab ")).toBe(false)
    expect(isFicheTitleValid("abc")).toBe(true)
    expect(isFicheTitleValid("x".repeat(201))).toBe(false)
  })
})

describe("fiche title from the question", () => {
  it("keeps a short question whole, with its whitespace collapsed", () => {
    expect(ficheTitleFromQuestion("  Livrez-vous\n à   Bafoussam ? ")).toBe("Livrez-vous à Bafoussam ?")
  })

  it("cuts a long question on a word boundary and stays within the backend's ceiling", () => {
    const question = `${"mot ".repeat(80)}fin`
    const title = ficheTitleFromQuestion(question)

    expect(title.length).toBeLessThanOrEqual(FICHE_TITLE_MAX_LENGTH)
    expect(title.endsWith("mot…")).toBe(true)
    expect(isFicheTitleValid(title)).toBe(true)
  })

  it("still cuts a question with no space to break on", () => {
    const title = ficheTitleFromQuestion("x".repeat(500))

    expect(title).toHaveLength(FICHE_TITLE_MAX_LENGTH)
  })
})

import { afterEach, describe, expect, it, vi } from "vitest"
import { readStoredValue, writeStoredValue } from "../../app/utils/local-storage"

function memoryStorage() {
  const entries = new Map<string, string>()
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => void entries.set(key, value),
  }
}

/** Safari in private mode, and any browser with site data blocked. */
function hostileStorage() {
  return {
    get getItem() {
      throw new Error("SecurityError")
    },
    get setItem() {
      throw new Error("SecurityError")
    },
  }
}

afterEach(() => vi.unstubAllGlobals())

describe("reading a stored value", () => {
  it("returns what storage holds when storage works", () => {
    vi.stubGlobal("localStorage", memoryStorage())
    writeStoredValue("NT-LANG", "fr")

    expect(readStoredValue("NT-LANG")).toBe("fr")
  })

  it("returns null when the global is absent instead of throwing", () => {
    vi.stubGlobal("localStorage", undefined)

    expect(readStoredValue("NT-LANG")).toBeNull()
  })

  it("returns null when reaching storage throws", () => {
    vi.stubGlobal("localStorage", hostileStorage())

    expect(readStoredValue("NT-LANG")).toBeNull()
  })
})

describe("writing a stored value", () => {
  it("stays silent when the global is absent", () => {
    vi.stubGlobal("localStorage", undefined)

    expect(() => writeStoredValue("NT-LANG", "fr")).not.toThrow()
  })

  it("stays silent when the write is refused", () => {
    vi.stubGlobal("localStorage", hostileStorage())

    expect(() => writeStoredValue("NT-LANG", "fr")).not.toThrow()
  })
})

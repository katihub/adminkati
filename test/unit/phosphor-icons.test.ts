import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, resolve } from "node:path"
import { describe, expect, it } from "vitest"

const ROOT = resolve(__dirname, "../..")
const ICON_SET = JSON.parse(readFileSync(join(ROOT, "node_modules/@iconify-json/ph/icons.json"), "utf8")) as {
  icons: Record<string, unknown>
  aliases?: Record<string, unknown>
}
const KNOWN = new Set([...Object.keys(ICON_SET.icons), ...Object.keys(ICON_SET.aliases ?? {})])

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return entry === "ui" ? [] : sourceFiles(path)
    return /\.(?:vue|ts)$/.test(entry) ? [path] : []
  })
}

describe("phosphor icons", () => {
  it("every icon the app names exists in the installed set, so none renders as an empty box", () => {
    const missing: string[] = []
    for (const file of sourceFiles(join(ROOT, "app"))) {
      const source = readFileSync(file, "utf8")
      for (const match of source.matchAll(/["'`]ph:([a-z0-9-]+)["'`]/g)) {
        if (!KNOWN.has(match[1]!)) missing.push(`ph:${match[1]} in ${file.replace(`${ROOT}/`, "")}`)
      }
    }

    expect(missing).toEqual([])
  })
})

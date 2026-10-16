import { readFileSync, readdirSync } from "node:fs"
import { dirname, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { brand } from "../../brand.config"

const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
const themePath = resolve(rootDirectory, "app/assets/css/main.css")
const theme = readFileSync(themePath, "utf8")
const nuxtConfig = readFileSync(resolve(rootDirectory, "nuxt.config.ts"), "utf8")

const brandedTokens = ["primary", "success", "sidebar-primary", "stat-slab"]
const chartTokens = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"]

function declarationsFor(token: string) {
  return Array.from(theme.matchAll(new RegExp(`--${token}:\\s*([^;]+);`, "g")), match => match[1]?.trim() ?? "")
}

function oklchHue(value: string) {
  const match = /oklch\([^\s]+\s+[^\s]+\s+([\d.]+)/.exec(value)
  return match ? Number(match[1]) : null
}

describe("KatiHub admin palette", () => {
  it("centralizes the official navy and orange brand colors", () => {
    expect(brand.colors).toEqual({ navy: "#08265c", orange: "#ff7900" })
    expect(theme).toContain("var(--brand-navy)")
    expect(theme).toContain("var(--brand-orange)")
  })

  it("injects the CSS brand primitives from the central contract", () => {
    expect(nuxtConfig).toContain("--brand-navy")
    expect(nuxtConfig).toContain("brand.colors.navy")
    expect(nuxtConfig).toContain("--brand-orange")
    expect(nuxtConfig).toContain("brand.colors.orange")
  })

  it.each([...brandedTokens, ...chartTokens])("keeps the %s token out of the green and teal hue range", token => {
    const declarations = declarationsFor(token)
    expect(declarations, `${token} must exist in both light and dark themes`).toHaveLength(2)

    for (const declaration of declarations) {
      expect(declaration).not.toMatch(/(?:emerald|green|teal)/i)
      const hue = oklchHue(declaration)
      expect(hue === null || hue < 120 || hue > 200).toBe(true)
    }
  })

  it("uses the brand colors through semantic shell tokens", () => {
    expect(declarationsFor("primary")).toEqual(["var(--brand-orange)", "var(--brand-orange)"])
    expect(declarationsFor("sidebar-primary")).toEqual(["var(--brand-orange)", "var(--brand-orange)"])
    expect(declarationsFor("stat-slab")).toEqual(["var(--brand-navy)", "var(--brand-navy)"])
  })

  it("removes visible emerald and teal utility colors in favor of semantic tokens", () => {
    const appDirectory = resolve(rootDirectory, "app")
    const filesWithRawGreenUtilities = readdirSync(appDirectory, { recursive: true })
      .map(path => path.toString().replaceAll("\\", "/"))
      .filter(path => /\.(?:ts|vue)$/.test(path))
      .filter(path => !path.startsWith("components/ui/") && !path.startsWith("components/vuzeno/"))
      .map(path => resolve(appDirectory, path))
      .filter(path => /(?:emerald|teal)-\d+/i.test(readFileSync(path, "utf8")))
      .map(path => relative(rootDirectory, path))

    expect(filesWithRawGreenUtilities).toEqual([])
  })
})

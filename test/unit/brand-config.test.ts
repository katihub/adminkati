import { existsSync, readFileSync, readdirSync } from "node:fs"
import { dirname, relative, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { describe, expect, it } from "vitest"

const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../..")

describe("KatiHub brand contract", () => {
  it("centralizes the platform, admin, assistant, wordmark, logo and storefront values", async () => {
    const configPath = resolve(rootDirectory, "brand.config.ts")
    expect(existsSync(configPath), "brand.config.ts must be the single source of brand values").toBe(true)

    const { brand } = await import(/* @vite-ignore */ pathToFileURL(configPath).href)

    expect(brand).toMatchObject({
      name: "KatiHub",
      adminName: "KatiHub Admin",
      assistantName: "KatiHub AI",
      wordmark: {
        leading: "KATI",
        accent: "HUB",
      },
      logoPath: "/katihub-logo-official.png",
      storefrontUrl: "",
      colors: {
        navy: "#08265c",
        orange: "#ff7900",
      },
    })
  })

  it("keeps generic UI translations free of the former NowTech identity", () => {
    const localesDirectory = resolve(rootDirectory, "i18n/locales")
    const filesWithFormerBrand = readdirSync(localesDirectory, { recursive: true })
      .filter(path => path.toString().endsWith(".json"))
      .map(path => resolve(localesDirectory, path.toString()))
      .filter(path => /now\s*tech/i.test(readFileSync(path, "utf8")))
      .map(path => relative(rootDirectory, path))

    expect(filesWithFormerBrand).toEqual([])
  })
})

import { mkdir, mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { checkTranslations } from "../../scripts/check-translations.mjs"

async function writeJson(path: string, value: unknown) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`)
}

async function createWorkspace() {
  const root = await mkdtemp(join(tmpdir(), "nt-i18n-"))

  const localeRoot = join(root, "i18n", "locales")
  const sourceRoot = join(root, "app")

  await mkdir(join(localeRoot, "common"), { recursive: true })
  await mkdir(sourceRoot, { recursive: true })

  return { localeRoot, root, sourceRoot }
}

describe("checkTranslations", () => {
  it("passes when locale domains contain the same keys and UI text uses translations", async () => {
    const { localeRoot, root, sourceRoot } = await createWorkspace()

    await writeJson(join(localeRoot, "common", "en.json"), {
      language: {
        english: "English",
        french: "French",
      },
    })
    await writeJson(join(localeRoot, "common", "fr.json"), {
      language: {
        english: "Anglais",
        french: "Francais",
      },
    })
    await writeFile(join(sourceRoot, "Clean.vue"), '<template>{{ $t("common.language.english") }}</template>\n')

    const result = await checkTranslations({ root })

    expect(result.ok).toBe(true)
    expect(result.issues).toEqual([])
  })

  it("reports missing locale keys with the domain and locale", async () => {
    const { localeRoot, root } = await createWorkspace()

    await writeJson(join(localeRoot, "common", "en.json"), {
      language: {
        english: "English",
        french: "French",
      },
    })
    await writeJson(join(localeRoot, "common", "fr.json"), {
      language: {
        english: "Anglais",
      },
    })

    const result = await checkTranslations({ root })

    expect(result.ok).toBe(false)
    expect(result.issues).toContainEqual({
      file: "i18n/locales/common/fr.json",
      message: "Missing key common.language.french",
      type: "missing-key",
    })
  })

  it("reports raw English UI strings outside i18n blocks", async () => {
    const { localeRoot, root, sourceRoot } = await createWorkspace()

    await writeJson(join(localeRoot, "common", "en.json"), { title: "Dashboard" })
    await writeJson(join(localeRoot, "common", "fr.json"), { title: "Tableau de bord" })
    await writeFile(join(sourceRoot, "Raw.vue"), "<template><button>Save changes</button></template>\n")

    const result = await checkTranslations({ root })

    expect(result.ok).toBe(false)
    expect(result.issues).toContainEqual({
      file: "app/Raw.vue",
      line: 1,
      message: 'Raw UI string "Save changes"',
      type: "raw-string",
    })
  })

  it("reports raw strings in interpolations and bound text attributes", async () => {
    const { localeRoot, root, sourceRoot } = await createWorkspace()

    await writeJson(join(localeRoot, "common", "en.json"), { title: "Dashboard" })
    await writeJson(join(localeRoot, "common", "fr.json"), { title: "Tableau de bord" })
    await writeFile(
      join(sourceRoot, "Bound.vue"),
      '<template><span>{{ "Save changes" }}</span><input :placeholder="\'Search orders\'" /></template>\n',
    )

    const result = await checkTranslations({ root })

    expect(result.ok).toBe(false)
    expect(result.issues).toContainEqual({
      file: "app/Bound.vue",
      line: 1,
      message: 'Raw UI string "Save changes"',
      type: "raw-string",
    })
    expect(result.issues).toContainEqual({
      file: "app/Bound.vue",
      line: 1,
      message: 'Raw UI string "Search orders"',
      type: "raw-string",
    })
  })

  it("reports missing keys between locales in inline i18n blocks", async () => {
    const { localeRoot, root, sourceRoot } = await createWorkspace()

    await writeJson(join(localeRoot, "common", "en.json"), { title: "Dashboard" })
    await writeJson(join(localeRoot, "common", "fr.json"), { title: "Tableau de bord" })
    await writeFile(
      join(sourceRoot, "Inline.vue"),
      '<template>{{ $t("title") }}</template><i18n lang="json">{"en":{"title":"Dashboard","description":"Admin dashboard"},"fr":{"title":"Tableau de bord"}}</i18n>\n',
    )

    const result = await checkTranslations({ root })

    expect(result.ok).toBe(false)
    expect(result.issues).toContainEqual({
      file: "app/Inline.vue",
      line: 1,
      message: "Missing inline i18n key fr.description",
      type: "missing-inline-key",
    })
  })
})

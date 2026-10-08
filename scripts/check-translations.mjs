import { readdir, readFile } from "node:fs/promises"
import { relative, resolve } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { NodeTypes, parse as parseDom } from "@vue/compiler-dom"
import { parse as parseSfc } from "@vue/compiler-sfc"
import ts from "typescript"

const defaultLocales = ["en", "fr"]
const defaultSourceDirs = ["app"]
const localeRootPath = "i18n/locales"
const ignoredSourceParts = [
  "app/components/ui",
  // Installed Vuzeno (Ark UI-based) shadcn-vue-compatible components — vendored,
  // same reasoning as app/components/ui above (see .oxlintrc.json, .fallowrc.jsonc).
  "app/components/vuzeno",
]
const textLikeAttributes = new Set(["alt", "aria-label", "label", "placeholder", "title"])
const ignoredTextTags = new Set(["code", "pre", "script", "style"])

export async function checkTranslations(options = {}) {
  const root = resolve(options.root ?? process.cwd())
  const localeRoot = resolve(root, options.localeRoot ?? localeRootPath)
  const sourceDirs = options.sourceDirs ?? defaultSourceDirs
  const locales = options.locales ?? defaultLocales
  const issues = [
    ...(await findLocaleIssues({ localeRoot, locales, root })),
    ...(await findSourceIssues({ root, sourceDirs })),
  ]

  return {
    ok: issues.length === 0,
    issues,
  }
}

async function findLocaleIssues({ localeRoot, locales, root }) {
  const domains = await listDirectories(localeRoot)
  const domainIssues = await Promise.all(
    domains.map(domain =>
      findDomainLocaleIssues({
        domain,
        localeRoot,
        locales,
        root,
      }),
    ),
  )

  return domainIssues.flat()
}

async function findDomainLocaleIssues({ domain, localeRoot, locales, root }) {
  const { issues, localeFiles } = await readDomainLocaleFiles({
    domain,
    localeRoot,
    locales,
    root,
  })

  return [...issues, ...findMissingLocaleKeyIssues({ domain, localeFiles })]
}

async function readDomainLocaleFiles({ domain, localeRoot, locales, root }) {
  const issues = []
  const localeFiles = new Map()

  for (const locale of locales) {
    const filePath = resolve(localeRoot, domain, `${locale}.json`)
    const file = toRelative(root, filePath)
    const content = await readJson(filePath)

    if (!content) {
      issues.push({
        type: "missing-file",
        file,
        message: `Missing locale file ${domain}/${locale}.json`,
      })
      continue
    }

    localeFiles.set(locale, {
      file,
      keys: flattenKeys(content),
    })
  }

  return { issues, localeFiles }
}

function findMissingLocaleKeyIssues({ domain, localeFiles }) {
  const issues = []
  const expectedKeys = new Set([...localeFiles.values()].flatMap(({ keys }) => keys))

  for (const { file, keys } of localeFiles.values()) {
    const keySet = new Set(keys)

    for (const key of expectedKeys) {
      if (!keySet.has(key)) {
        issues.push({
          type: "missing-key",
          file,
          message: `Missing key ${domain}.${key}`,
        })
      }
    }
  }

  return issues
}

async function findSourceIssues({ root, sourceDirs }) {
  const files = await listSourceFiles(root, sourceDirs)
  const issues = []

  for (const filePath of files) {
    const source = await readFile(filePath, "utf8")
    const file = toRelative(root, filePath)

    if (file.endsWith(".vue")) issues.push(...findVueIssues({ file, source }))

    issues.push(...findToastIssues({ file, source }))
  }

  return issues
}

function findVueIssues({ file, source }) {
  const { descriptor } = parseSfc(source, { filename: file })
  const template = descriptor.template?.content
  const issues = findInlineI18nIssues({ file, customBlocks: descriptor.customBlocks })

  if (!template) return issues

  const ast = parseDom(template, { comments: false })

  walkTemplate(ast, [], (node, ancestors) => {
    issues.push(...findTemplateNodeIssues({ ancestors, file, node }))
  })

  return issues
}

function findTemplateNodeIssues({ ancestors, file, node }) {
  if (ancestors.some(ancestor => ignoredTextTags.has(ancestor))) return []

  return [
    ...findTemplateTextIssues({ file, node }),
    ...findTemplateInterpolationIssues({ file, node }),
    ...findTemplateAttributeIssues({ file, node }),
  ]
}

function findTemplateTextIssues({ file, node }) {
  if (node.type !== NodeTypes.TEXT || !hasRawEnglish(node.content)) return []

  return [createRawStringIssue({ file, line: node.loc.start.line, value: node.content })]
}

function findTemplateInterpolationIssues({ file, node }) {
  if (node.type !== NodeTypes.INTERPOLATION) return []

  return findRawExpressionIssues({
    expression: node.content.content,
    file,
    line: node.loc.start.line,
  })
}

function findTemplateAttributeIssues({ file, node }) {
  if (node.type !== NodeTypes.ELEMENT) return []

  return node.props.flatMap(prop => findTemplatePropIssues({ file, prop }))
}

function findTemplatePropIssues({ file, prop }) {
  if (prop.type === NodeTypes.ATTRIBUTE) return findStaticAttributeIssues({ file, prop })

  if (isTextBinding(prop)) {
    return findRawExpressionIssues({
      expression: prop.exp.content,
      file,
      line: prop.loc.start.line,
    })
  }

  return []
}

function findStaticAttributeIssues({ file, prop }) {
  if (!prop.value || !textLikeAttributes.has(prop.name) || !hasRawEnglish(prop.value.content)) return []

  return [createRawStringIssue({ file, line: prop.loc.start.line, value: prop.value.content })]
}

function isTextBinding(prop) {
  return (
    prop.type === NodeTypes.DIRECTIVE &&
    prop.name === "bind" &&
    prop.arg?.type === NodeTypes.SIMPLE_EXPRESSION &&
    prop.arg.isStatic &&
    textLikeAttributes.has(prop.arg.content) &&
    prop.exp?.type === NodeTypes.SIMPLE_EXPRESSION
  )
}

function findInlineI18nIssues({ file, customBlocks }) {
  const i18nBlocks = customBlocks.filter(isI18nBlock)

  return i18nBlocks.flatMap(block => findInlineBlockIssues({ block, file }))
}

function isI18nBlock(block) {
  return block.type === "i18n"
}

function findInlineBlockIssues({ block, file }) {
  const messages = readInlineMessages(block.content)

  if (!messages) return []

  const localeFiles = new Map(
    Object.entries(messages).map(([locale, value]) => [
      locale,
      {
        file,
        keys: flattenKeys(value),
      },
    ]),
  )
  const expectedKeys = new Set([...localeFiles.values()].flatMap(({ keys }) => keys))

  return [...localeFiles.entries()].flatMap(([locale, { keys }]) =>
    findMissingInlineKeys({
      file,
      keys,
      line: block.loc.start.line,
      locale,
      expectedKeys,
    }),
  )
}

function findMissingInlineKeys({ file, keys, line, locale, expectedKeys }) {
  const keySet = new Set(keys)

  return [...expectedKeys]
    .filter(key => !keySet.has(key))
    .map(key => ({
      type: "missing-inline-key",
      file,
      line,
      message: `Missing inline i18n key ${locale}.${key}`,
    }))
}

function readInlineMessages(content) {
  try {
    const messages = JSON.parse(content)

    return isRecord(messages) ? messages : null
  } catch {
    return null
  }
}

function findRawExpressionIssues({ expression, file, line }) {
  const sourceFile = ts.createSourceFile(
    "template-expression.ts",
    expression,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const issues = []

  function visit(node, insideTranslationCall = false) {
    if (ts.isStringLiteralLike(node)) {
      if (!insideTranslationCall && hasRawEnglish(node.text)) {
        issues.push({
          type: "raw-string",
          file,
          line,
          message: `Raw UI string "${cleanText(node.text)}"`,
        })
      }

      return
    }

    if (ts.isCallExpression(node) && isTranslationCall(node.expression)) {
      for (const argument of node.arguments) visit(argument, true)
      return
    }

    ts.forEachChild(node, child => visit(child, insideTranslationCall))
  }

  visit(sourceFile)
  return issues
}

function isTranslationCall(expression) {
  if (ts.isIdentifier(expression)) return expression.text === "t" || expression.text === "$t"

  return ts.isPropertyAccessExpression(expression) && (expression.name.text === "t" || expression.name.text === "$t")
}

function findToastIssues({ file, source }) {
  const issues = []
  const toastPattern = /\btoast(?:\.\w+)?\(\s*["'`]([^"'`$]+)["'`]/g

  for (const match of source.matchAll(toastPattern)) {
    const value = match[1]

    if (!hasRawEnglish(value)) continue

    issues.push({
      type: "raw-string",
      file,
      line: lineNumberForIndex(source, match.index ?? 0),
      message: `Raw UI string "${cleanText(value)}"`,
    })
  }

  return issues
}

function walkTemplate(node, ancestors, visit) {
  visit(node, ancestors)

  if (!("children" in node)) return

  const nextAncestors = node.type === NodeTypes.ELEMENT ? [...ancestors, node.tag] : ancestors

  for (const child of node.children) walkTemplate(child, nextAncestors, visit)
}

async function listSourceFiles(root, sourceDirs) {
  const files = []

  for (const sourceDir of sourceDirs) files.push(...(await listFiles(resolve(root, sourceDir))))

  return files.filter(file => {
    const relativePath = toRelative(root, file)

    return (
      [".vue", ".ts", ".js", ".mjs"].some(extension => file.endsWith(extension)) &&
      !ignoredSourceParts.some(part => relativePath.startsWith(part))
    )
  })
}

async function listFiles(path) {
  const entries = await readdir(path, { withFileTypes: true }).catch(() => [])
  const files = []

  for (const entry of entries) {
    const nextPath = resolve(path, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await listFiles(nextPath)))
      continue
    }

    if (entry.isFile()) files.push(nextPath)
  }

  return files
}

async function listDirectories(path) {
  const entries = await readdir(path, { withFileTypes: true }).catch(() => [])

  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort()
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"))
  } catch {
    return null
  }
}

function flattenKeys(value, prefix = "") {
  if (!isRecord(value)) return [prefix]

  return Object.entries(value).flatMap(([key, nestedValue]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key

    return flattenKeys(nestedValue, nextPrefix)
  })
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function hasRawEnglish(value) {
  const text = cleanText(value)

  if (/^\d+(?:\.\d+)?(?:px|em|rem|%)$/.test(text)) return false

  return /[A-Z]/i.test(text) && /[A-Z]{2,}/i.test(text) && !/^\{\{.*\}\}$/.test(text)
}

function createRawStringIssue({ file, line, value }) {
  return {
    type: "raw-string",
    file,
    line,
    message: `Raw UI string "${cleanText(value)}"`,
  }
}

function cleanText(value) {
  return value.replace(/\s+/g, " ").trim()
}

function lineNumberForIndex(source, index) {
  return source.slice(0, index).split("\n").length
}

function toRelative(root, path) {
  return relative(root, path).replaceAll("\\", "/")
}

function printIssues(issues) {
  for (const issue of issues) {
    const location = issue.line ? `${issue.file}:${issue.line}` : issue.file
    console.error(`${location} ${issue.message}`)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await checkTranslations()

  if (!result.ok) {
    printIssues(result.issues)
    process.exitCode = 1
  }
}

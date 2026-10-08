// fallow-ignore-file complexity -- repo script with no specs by decision, so CRAP scores it as untested
import { existsSync } from "node:fs"
import { readdir, readFile } from "node:fs/promises"
import { relative, resolve } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { NodeTypes, parse as parseDom } from "@vue/compiler-dom"
import { parse as parseSfc } from "@vue/compiler-sfc"
import ts from "typescript"

const locales = ["en", "fr"]
const localeRootPath = "i18n/locales"
const sourceDir = "app"
const ignoredSourceParts = ["app/components/ui", "app/components/vuzeno"]
const sourceExtensions = [".vue", ".ts", ".js", ".mjs"]

/**
 * Catches the translation mistakes that only show up in production as raw key paths:
 * keys the code asks for that no locale file defines, dynamic keys whose placeholder can take a value the
 * files do not cover, duplicate JSON keys, empty values,
 * and locale files missing from the `nuxt.config.ts` list.
 */
export async function checkTranslationKeys(options = {}) {
  const root = resolve(options.root ?? process.cwd())
  const localeRoot = resolve(root, localeRootPath)
  const { messages, issues: localeIssues } = await loadMessages({ localeRoot, root })
  const files = await listSourceFiles(root)
  const literalSets = await buildLiteralSetIndex(files)
  const usageIssues = []

  for (const filePath of files) {
    const source = await readFile(filePath, "utf8")
    usageIssues.push(...findUsageIssues({ file: toRelative(root, filePath), source, messages, literalSets }))
  }

  const issues = [...localeIssues, ...(await findConfigIssues({ localeRoot, root })), ...usageIssues]

  return { ok: issues.length === 0, issues }
}

async function loadMessages({ localeRoot, root }) {
  const messages = new Map(locales.map(locale => [locale, new Map()]))
  const issues = []
  const domains = await listDirectories(localeRoot)

  for (const domain of domains) {
    for (const locale of locales) {
      const filePath = resolve(localeRoot, domain, `${locale}.json`)
      const text = await readFile(filePath, "utf8").catch(() => null)

      if (text === null) continue

      const file = toRelative(root, filePath)
      issues.push(...findDuplicateJsonKeys({ file, text }))

      try {
        collectEntries(JSON.parse(text), "", messages.get(locale), { file, issues })
      } catch {
        issues.push({ file, message: "Invalid JSON" })
      }
    }
  }

  issues.push(...findKeysMissingFromLocale(messages))

  return { messages, issues }
}

function collectEntries(value, prefix, target, { file, issues }) {
  if (isRecord(value)) {
    for (const [key, nested] of Object.entries(value)) {
      collectEntries(nested, prefix ? `${prefix}.${key}` : key, target, { file, issues })
    }
    return
  }

  if (typeof value === "string" && value.trim() === "") issues.push({ file, message: `Empty translation ${prefix}` })

  target.set(prefix, typeof value === "string" ? value : "")
}

function findKeysMissingFromLocale(messages) {
  const allKeys = new Set([...messages.values()].flatMap(entries => [...entries.keys()]))

  return locales.flatMap(locale =>
    [...allKeys]
      .filter(key => !messages.get(locale).has(key))
      .map(key => ({ file: `${localeRootPath}/**/${locale}.json`, message: `Missing key ${key}` })),
  )
}

/** `JSON.parse` keeps the last of two equal keys without a word, so the first one silently dies. */
function findDuplicateJsonKeys({ file, text }) {
  const issues = []
  const stack = []
  let line = 1

  for (let index = 0; index < text.length; index++) {
    const char = text[index]

    if (char === "\n") line++
    else if (char === "{") stack.push({ keys: new Set(), expectKey: true })
    else if (char === "[") stack.push({ keys: null, expectKey: false })
    else if (char === "}" || char === "]") stack.pop()
    else if (char === "," && stack.at(-1)?.keys) stack.at(-1).expectKey = true
    else if (char === '"') {
      const end = findStringEnd(text, index)
      const top = stack.at(-1)

      if (top?.keys && top.expectKey) {
        const key = text.slice(index + 1, end)

        if (top.keys.has(key)) issues.push({ file, line, message: `Duplicate JSON key "${key}"` })
        top.keys.add(key)
        top.expectKey = false
      }

      index = end
    }
  }

  return issues
}

function findStringEnd(text, start) {
  let index = start + 1

  while (index < text.length && text[index] !== '"') index += text[index] === "\\" ? 2 : 1

  return index
}

async function findConfigIssues({ localeRoot, root }) {
  const configPath = resolve(root, "nuxt.config.ts")
  const config = await readFile(configPath, "utf8").catch(() => "")
  const listed = new Set([...config.matchAll(/["']([\w-]+\/(?:en|fr)\.json)["']/g)].map(match => match[1]))
  const issues = []

  for (const domain of await listDirectories(localeRoot)) {
    for (const locale of locales) {
      const entry = `${domain}/${locale}.json`

      if (!listed.has(entry)) issues.push({ file: "nuxt.config.ts", message: `Locale file ${entry} is not listed` })
    }
  }

  for (const entry of listed) {
    if (!existsSync(resolve(localeRoot, entry)))
      issues.push({ file: "nuxt.config.ts", message: `Listed locale file ${entry} does not exist` })
  }

  return issues
}

/** Every `as const` array and string-literal union in the app, by name — what a `${placeholder}` can be. */
async function buildLiteralSetIndex(files) {
  const index = new Map()
  const aliases = new Map()

  for (const filePath of files) {
    const source = await readFile(filePath, "utf8")

    for (const code of scriptsOf({ file: filePath, source })) {
      collectLiteralSets(ts.createSourceFile("index.ts", code.text, ts.ScriptTarget.Latest, true), index, aliases)
    }
  }

  for (const [name, target] of aliases) if (index.has(target)) index.set(name, index.get(target))

  return index
}

function collectLiteralSets(sourceFile, index, aliases) {
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const values = literalArrayValues(node.initializer)

      if (values) index.set(node.name.text, values)
    }

    if (ts.isTypeAliasDeclaration(node)) {
      const values = literalUnionValues(node.type)
      const target = typeofIndexTarget(node.type)

      if (values) index.set(node.name.text, values)
      if (target) aliases.set(node.name.text, target)
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
}

function literalArrayValues(node) {
  const expression = ts.isAsExpression(node) ? node.expression : node

  if (!ts.isArrayLiteralExpression(expression) || expression.elements.length === 0) return null
  if (!expression.elements.every(ts.isStringLiteralLike)) return null

  return new Set(expression.elements.map(element => element.text))
}

function literalUnionValues(node) {
  if (!ts.isUnionTypeNode(node)) return null

  const literals = node.types.filter(type => ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal))

  return literals.length === node.types.length ? new Set(literals.map(type => type.literal.text)) : null
}

function typeofIndexTarget(node) {
  if (!ts.isIndexedAccessTypeNode(node)) return null

  const object = ts.isParenthesizedTypeNode(node.objectType) ? node.objectType.type : node.objectType

  return ts.isTypeQueryNode(object) && ts.isIdentifier(object.exprName) ? object.exprName.text : null
}

function findUsageIssues({ file, source, messages, literalSets }) {
  const issues = []
  const localKeys = new Map(locales.map(locale => [locale, new Set()]))
  const tokens = new Set(source.match(/[A-Za-z_$][\w$]*/g))

  if (file.endsWith(".vue")) collectInlineKeys(source, file, localKeys)

  for (const reference of extractReferences({ file, source })) {
    const report = message => issues.push({ file, line: reference.line, message })

    if (reference.parts.length === 1) {
      checkStaticKey({ key: reference.parts[0], messages, localKeys, report })
    } else {
      checkDynamicKey({ parts: reference.parts, messages, literalSets, tokens, report })
    }
  }

  return issues
}

function checkStaticKey({ key, messages, localKeys, report }) {
  for (const locale of locales) {
    if (!messages.get(locale).has(key) && !localKeys.get(locale).has(key))
      report(`Missing ${locale} translation ${key}`)
  }
}

function checkDynamicKey({ parts, messages, literalSets, tokens, report }) {
  const display = parts.map(part => (part === null ? "${…}" : part)).join("")
  const pattern = new RegExp(`^${parts.map(part => (part === null ? "([^.]+)" : escapeRegExp(part))).join("")}$`)

  for (const locale of locales) {
    const observed = new Set()

    for (const key of messages.get(locale).keys()) {
      const match = pattern.exec(key)

      if (match) observed.add(match[1] ?? key)
    }

    if (observed.size === 0) {
      report(`No ${locale} translation matches ${display}`)
      continue
    }

    if (parts.filter(part => part === null).length !== 1) continue

    for (const value of missingPlaceholderValues({ observed, literalSets, tokens })) {
      report(`Missing ${locale} translation ${display.replace("${…}", value)}`)
    }
  }
}

/**
 * Values the placeholder can take that no key covers. The placeholder's type is not known here, so a literal
 * set named in the same file stands in for it — but only one that contains every key found, which keeps an
 * unrelated list from raising a false alarm.
 */
function missingPlaceholderValues({ observed, literalSets, tokens }) {
  const missing = new Set()

  for (const [name, values] of literalSets) {
    if (!tokens.has(name) || ![...observed].every(value => values.has(value))) continue

    for (const value of values) if (!observed.has(value)) missing.add(value)
  }

  return missing
}

/** Each reference is the key as parts: a string for fixed text, `null` for a `${placeholder}`. */
function extractReferences({ file, source }) {
  const references = []

  for (const code of scriptsOf({ file, source })) {
    const sourceFile = ts.createSourceFile("usage.ts", code.text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)

    function visit(node) {
      const parts = ts.isCallExpression(node) && isTranslationCall(node.expression) ? keyParts(node.arguments[0]) : null

      if (parts) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart())
        references.push({ parts, line: code.line + line })
      }

      ts.forEachChild(node, visit)
    }

    visit(sourceFile)
  }

  if (file.endsWith(".vue")) references.push(...extractKeypathReferences(source, file))

  return references
}

function keyParts(argument) {
  if (!argument) return null
  if (ts.isStringLiteralLike(argument)) return looksLikeKey(argument.text) ? [argument.text] : null
  if (!ts.isTemplateExpression(argument)) return null

  const parts = [argument.head.text]

  for (const span of argument.templateSpans) parts.push(null, span.literal.text)

  return parts.filter(part => part !== "")
}

function looksLikeKey(text) {
  return /^[\w-]+(?:\.[\w-]+)*$/.test(text)
}

function isTranslationCall(expression) {
  if (ts.isIdentifier(expression)) return expression.text === "t" || expression.text === "$t"

  return ts.isPropertyAccessExpression(expression) && (expression.name.text === "t" || expression.name.text === "$t")
}

/** Script blocks, plus every template expression as its own snippet with the line it starts on. */
function scriptsOf({ file, source }) {
  if (!file.endsWith(".vue")) return [{ text: source, line: 0 }]

  const { descriptor } = parseSfc(source, { filename: file })
  const blocks = [descriptor.script, descriptor.scriptSetup].filter(Boolean)
  const snippets = blocks.map(block => ({ text: block.content, line: block.loc.start.line - 1 }))

  if (descriptor.template) {
    const base = descriptor.template.loc.start.line - 1
    walkTemplate(parseDom(descriptor.template.content, { comments: false }), node => {
      for (const expression of expressionsOf(node)) {
        snippets.push({ text: expression.content, line: base + expression.loc.start.line - 1 })
      }
    })
  }

  return snippets
}

function expressionsOf(node) {
  if (node.type === NodeTypes.INTERPOLATION) return [node.content]
  if (node.type !== NodeTypes.ELEMENT) return []

  return node.props
    .filter(prop => prop.type === NodeTypes.DIRECTIVE && prop.name !== "for" && prop.exp?.content)
    .map(prop => prop.exp)
}

function extractKeypathReferences(source, file) {
  const { descriptor } = parseSfc(source, { filename: file })

  if (!descriptor.template) return []

  const references = []
  const base = descriptor.template.loc.start.line - 1

  walkTemplate(parseDom(descriptor.template.content, { comments: false }), node => {
    if (node.type !== NodeTypes.ELEMENT) return

    const prop = node.props.find(item => item.type === NodeTypes.ATTRIBUTE && item.name === "keypath")

    if (prop?.value && looksLikeKey(prop.value.content)) {
      references.push({ parts: [prop.value.content], line: base + prop.loc.start.line - 1 })
    }
  })

  return references
}

function collectInlineKeys(source, file, localKeys) {
  const { descriptor } = parseSfc(source, { filename: file })

  for (const block of descriptor.customBlocks.filter(item => item.type === "i18n")) {
    try {
      for (const [locale, value] of Object.entries(JSON.parse(block.content))) {
        for (const key of flattenKeys(value)) localKeys.get(locale)?.add(key)
      }
    } catch {
      // A non-JSON block is not ours to judge.
    }
  }
}

function flattenKeys(value, prefix = "") {
  if (!isRecord(value)) return [prefix]

  return Object.entries(value).flatMap(([key, nested]) => flattenKeys(nested, prefix ? `${prefix}.${key}` : key))
}

function walkTemplate(node, visit) {
  visit(node)

  if ("children" in node) for (const child of node.children) walkTemplate(child, visit)
}

async function listSourceFiles(root) {
  const files = await listFiles(resolve(root, sourceDir))

  return files.filter(file => {
    const path = toRelative(root, file)

    return (
      sourceExtensions.some(extension => file.endsWith(extension)) &&
      !ignoredSourceParts.some(part => path.startsWith(part))
    )
  })
}

async function listFiles(path) {
  const entries = await readdir(path, { withFileTypes: true }).catch(() => [])
  const nested = await Promise.all(
    entries.map(entry => (entry.isDirectory() ? listFiles(resolve(path, entry.name)) : [resolve(path, entry.name)])),
  )

  return nested.flat()
}

async function listDirectories(path) {
  const entries = await readdir(path, { withFileTypes: true }).catch(() => [])

  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort()
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function toRelative(root, path) {
  return relative(root, path).replaceAll("\\", "/")
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await checkTranslationKeys()

  for (const issue of result.issues) {
    console.error(`${issue.line ? `${issue.file}:${issue.line}` : issue.file} ${issue.message}`)
  }

  if (!result.ok) process.exitCode = 1
}

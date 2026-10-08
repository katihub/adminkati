## What I built

Redesigned the Product detail **History** tab as a flat, spacious vertical audit timeline. Each visible change now has a connected semantic marker, descriptive event heading, right-aligned text status pill, nested field-change branch, timestamp, and existing editor attribution; the existing order and empty-state behaviour remain intact.

## Plan coverage

| Plan item | Status | Where |
| :-- | :-- | :-- |
| Public-seam history-event test | Done | `test/nuxt/products-history-entry.test.ts` |
| Product-specific vertical timeline layout | Done | `app/components/products/HistoryPanel.vue`, `app/components/products/HistoryEntry.vue` |
| Responsive/localized verification | Done | `i18n/locales/products/en.json`, `i18n/locales/products/fr.json` and the commands below |

## Deviations

- The frozen plan proposed using the translated event type as both the left title and status-pick label. I added `historyEntry.title` translations instead (`Product updated` / `Produit modifié`, etc.) so the visual hierarchy does not repeat identical copy while the concise type stays in the status pill.

## Tests

- `bunx vitest run test/nuxt/products-history-entry.test.ts` — red before implementation: 1 failed / 13 passed because the old card had no status pill.
- `bunx vitest run test/nuxt/products-history-entry.test.ts` — red before localized title refinement: 1 failed / 13 passed because the original title was `Modified`, not `Product updated`.
- `bunx vitest run test/nuxt/products-history-entry.test.ts test/nuxt/products-lifecycle.test.ts` — 2 files passed, 19 tests passed. Covers event summary, field labels/value fallbacks, unchanged-diff suppression, newest-first ordering, and the empty state.
- `bunx oxlint app/components/products/HistoryPanel.vue app/components/products/HistoryEntry.vue test/nuxt/products-history-entry.test.ts` — passed with no findings.
- `bunx oxfmt --check app/components/products/HistoryPanel.vue app/components/products/HistoryEntry.vue test/nuxt/products-history-entry.test.ts i18n/locales/products/en.json i18n/locales/products/fr.json` — all 5 files correctly formatted.
- `bun run i18n:check` — passed.
- `bun run typecheck` — passed.
- `bunx fallow audit --diff-file /private/var/folders/fr/3k0l5j6d16q73t2z99fhs5c00000gn/T/opencode/product-history-timeline.diff` — passed: no dead-code, complexity, duplication, or scoped styling findings. It still printed project-wide inherited CSS-token-drift advisories outside this diff.
- `bun run build` — passed. The existing build emitted lottie-web direct-`eval` and chunk-size warnings, neither from this change.

## Not done

- Stock movements remain the existing table, as requested.
- No endpoint, schema, or independent history loading state was added because history remains part of the product-detail payload.
- No authenticated manual browser review was performed; focused component tests and the production build verified this work without live backend data.

## Notes for the reviewer

- The new timeline intentionally does not copy the mockup's workflow-progress spinner or file artefacts: the product history contract has no progress state or files. Its type marker/pill is both colour-coded and text-labelled.
- The worktree contained unrelated product locale edits before this task. This change adds only the `products.historyEntry.title` keys alongside them.

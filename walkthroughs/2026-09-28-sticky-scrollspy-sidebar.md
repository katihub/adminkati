## What I built

The point-of-sale editor rail now uses `top-6`, matching the grid's initial `py-6` inset so it remains in the same visual position when the drawer scrolls. Its existing active state now follows the last form section that has reached the rail's top edge within the drawer viewport.

## Plan coverage
| Plan item | Status | Where |
| :-- | :-- | :-- |
| Keep the rail at its load position | Done | `app/components/points-of-sale/DrawerEditor.vue:154` |
| Synchronize active section while scrolling | Done | `app/components/points-of-sale/DrawerEditor.vue:78` |
| Add scroll-spy coverage | Skipped | User explicitly selected "No test change" for the proposed public test seam. |

## Deviations

The plan proposed an `IntersectionObserver`. The implementation listens to the existing Reka scroll viewport instead and compares each section's top edge to the rail's actual sticky position. This directly implements "next to the sidebar" without an approximate observer root margin, and requires no generated UI changes.

No new automated test was added because the user explicitly declined the test change.

## Tests

- `bunx eslint app/components/points-of-sale/DrawerEditor.vue` — passed with no issues.
- `bunx vitest run test/nuxt/points-of-sale-page.test.ts` — passed: 1 file, 22 tests.
- `bun run typecheck` — blocked by an unrelated existing error: `test/nuxt/inline-tag-selector.test.ts:43` uses `.click` on `Element`.
- `bun run fallow` — blocked by 8 pre-existing complexity findings in other changed files in the shared worktree. It reported the touched drawer grid's existing arbitrary Tailwind grid as advisory token drift, not a gate failure.

## Not done

- The user declined the automated scroll-spy test.
- Full typecheck and the fallow audit cannot currently pass until the unrelated shared-worktree findings are resolved.

## Notes for the reviewer

Review the adjacent-section selection at `DrawerEditor.vue:78`: the active item is the last section whose top is at or above the sticky rail's actual top. This keeps click and `?section=` focus behavior intact while reflecting manual scroll position.

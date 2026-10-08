# Review — Sticky Scrollspy Sidebar

## Verdict

Mergeable for this change. The rail retains its load inset and the active nav state follows the form section crossing the rail's live top edge; the scroll-listener deviation is documented and better matches the requested alignment than an observer margin would.

- MAJOR: 0 · MEDIUM: 0 · MINOR: 0 · INT: 2
- Tests: `bunx vitest run test/nuxt/points-of-sale-page.test.ts` → passed, 1 file and 22 tests

## Plan fidelity

| Plan item | Verdict | Evidence |
| :-- | :-- | :-- |
| Keep the rail at its load position | DONE | `app/components/points-of-sale/DrawerEditor.vue:155` applies `top-6`, matching the grid's `py-6`. |
| Synchronize the active item while scrolling | DEVIATED | `app/components/points-of-sale/DrawerEditor.vue:78` uses the actual scroll viewport and rail geometry instead of an `IntersectionObserver`; the walkthrough documents and justifies this. |
| Add scroll-spy coverage | PARTIAL | The user explicitly declined the test change, recorded at `walkthroughs/2026-09-28-sticky-scrollspy-sidebar.md:10`. |

**Walkthrough accuracy:** Accurate. The source uses the viewport scroll listener described in the walkthrough, restores no generated UI code, and the reported lint, focused-test, typecheck, and fallow results match the observed commands.

## Findings

### MAJOR

None.

### MEDIUM

None.

### MINOR

None.

### INT

**1. The requested scroll-spy behavior has no dedicated regression test.**
- Where: `app/components/points-of-sale/DrawerEditor.vue:78`
- Axis: Tests
- Note: The user explicitly declined the proposed test seam, so no action is required for this task. The existing points-of-sale suite still passes.

**2. Repository-wide gates remain blocked outside this change.**
- Where: `test/nuxt/inline-tag-selector.test.ts:43` and unrelated shared-worktree complexity findings
- Axis: Code quality
- Note: `bun run typecheck` fails because `Element` has no `.click`, and `bun run fallow` reports eight complexity findings in other changed files. Neither finding is introduced by this scroll-spy implementation.

## Clean axes

- **Security:** No new input, API, authorization, dependency, or data-exposure surface.
- **Logic and correctness:** The listener is attached to Reka's actual viewport and removed on unmount; the last section reaching the sticky rail is selected deterministically.
- **Performance:** The handler reads three static section rectangles per drawer scroll event, a bounded and reachable cost.
- **UI/UX:** Reuses the existing active styles and accessibility state, preserves click and query-parameter focus behavior, and remains hidden at the existing narrow-width breakpoint.
- **Tests:** The focused 22-case points-of-sale spec was rerun successfully; the omitted dedicated coverage was user-directed.
- **Code quality:** The implementation follows the repository's existing `ScrollArea` viewport-listener pattern and passes targeted ESLint.

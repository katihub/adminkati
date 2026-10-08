# Review - Operations Workspace

## Verdict

The Operations workspace is mergeable. It follows the plan's shared tab pattern, preserves each
workspace's existing async states and data contracts, and prevents both workspaces from prefetching
on one SSR request. One non-blocking regression-test gap remains for the legacy URLs.

- MAJOR: 0 · MEDIUM: 0 · MINOR: 1 · INT: 2
- Tests: `bunx vitest run test/unit/admin-navigation.test.ts test/nuxt/operations-page.test.ts test/nuxt/assistant-workspace.test.ts test/nuxt/caisse-workspace.test.ts test/nuxt/admin-navigation.test.ts` -> passed, 32 tests.

## Plan Fidelity

| Plan item | Verdict | Evidence |
| :-- | :-- | :-- |
| Extract the cash-register workspace | DONE | `app/components/operations/CashRegistersWorkspace.vue:19-137` |
| Extract the customer-requests workspace | DONE | `app/components/operations/CustomerRequestsWorkspace.vue:26-111` |
| Add Operations route, navigation, translations, and redirects | DONE | `app/pages/operations.vue:4-71`, `app/pages/{assistant,caisse}.vue:2-18`, `app/utils/admin-navigation.ts:62-68` |
| Add user-facing regression coverage | PARTIAL | `test/nuxt/operations-page.test.ts:36-64` covers tabs; legacy redirects have no dedicated test |
| Verify the integration | PARTIAL | Focused suites and lint/i18n/audit pass; repository-wide typecheck, test, and build have unrelated blockers recorded in the walkthrough |

**Walkthrough accuracy:** Accurate. The checked code matches its claims, including the deliberate
query reset on tab changes and the stated test/build/typecheck limitations.

## Findings

### MAJOR

None.

### MEDIUM

None.

### MINOR

**1. Legacy redirect behavior has no regression test.**
- Where: `app/pages/assistant.vue:4-8`, `app/pages/caisse.vue:4-8`
- Axis: Tests
- Problem: The existing external customer-request email link and cash-register bookmarks depend on
  these query-preserving redirects, but the suite only mounts the new Operations URLs.
- Failure: A future change can drop `demande` or redirect a French legacy URL to the unprefixed path;
  the current Operations tab, workspace, and navigation tests still pass while an operator's link
  opens the wrong tab or loses its selected record.
- Fix: Add one route-level test per legacy family that asserts its Operations target and preserved
  query. This was intentionally deferred in response to the user's request to test only necessary
  behavior.

### INT

**1. The Operations parent mounts exactly one workspace.**
- Evidence: `app/pages/operations.vue:69-70` uses `v-if`/`v-else`, preserving the plan's SSR request
  budget rather than prefetching cash and requests together.

**2. Repository-wide verification has unrelated blockers.**
- Evidence: the full Vitest run has 811 passes and six IPX/image failures outside Operations;
  `bun run typecheck` fails at `test/nuxt/inline-tag-selector.test.ts:43`; the production build times
  out fetching a Google font.

## Clean Axes

- **Security:** No new endpoint, permission boundary, dependency, secret, or untrusted input path.
  The Operations route and both legacy routes retain the existing `direction`/`comptoir` role gate.
- **Logic and correctness:** Query parsing remains bounded to recognised tabs; Customer Requests
  retains its `tab` marker during internal navigation while tab changes clear stale workspace state.
- **Performance:** SSR mounts only the active workspace, so its prefetches remain isolated.
- **UI/UX:** The parent follows the existing `content.vue` tab/header pattern; existing cash and
  request loading, empty, error, desktop, and mobile detail behavior is reused.
- **Code quality:** The extraction uses the existing components, composables, stores, and query keys;
  lint passes and Fallows reports no introduced dead-code, complexity, or duplication errors.

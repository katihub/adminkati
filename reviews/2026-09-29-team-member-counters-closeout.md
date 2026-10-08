# Review - Team Member Counter Assignments Closeout

## Verdict

Mergeable. The final remediation canonicalizes first-sign-in email matching, serializes counter assignment and deletion through compatible PostgreSQL row locks, and supplies a regression that fails if either lock clause is removed. No MAJOR, MEDIUM, or MINOR finding remains in the reviewed backend diff.

- MAJOR: 0; MEDIUM: 0; MINOR: 0; INT: 1
- Tests: `pnpm test -- src/equipe/equipe.dto.spec.ts src/equipe/equipe.service.spec.ts src/commun/garde/garde-appelant.spec.ts src/auth/auth.service.spec.ts src/vitrine/vitrine.service.spec.ts` -> 5 suites, 49 passed; `pnpm exec tsc --noEmit` -> passed; `pnpm exec prisma migrate status` -> 12 migrations, database schema up to date; `git diff --check` -> passed.

## Prior Finding Status

| Prior finding | Status | Evidence |
| :-- | :-- | :-- |
| MAJOR: unlinked invited production sign-in returned the permissive empty scope | FIXED | `../../nvc/NowTech-backend-/src/auth/auth.dto.ts:18` trims and lowercases the request email; `src/auth/auth.service.ts:273-274` independently canonicalizes the GoTrue-or-request email before the unlinked invitation lookup; `src/auth/auth.service.spec.ts:80-116` covers padded uppercase input. |
| MEDIUM: assignment and deletion could race to a dangling counter reference | FIXED | `src/equipe/equipe.service.ts:325-334` validates selected rows under `FOR KEY SHARE` in the assignment transaction; `src/vitrine/vitrine.service.ts:419-445` takes `FOR UPDATE` before counting references and deleting. Those PostgreSQL lock modes conflict, so deletion either observes the committed assignment and refuses or assignment observes deletion and rejects. |
| MEDIUM: unknown replacement PATCH lacked a regression | FIXED | `src/equipe/equipe.service.spec.ts:295-315` returns no counter rows and proves `BadRequestException`, zero member writes, and zero journal writes. |
| MAJOR: case-variant unlinked invitation sign-in remained unbound | FIXED | `src/auth/auth.service.ts:273-274` canonicalizes the fallback identity, and `src/auth/auth.service.spec.ts:80-116` proves an uppercase, padded sign-in binds the lowercase invitation and returns `['Akwa']`. |
| MEDIUM: concurrency regression passed without exercising the shared lock protocol | FIXED | `src/vitrine/vitrine.service.spec.ts:97-119,324-346` interleaves the operations and only delays deletion when it sees both `FOR KEY SHARE` and `FOR UPDATE`; removing either clause produces a dangling assignment and fails the assertion. |

## Plan Fidelity

| Plan item | Verdict | Evidence |
| :-- | :-- | :-- |
| Durable Prisma field and migration | DEVIATED (explained) | `../../nvc/NowTech-backend-/prisma/schema.prisma:262-281` declares `String[] @default([]) @db.VarChar(40)` and `prisma/migrations/20260929100053_membres_equipe_comptoirs/migration.sql:2` adds the matching non-null default. The timestamp differs from the frozen proposed path; the walkthrough explains the corrected migration command and the SQL remains additive. |
| DTO validation, persistence, projections, and audit details | DONE | `src/equipe/equipe.dto.ts:56-63,90-97` preserves omitted-versus-empty semantics and rejects malformed lists; `src/equipe/equipe.service.ts:65-101,156-192,325-335` validates, locks, persists, projects, and journals the assignments. |
| Authenticated caller and auth response scopes | DONE | `src/commun/garde/appelant.ts:21-24` and `src/commun/garde/garde-appelant.ts:96-123` return the persisted list through `/v1/moi`; `src/auth/auth.service.ts:156-175,234-320` returns it for production, local, and refresh sessions. |
| Counter deletion invariant | DONE | `src/vitrine/vitrine.service.ts:419-445` locks the counter, counts assigned team members, and refuses a referenced deletion; `src/vitrine/vitrine.controller.ts:316-319` documents the fourth reference type. |
| Database/API-boundary proof and unchanged frontend regressions | DONE | This closeout independently observed the 49-test focused backend suite. The final lock-aware regression is at `src/vitrine/vitrine.service.spec.ts:324-346`; the documented two-client PostgreSQL run is at `../../nowtech-admin/feat-enhancements/walkthroughs/2026-09-29-team-member-counters.md:37`. No frontend source belongs to this feature, and the original review independently recorded the unchanged three-file frontend suite passing. |

**Walkthrough accuracy:** Accurate for the final code. The canonical email, shared-lock, unknown-PATCH, and lock-aware regression claims all match the implementation. Its two-client PostgreSQL result is documented execution evidence rather than a committed test script; it reports the expected blocking and post-commit refusal result and does not contradict the source or the focused regression.

## Findings

### MAJOR

None.

### MEDIUM

None.

### MINOR

None.

### INT

**1. The actual PostgreSQL interleaving check is documented, not retained as an executable test.**
- Where: `../../nowtech-admin/feat-enhancements/walkthroughs/2026-09-29-team-member-counters.md:37`
- Axis: Tests
- Observation: The recorded two-client run pauses a real assignment after `FOR KEY SHARE`, observes the delete block on `FOR UPDATE`, then observes the delete refuse after assignment commit. The committed lock-aware regression independently fails if either source lock clause is removed.
- Action: None for this closeout. Repeat the recorded two-client protocol when changing either transaction path or upgrading Prisma/PostgreSQL.

## Clean Axes

Security: no finding. Controller role guards remain unchanged, global DTO transformation/whitelisting applies, counter values are bounded and parameterized, and the canonical sign-in path no longer returns an unlinked staff member as a whole-shop customer.

Logic and correctness: no finding. Creation defaults to `[]`, omitted PATCH preserves scope, explicit `[]` clears restrictions, all team projections expose the stored array, audit states are retained, and the lock protocol rules out the reviewed dangling-reference interleaving.

Performance: no finding. Validation is bounded to 50 keys, counter deletion is an infrequent guarded operation, and the additional count executes in parallel with the existing reference checks under the required transaction.

UI/UX: no finding. The feature makes no frontend change and adds no client interaction or presentation state.

Tests: no finding. The focused suite passed independently with all 49 tests; it includes malformed input, persistence semantics, unknown create/PATCH keys, guarded caller scope, auth responses, member-reference deletion, and lock-aware interleaving coverage.

Code quality: no finding. The implementation reuses existing controller/service/Prisma seams, introduces no dependency or duplicate route, and keeps the shared counter validation in one private helper.

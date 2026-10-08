# Review — Team Member Counter Assignments

## Verdict
This is not mergeable: normal production sign-in loses the persisted scope for the supported invited-member lifecycle, and assignment/deletion operations can still create a dangling counter reference under concurrency. The focused suites pass, but they do not exercise either condition.

- MAJOR: 1 · MEDIUM: 2 · MINOR: 0 · INT: 1
- Tests: `pnpm test -- src/equipe/equipe.dto.spec.ts src/equipe/equipe.service.spec.ts src/commun/garde/garde-appelant.spec.ts src/auth/auth.service.spec.ts src/vitrine/vitrine.service.spec.ts` → 5 suites, 45 passed; `bunx vitest run test/nuxt/team-hire-dialog.test.ts test/nuxt/team-api.test.ts test/nuxt/team-workspace.test.ts` → 3 files, 19 passed; `pnpm exec tsc --noEmit` → passed; `pnpm test` → 24 suites passed, 2 failed; 208 tests passed, 11 failed in untouched `catalogue` and `main` suites, unrelated to this patch.

## Plan fidelity

| Plan item | Verdict | Evidence |
| :-- | :-- | :-- |
| Durable Prisma field and migration | DONE | `../../nvc/NowTech-backend-/prisma/schema.prisma:270-271` and `../../nvc/NowTech-backend-/prisma/migrations/20260929100053_membres_equipe_comptoirs/migration.sql:2` add the non-null `VARCHAR(40)[]` empty default; `prisma migrate status` reports current. |
| DTO validation, persistence, projections, and journal detail | DONE | `../../nvc/NowTech-backend-/src/equipe/equipe.dto.ts:56-63`, `../../nvc/NowTech-backend-/src/equipe/equipe.service.ts:65-100`, and `:157-191` implement the specified optional/empty semantics, lookup, projections, and audit fields. |
| Authenticated caller and auth-response scope | PARTIAL | Guard and `/moi` wiring are correct at `../../nvc/NowTech-backend-/src/commun/garde/garde-appelant.ts:96-123`, but the normal direct auth response misses active invited members at `../../nvc/NowTech-backend-/src/auth/auth.service.ts:156-165`. |
| Counter deletion invariant | PARTIAL | The serial-path count is present at `../../nvc/NowTech-backend-/src/vitrine/vitrine.service.ts:422-437`, but it is not serialized with assignment writes. |
| Database/API-boundary proof and unchanged frontend regressions | PARTIAL | The planned focused backend and frontend regressions pass, but `../../nvc/NowTech-backend-/src/auth/auth.service.spec.ts:7-12` excludes the supported unlinked-member case and `../../nvc/NowTech-backend-/src/equipe/equipe.service.spec.ts:274-293` covers only create-time unknown-key rejection. |

**Walkthrough accuracy:** Inaccurate for the direct production auth contract. The claims at `walkthroughs/2026-09-29-team-member-counters.md:2,9` that auth responses expose the persisted scope are false for an invited active member whose `userId` is still null. Its focused-test and full-suite counts are accurate; the auth test at `../../nvc/NowTech-backend-/src/auth/auth.service.spec.ts:7-12` only exercises an already-linked member.

## Findings

### MAJOR

**1. Normal production sign-in returns a whole-shop empty scope for an unlinked invited team member.**
- Where: `../../nvc/NowTech-backend-/src/auth/auth.service.ts:156-165,263-265`
- Axis: Security and logic
- Problem: `contexte()` searches an active member only by `userId`. The documented team-member lifecycle permits `userId` to be null until a request passes through `GardeAppelant`, which alone falls back to the verified email and links the record.
- Failure: A director invites a member with `comptoirs: ["Akwa"]`; after invitation acceptance, GoTrue returns the new user ID but the team row still has `userId: null`. `POST /v1/auth/connexion` returns `estEquipe: false`, `roles: []`, and `comptoirs: []` instead of the persisted assignment. Since `[]` means whole-shop coverage, the returned session has the feature's most permissive scope value as well as the wrong staff state.
- Fix: Resolve the normal GoTrue response against the verified user ID or verified GoTrue email, bind an unlinked match atomically as the guard does, and add a production-sign-in test for `userId: null` with both restricted and empty assignments.

### MEDIUM

**1. Counter validation and deletion are not serialized, so concurrent requests can persist a dangling scope.**
- Where: `../../nvc/NowTech-backend-/src/equipe/equipe.service.ts:67-72,121,157-169`; `../../nvc/NowTech-backend-/src/vitrine/vitrine.service.ts:419-437`
- Axis: Logic and data integrity
- Problem: Assignment validation reads `points_vente` before its write transaction, while deletion separately counts references and then issues the delete. Neither path takes a shared row/key lock or performs its check and mutation in one serializable unit.
- Failure: A PATCH validates `Akwa` while it exists; a concurrent delete sees no member reference and removes `Akwa`; the PATCH then writes `comptoirs: ["Akwa"]`. The database now contains the dangling reference the plan explicitly prohibits.
- Fix: Put validation-plus-write and reference-check-plus-delete behind the same per-counter transactional lock, then recheck after acquiring it. Add an interleaving test that proves one of the two operations is refused or retried.

**2. The replacement-update unknown-key guard has no regression test.**
- Where: `../../nvc/NowTech-backend-/src/equipe/equipe.service.spec.ts:274-293`; `../../nvc/NowTech-backend-/src/equipe/equipe.service.ts:121`
- Axis: Tests
- Problem: The added negative test proves only that an unknown key is rejected before creation. The successful PATCH test uses a lookup mock that always returns `Akwa` and does not assert that the lookup occurred, so it passes even if the update-time validation is removed.
- Failure: Removing the `dto.comptoirs !== undefined` validation branch would allow `PATCH { "comptoirs": ["invented"] }` to update the row and journal while every added test still passes.
- Fix: Make the PATCH lookup return no rows and assert `BadRequestException`, zero `membreEquipe.update` calls, and zero journal calls.

### MINOR

None.

### INT

**1. The walkthrough records an unverified local data-loss risk during migration generation.**
- Where: `walkthroughs/2026-09-29-team-member-counters.md:16`
- Axis: Migration operations
- Problem: An initially generated migration reportedly dropped the pre-existing `sales_goals` table before the committed additive migration was corrected. The table definition was restored, but the prior row count was not captured.
- Failure: If the local table contained rows, those rows cannot be recovered from the current database state.
- Fix: No committed-code change is required because the checked-in migration is additive. Treat this as an operational recovery check if that local database contained data that matters.

## Clean axes

Performance: no finding. The supplied-key lookup is bounded to 50 entries and the deletion reference counts remain parallel.

UI/UX: no finding. No frontend source changed, and the three existing frontend contract/whole-shop regressions pass.

Code quality: no finding. The change follows existing DTO, Prisma projection, guard, and journal patterns without introducing a dependency or duplicate endpoint.

Security: no additional injection or route-authorization finding. Global DTO whitelisting is active and the new counter lookup uses parameterized `Prisma.sql`; the session-scope correctness defect is recorded above.

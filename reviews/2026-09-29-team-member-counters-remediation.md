# Review - Team Member Counter Assignments Remediation

## Verdict
This remediation is not mergeable. The direct production sign-in fix still misses an invited member when they use a valid case variant of their email, so it returns the non-team, whole-shop-shaped empty scope instead of binding and returning the persisted assignment. The assignment/deletion source locking is correct, and the unknown-PATCH regression is now covered, but the concurrency spec does not exercise real PostgreSQL lock compatibility.

- MAJOR: 1 · MEDIUM: 1 · MINOR: 0 · INT: 0
- Tests: `pnpm test -- src/equipe/equipe.dto.spec.ts src/equipe/equipe.service.spec.ts src/commun/garde/garde-appelant.spec.ts src/auth/auth.service.spec.ts src/vitrine/vitrine.service.spec.ts` -> 5 suites passed, 48 tests passed

## Prior Finding Status

| Prior finding | Status | Evidence |
| :-- | :-- | :-- |
| MAJOR: unlinked invited production sign-in returns an empty scope | PARTIAL | `src/auth/auth.service.ts:156-175` now finds an active unlinked member by email, binds `userId`, and returns `comptoirs`; the raw, unnormalised request email leaves a valid case-variant sign-in broken. |
| MEDIUM: assignment and deletion can race to a dangling reference | PARTIAL | `src/equipe/equipe.service.ts:325-335` takes `FOR KEY SHARE` within the assignment transaction and `src/vitrine/vitrine.service.ts:419-445` takes `FOR UPDATE` before checking and deleting. The source resolves the race, but the new spec does not validate the database locking behavior. |
| MEDIUM: unknown replacement PATCH has no regression test | FIXED | `src/equipe/equipe.service.spec.ts:295-315` makes the replacement lookup return no rows and asserts `BadRequestException`, zero updates, and zero journal writes. |

## Plan Fidelity

| Plan item | Verdict | Evidence |
| :-- | :-- | :-- |
| Durable Prisma field and additive migration | DONE | `prisma/schema.prisma:262-281` declares non-null `String[] @default([]) @db.VarChar(40)` and `prisma/migrations/20260929100053_membres_equipe_comptoirs/migration.sql:2` adds the matching defaulted column. |
| DTO validation, persistence, projections, and audit details | DONE | `src/equipe/equipe.dto.ts:56-63,90-97` validates trimmed arrays; `src/equipe/equipe.service.ts:65-101,156-192,325-335` persists, projects, audits, validates, and locks assignments. |
| Authenticated caller and auth response scopes | PARTIAL | `src/commun/garde/garde-appelant.ts:96-123` and `src/sante/sante.controller.ts:36-40` expose the stored list, but `src/auth/auth.service.ts:161` compares an unnormalised sign-in email to the normalised invitation address. |
| Counter deletion invariant | DONE | `src/vitrine/vitrine.service.ts:419-445` locks the counter row, includes `membreEquipe.count({ comptoirs: { has: point.cle } })`, and rejects referenced deletion. The shared locking is a sound, walkthrough-acknowledged remediation beyond the frozen plan. |
| Database/API-boundary proof | PARTIAL | DTO, service, guard, auth, and deletion tests pass in the focused suite. `src/vitrine/vitrine.service.spec.ts:87-101,324-346` serializes mock transactions globally, so it cannot establish that the two PostgreSQL lock modes are what prevent the race. Frontend regressions were not independently rerun in this backend-focused remediation review. |

**Walkthrough accuracy:** Partially accurate. The reported exact-email invited-member sign-in, source lock additions, and unknown-PATCH test are present. The claim that production first sign-in binds an invited member by the accepted sign-in email is too broad: the implementation uses the raw `ConnexionDto.email`, not a normalised or GoTrue-verified canonical email, and the concurrency test does not prove the stated row-lock guarantee.

## Findings

### MAJOR

**1. A valid case-variant email leaves an invited member unbound at production sign-in.**

Where: `src/auth/auth.dto.ts:12-24`, `src/auth/auth.service.ts:156-175,262-275`, `src/equipe/equipe.dto.ts:29-32`

Axis: Security and logic/correctness

Problem: Invitations are stored lowercased by `InscrireMembreDto`, while `ConnexionDto.email` only checks email syntax. After GoTrue authenticates the user, `contexte()` uses the raw request value in an exact PostgreSQL equality predicate for the unlinked-member fallback. It does not use a canonical verified email from GoTrue or normalise the input.

Failure: An invitation stores `aline@nowtech.cm` with `userId: null`. A user signs in successfully through GoTrue with `ALINE@nowtech.cm`; the endpoint accepts that syntactically valid value, but `OR: [{ userId }, { courriel: "ALINE@nowtech.cm", userId: null }]` matches neither branch. The response is `estEquipe: false`, `roles: []`, and `comptoirs: []`, and the member remains unbound rather than receiving `['Akwa']`.

Fix: Canonicalise `ConnexionDto.email` with the same trim/lowercase rule used for invitations, or pass a canonical email returned by GoTrue to `contexte()`. Add a production sign-in regression using an uppercase request email against a lowercased unlinked invitation.

### MEDIUM

**1. The concurrency regression test cannot detect removal of the assignment lock.**

Where: `src/vitrine/vitrine.service.spec.ts:87-101,102-107,324-346`

Axis: Tests

Problem: `CourseComptoirFixture.$transaction()` waits for every preceding mocked transaction before running the next callback. That global serialization produces the safe ordering regardless of whether `EquipeService.verifierComptoirs()` actually emits `FOR KEY SHARE`; the fixture does not model PostgreSQL row lock modes.

Failure: If `FOR KEY SHARE` is removed from `src/equipe/equipe.service.ts:329` while both transaction wrappers remain, production can again allow a delete after a non-locking validation and before the assignment write. This spec still queues deletion until the assignment callback completes, observes the assigned member in the deletion count, and passes.

Fix: Add an integration test using two database connections and a barrier between validation and assignment write. Assert that `FOR UPDATE` deletion blocks behind the assignment lock, then rejects after the assignment commits. This should run against PostgreSQL rather than a transaction-serializing mock.

### MINOR

None.

### INT

None.

## Clean Axes

Performance: no finding. Assignment lookup is bounded by the 50-key DTO limit, and the unique counter key supports the locked lookup.

UI/UX: no finding. No frontend source changed in the remediation; existing frontend regressions were intentionally not rerun for this backend-focused review.

Code quality: no finding. The source reuses the existing service seams and keeps the counter validation in one helper.

Security: MAJOR 1 covers the authentication-scope defect. No additional injection, route-authorization, secret, or data-exposure finding was identified.

Logic and correctness: MAJOR 1 covers the remaining first-sign-in defect. The source-level `FOR KEY SHARE` and `FOR UPDATE` protocol correctly prevents the reviewed assignment/delete interleaving.

Tests: MEDIUM 1 covers the remaining lock-regression gap. The focused backend command was independently observed passing with 48 tests.

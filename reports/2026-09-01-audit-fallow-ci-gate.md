# Audit — changed-since Fallow CI gate

## Question

Why did `bunx fallow audit --changed-since origin/development` fail, and does the implementation
still contain a newly introduced blocking finding after remediation?

## Method

I inspected the supplied CI output, compared the branch against `origin/development`, traced every
reported dependency to its manifest and imports, and reviewed the two reported complexity
functions. I added a public-boundary regression test for invalid session roles, refactored the
complexity hotspots without suppressions, and ran the relevant test and repository gates. The
adjacent backend checkout was not modified or used as anything other than read-only contract
reference.

## Findings

### The two blocking complexity findings were introduced by this branch

The original audit reported:

- `server/utils/session.ts:isSessionData` — CRAP 43.1.
- `app/middleware/auth.global.ts:default` — CRAP 90.0.

The session validator is now split into focused record, string-field, role-list, user, and session
checks. The middleware is now split into session loading, login-target construction,
undeclared-route handling, and access-result routing. `fallow health --changed-since
origin/development --format json --quiet --explain` now returns `findings: []` and
`functions_above_threshold: 0`.

The new `test/unit/session-roundtrip.test.ts` case failed before the role validation change because
the previous implementation accepted any string role, then passed after it was constrained to
`direction`, `comptoir`, `preparation`, or `livreur`.

### The five dependency findings are inherited, not introduced

The audit listed `@phosphor-icons/vue`, `class-variance-authority`, and `pinia` as unused, and
`@nuxt/test-utils` and `@tailwindcss/vite` as test-only production dependencies. All five already
exist on `origin/development`; this branch only adds `@supabase/supabase-js` and
`@tanstack/vue-query` to `package.json`. The default audit gate excludes those inherited findings,
so removing them as part of this fix would be unrelated dependency churn.

### The CSS token message is advisory

The audit still reports `grid-cols-[44fr_56fr]` in `app/pages/login.vue` as a warning-level token
drift candidate. It is an intentional two-column proportion from the login-page design, and it is
not a blocking finding. No styling behavior was changed in this quality-gate remediation.

## Verification

- `bunx vitest run --coverage.enabled=false` — passed: 25 files, 95 tests.
- `bun run lint` — passed.
- `bun run typecheck` — passed.
- `bun run i18n:check` — passed.
- `bun run build` — passed.
- `fallow health --changed-since origin/development --format json --quiet --explain` — passed with
  zero findings.
- `fallow audit --changed-since origin/development --gate all` — no complexity findings; only the
  five inherited dependency advisories and the warning-level CSS advisory remain.
- `git diff --check` — passed.

## Recommendation

The newly introduced Fallow blockers are remediated. The pull request can be re-run in CI; its
default changed-since gate should now exclude the five inherited dependency findings and pass the
changed complexity check.

## Scope limits

The default local changed-since audit could not complete because this sandbox denies Fallow's
temporary write to `.git/worktrees`; the exact permission failure was reproduced with Git. No
dependency was removed, no Fallow suppression was added, no commit hook was bypassed, and no
backend source was changed.

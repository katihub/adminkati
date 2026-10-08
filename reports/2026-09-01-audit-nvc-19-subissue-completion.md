# Audit — NVC-19 sub-issue completion

## Question

Are NVC-20 through NVC-25 implemented and verified well enough to close after the implementation is committed and its pull request is opened?

## Method

I read the current Linear records for NVC-19 through NVC-25, the frozen plan at `plans/2026-09-01-auth-and-data-infrastructure.md`, the walkthrough, the prior review, and the actual working-tree source. I ran the repository gates, exercised the local application in the in-app Browser with the provisioned `direction` account, and ran temporary local HTTP checks for the protected BFF and CSRF boundary. Temporary authentication material was removed after the HTTP checks.

The adjacent `../NowTech-backend-` checkout was treated as read-only source of truth. No backend source was changed and no backend ticket was created.

## Findings

| Issue | Result | Evidence | Verification limit |
| :-- | :-- | :-- | :-- |
| NVC-20 — Session infrastructure | **READY TO CLOSE** | `server/utils/session.ts:6-63` uses a sealed httpOnly cookie, disables the session header, validates `unsealed.data`, and exposes only the public session. `server/utils/refresh-lock.ts`, `server/utils/supabase.ts`, and `server/utils/api-session.ts` implement refresh safety. `test/unit/session-roundtrip.test.ts`, `test/unit/refresh-lock.test.ts`, `test/unit/supabase.test.ts`, and `test/unit/session-endpoint.test.ts` pass. Live `GET /api/auth/session` returned `200` with body `null` and no `Set-Cookie`; real sign-in and a protected hard reload both succeeded. | An expired-token rotation was covered by unit seams, not forced against the live Supabase account. |
| NVC-21 — Login/logout endpoints and page wiring | **READY TO CLOSE** | `server/api/auth/login.post.ts:78-87` validates, authenticates, gates on `equipe`, and writes the session only after the gate. `server/api/auth/logout.post.ts:5-14` revokes and always clears locally. Live sign-in returned `200` with the expected `direction` role and reached `/fr`; the Browser logout action returned to `/fr/connexion`. A POST without CSRF credentials returned `403 CSRF Token Mismatch`. | The non-team and angle-bracket-password branches are source/test-proven; no second live user was created to exercise them. |
| NVC-22 — BFF proxy and handwritten API types | **READY TO CLOSE** | `server/api/v1/[...path].ts:5-15` uses the authenticated session and explicit proxy headers. `server/utils/proxy-headers.ts:1-14` allowlists metadata and drops the inbound cookie. `test/unit/proxy-headers.test.ts` passes. Live `/api/v1/equipe/membres` returned `200` and an array containing one member with the temporary authenticated session; the same endpoint without a session returned `401`. | I did not independently fetch the backend origin and perform a byte-for-byte comparison; the live proxy response and source wiring were verified instead. |
| NVC-23 — Route middleware and role gating | **READY TO CLOSE** | `app/utils/access.ts:6-15` implements public, anonymous, team, role, and undeclared decisions. `app/middleware/auth.global.ts:4-29` is deny-by-default and preserves locale-aware `next`. Page metadata is declared in the existing pages. `test/unit/access.test.ts` and admin-shell integration tests pass. The live `direction` session survived a localized protected hard reload without a login bounce. | A live `comptoir` account was not used; the role-mismatch branch is covered by the pure access tests. |
| NVC-24 — TanStack Query, SSR dehydration, and Pinia boundary | **READY TO CLOSE** | `app/app.vue:9-19` registers the identity query with `staleTime: 0`, mount/refocus revalidation, and the `/api/v1/moi` fetcher. `app/plugins/vue-query.ts:3-27` hydrates synchronously and dehydrates on render; `app/plugins/auth-session.server.ts:3-10` seeds only the public session. `test/nuxt/auth-identity.test.ts` proves mount and focus refetches; the live protected hard reload proves middleware hydration does not bounce the authenticated user. | No feature screen exists yet for a separate data-prefetch page; the plan explicitly leaves feature screens out of scope. |
| NVC-25 — Error layer, CSRF, and walkthrough | **READY TO CLOSE** | `app/utils/api-error.ts`, `app/utils/auth-failure.ts`, `i18n/locales/errors/`, and `nuxt.config.ts:118-125` implement the translated error layer, shared 403 probe, CSRF protection, API XSS exemption, and BFF-only rate-limit override. The walkthrough exists. All repository gates pass, including Fallow; the missing-CSRF HTTP check returned `403`, while the app login path succeeded with CSRF. `test/unit/api-error.test.ts`, `test/unit/auth-failure.test.ts`, `test/nuxt/login-submit.test.ts`, and the full suite pass. | Revoked-member behavior was not forced against the live database; deactivation and non-logout role-forbidden paths are unit-proven. |

## Gates observed

- `rtk bun run lint` — passed.
- `rtk bun run typecheck` — passed.
- `rtk bun run i18n:check` — passed.
- `PATH="/Users/michaelnji/.vite-plus/js_runtime/node/24.19.0/bin:$PATH" rtk bunx vitest run --coverage.enabled=false` — passed: 25 files, 94 tests.
- `rtk bunx fallow audit` — passed; it reported five inherited dependency advisories and no changed-file audit issues.
- `rtk bun run build` — passed. Existing warnings remain for Lottie direct `eval`, plugin timing, the esbuild/oxc option conflict, and the generated Nuxt Zod schema treated as external.
- `rtk git diff --check` — passed after the endpoint fix, quality cleanup, and documentation refresh.

## Recommendation

NVC-20 through NVC-25 are implementation-complete and are ready to move to Done after the commit and pull request are created. The report does not claim that every backend-dependent literal was independently reproduced live: the backend-vs-proxy byte comparison and live revoked/comptoir-user scenarios remain explicit scope limits. They have source, unit/component, and available live-boundary evidence, with no observed acceptance failure remaining.

## Scope limits

This audit did not merge or approve a pull request, did not inspect browser cookies or local storage, did not modify the backend source, and did not create a new backend account or mutate backend membership state during verification.

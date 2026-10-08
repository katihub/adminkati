# Audit — Order and quote detail 404

## Question

Why did seeded `FIX-CMD-01` and `FIX-DV-COMMANDE` rows appear in the admin lists but fail to
load in their detail panels?

## Method

- Traced the admin composables and BFF path from `useOrder`/`useQuote` through `/api/v1/**`.
- Inspected the backend controllers and detail services.
- Queried the local fixture rows directly in PostgreSQL.
- Authenticated against the local backend and called both detail endpoints.
- Added a failing regression spec, applied the smallest normalization fix, and reran focused tests,
  TypeScript, build, and live detail requests.

## Finding

The list/detail mismatch was caused by `normaliserReference()` in
`NowTech-backend-/src/commun/reference.ts`. It removed punctuation from fixture references, then
only rebuilt references beginning with `CM` or `DV`. Therefore:

| Input | Previous lookup key | Stored key |
| :-- | :-- | :-- |
| `FIX-CMD-01` | `FIXCMD01` | `FIX-CMD-01` |
| `FIX-DV-COMMANDE` | `FIXDVCOMMANDE` | `FIX-DV-COMMANDE` |

The detail services correctly queried the normalized key, so PostgreSQL returned “not found” even
though the list rows existed.

## Resolution

`normaliserReference()` now canonicalizes compact and hyphenated `FIX-CMD-*` and `FIX-DV-*` forms,
while preserving the existing `CM-*`/`DV-*` behavior. Regression coverage lives in
`NowTech-backend-/src/commun/reference.spec.ts`.

## Verification

- Backend reference and fixture specs: 61/61 passed.
- Command/devis service specs plus the normalization spec: 14/14 passed.
- Backend TypeScript check: passed.
- Backend build: passed.
- Authenticated live requests:
  - `GET /v1/commandes/FIX-CMD-01` → 200.
  - `GET /v1/devis/FIX-DV-COMMANDE` → 200.
- Admin order/quote API specs: 13/13 passed.

## Scope limits

The Nuxt `nostics` warning was not causal for the 404 and was not changed. Browser-level hydration
was not re-run because the backend endpoint and admin composable paths were verified directly; the
remaining browser warning is an independent development logging concern.

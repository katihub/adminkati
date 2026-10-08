# Local backend merge runtime state

## Question

Why did order details return 404 and banners fail to load after merging `origin/main` into the backend stock-management branch?

## Method

- Inspected the live local PostgreSQL schema, Prisma migration history, fixture records, and the public banner endpoint.
- Exercised `GET /v1/commandes/CM-FIX01` with a locally generated staff token and `GET /v1/vitrine/bannieres`.
- Replayed the versioned `sql/vitrine.sql` schema script twice and ran the targeted Jest suites.

## Findings

1. The order list contained obsolete `FIX-CMD-*` fixture records. Detail lookup normalizes only commercial `CM-*` references, so selecting one became a not-found lookup. The fixture replacement now deletes the complete old `FIX-CMD-*` and `FIX-DV-*` graph before writing the current `CM-FIX*` and `DV-FIX*` records.
2. Banner reads returned HTTP 500 because the local `vitrine.bannieres` table predated the merged replayable SQL and lacked `emplacement`. Replaying `sql/vitrine.sql` added the column, backfilled `principal`, and restored the endpoint.
3. The first replay stopped at `vitrine.points_vente` where a prior table shape lacked legacy `telephone` and `whatsapp` columns. The replay now recreates those compatibility columns idempotently before using its legacy-to-list transition.
4. Two retained Prisma migrations add `membres_equipe.comptoirs`. The newer retained migration is now idempotent, allowing a clean database to apply both histories without failing on the duplicate column.

## Evidence

- Before remediation, `GET /v1/vitrine/bannieres` returned HTTP 500; after replay it returned five banners with complete artwork URLs.
- After reseeding, the local database contains ten `CM-FIX01`–`CM-FIX10` orders and three `DV-FIX*` quotes; `GET /v1/commandes/CM-FIX01` returned the order with one line.
- `prisma migrate status` reports the database schema is up to date.
- Targeted Jest validation: 3 suites, 122 tests passed (`commandes.service`, `dev-fixtures`, and `vitrine.sql`).
- `pnpm install --frozen-lockfile`, `pnpm build`, and the complete serial Jest suite all passed: 93 suites and 1,926 tests.

## Recommendation

Keep `sql/vitrine.sql` in the deployment replay path after Prisma migrations, and use `pnpm dev:fixtures` when a local checkout receives the current fixture format.

## Scope limits

This assessment covered the local database and backend endpoints only. It did not execute an external deployment or test the authenticated browser BFF flow end to end.

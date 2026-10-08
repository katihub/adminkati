# Assessment: Backend Catalogue Schema Missing

## Question

Why does the backend return `42P01 relation "nowtech.produits" does not exist` when the products
page requests the catalogue?

## Method

Inspected the backend's Prisma schema, Docker Compose setup, startup commands, catalogue ingestion
script, and seed instructions. Ran read-only SQL checks against the local `nowtech-bd` container:
database identity, schemas, tables, Prisma migration history, roles, relation lookup, and
application-role visibility. No database import, schema creation, or destructive command was run.

## Findings

### 1. The error is an accurate missing-schema error

The local container is healthy and reports `nowtech` as the current database. Only the `boutique`
schema exists; `to_regclass('nowtech.produits')`, `to_regclass('arbitrage.propositions')`, and
`to_regclass('vitrine.bannieres')` all return null. Running the same lookup as `nowtech_app` fails
with `schema "nowtech" does not exist`.

### 2. Prisma migrations are not supposed to create the catalogue

`NowTech-backend-/prisma/schema.prisma:4-10` explicitly reserves `boutique` for Prisma and keeps
the catalogue in `nowtech`. The seed guide makes the same boundary explicit at
`NowTech-backend-/seed/LISEZMOI.md:7-12`: Prisma creates only `boutique`; `nowtech`, `arbitrage`,
and `vitrine` are external SQL-managed data.

The live database has all 10 Prisma migrations applied in `boutique._prisma_migrations`, so the
Prisma half of bootstrap completed successfully.

### 3. Local startup starts Postgres but does not load catalogue data

`NowTech-backend-/package.json:15-20` defines `bd:demarrer` as container startup plus a readiness
wait, while the local `start`/`dev` commands only start Nest. The production Docker entrypoint at
`NowTech-backend-/Dockerfile:67-77` runs `prisma migrate deploy` before Nest, which still affects
only the Prisma-managed `boutique` schema. Neither path runs the catalogue seed/import.

### 4. The required local seed dump is absent

`NowTech-backend-/seed/LISEZMOI.md:39-46` requires loading `seed/nowtech-seed.sql.gz` and then
replaying `sql/droits.sql`. The checkout contains the guide but no `seed/nowtech-seed.sql.gz`, so
the documented local catalogue bootstrap cannot currently be completed from this workspace alone.

### 5. This is not an auth, role, or search-path problem

The database contains both `nowtech` and `nowtech_app` roles; `nowtech_app` is a login role and the
database is reachable. The failing SQL names `nowtech.produits` explicitly, and the schema itself
is absent, so changing `search_path` or frontend authentication would not resolve this error.

## Recommendation

Keep the products page on its local mock source until the catalogue database is intentionally
bootstrapped. To restore backend reads later, an operator with the migration connection should:

1. Obtain the environment-appropriate `seed/nowtech-seed.sql.gz` dump.
2. Follow `seed/LISEZMOI.md:27-46`: apply Prisma migrations if needed, ensure `nowtech_app` exists,
   load the catalogue/arbitrage/vitrine dump, and replay `sql/droits.sql`.
3. Verify `select count(*) from nowtech.produits` through `DATABASE_URL` and verify the documented
   application privileges.
4. Only then switch the page back to API reads and test the authenticated BFF path.

Do not expect `prisma migrate deploy` to create `nowtech`, and do not use the vitrine's generated
catalogue file as a substitute for the authoritative seed without an explicit data decision.

## Scope limits

This assessment did not retrieve production data, create the missing schema, seed the database,
change backend code, or validate a live authenticated HTTP request against a populated catalogue.

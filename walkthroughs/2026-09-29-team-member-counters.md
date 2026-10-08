## What I built
Added durable `comptoirs` assignments for team members, including DTO validation, persistence, projections, journal details, authenticated caller/session responses, and point-of-sale deletion protection. Production first sign-in now canonicalizes the accepted account email before binding an invited member, and counter assignment/deletion share row locks to prevent dangling references. The Prisma client was regenerated and the reviewed migration was applied to the configured local database.

## Plan coverage
| Plan item | Status | Where |
| :-- | :-- | :-- |
| Durable Prisma field and migration | Done | `../../nvc/NowTech-backend-/prisma/schema.prisma:270`, `../../nvc/NowTech-backend-/prisma/migrations/20260929100053_membres_equipe_comptoirs/migration.sql:2` |
| DTO validation, validated persistence, projections, and journal detail | Done | `../../nvc/NowTech-backend-/src/equipe/equipe.dto.ts:56`, `../../nvc/NowTech-backend-/src/equipe/equipe.service.ts:64` |
| Authenticated caller and auth response scopes | Done | `../../nvc/NowTech-backend-/src/commun/garde/appelant.ts:24`, `../../nvc/NowTech-backend-/src/commun/garde/garde-appelant.ts:98`, `../../nvc/NowTech-backend-/src/auth/auth.service.ts:156` |
| Counter deletion protection and endpoint documentation | Done | `../../nvc/NowTech-backend-/src/vitrine/vitrine.service.ts:419`, `../../nvc/NowTech-backend-/src/vitrine/vitrine.controller.ts:316` |
| Planned proof at the database/API boundary | Done | `../../nvc/NowTech-backend-/src/equipe/equipe.dto.spec.ts`, `../../nvc/NowTech-backend-/src/equipe/equipe.service.spec.ts`, `../../nvc/NowTech-backend-/src/commun/garde/garde-appelant.spec.ts`, `../../nvc/NowTech-backend-/src/auth/auth.service.spec.ts`, `../../nvc/NowTech-backend-/src/vitrine/vitrine.service.spec.ts` |

## Deviations
The plan's literal migration command, `pnpm prisma:migrer -- --name membres_equipe_comptoirs`, prompted for a name and timed out because the extra `--` ended Prisma option parsing. `pnpm prisma:migrer --name membres_equipe_comptoirs` created and applied `20260929100053_membres_equipe_comptoirs` instead.

Prisma initially generated an unrelated `DROP TABLE "sales_goals"` because that pre-existing table is absent from `schema.prisma`. The committed migration was corrected to the planned additive `NOT NULL DEFAULT ARRAY[]::VARCHAR(40)[]` column. The local `sales_goals` table definition and grant were restored, `comptoirs` was made non-null, and the local migration checksum was synchronized to the reviewed SQL. Any `sales_goals` rows that existed before Prisma dropped the table cannot be recovered; their prior count was not captured.

The shared `Appelant` team variant now requires `comptoirs: string[]`; all typed team-caller fixtures were updated with the explicit whole-shop value, `[]`.

## Tests
`pnpm prisma:generer` completed and generated Prisma Client v6.19.3.

`pnpm test -- src/equipe/equipe.dto.spec.ts src/equipe/equipe.service.spec.ts src/commun/garde/garde-appelant.spec.ts src/auth/auth.service.spec.ts src/vitrine/vitrine.service.spec.ts` completed with 5 suites passed and 49 tests passed. It covers unlinked-invite production sign-in with case and whitespace variants, unknown replacement keys, and assignment/deletion interleaving in addition to the original persistence contract. The interleaving fixture models the required `FOR KEY SHARE`/`FOR UPDATE` compatibility and fails if either lock is removed.

`pnpm exec tsc --noEmit` and `pnpm build` completed successfully.

`pnpm test` completed with 24 suites passed, 2 failed; 212 tests passed and 11 failed. The failures are pre-existing and confined to `src/catalogue/administration.service.spec.ts` (10 assertions) and `src/main.spec.ts` (the `app.set` test-double incompatibility). No team-counter test failed.

`bunx vitest run test/nuxt/team-hire-dialog.test.ts test/nuxt/team-api.test.ts test/nuxt/team-workspace.test.ts` completed with 3 files passed and 19 tests passed.

`bun run lint` completed successfully. `bun run typecheck` is blocked by the concurrent session's unrelated untracked `test/unit/order-export-bff.test.ts`, which has four `http.createServer`/implicit-`any` errors; no feature file is named in its output and it was left unchanged.

`pnpm exec eslint "{src,test}/**/*.ts"` could not run: pnpm reported `Command "eslint" not found`. `pnpm lint` was not run because its script includes `--fix` and would modify the protected tests.

`pnpm exec prisma migrate status` reported 12 migrations found and `Database schema is up to date!`. A direct local query reported `sales_goals` present, 6 `membres_equipe` rows, all 6 with empty `comptoirs`, `comptoirs_nullable: "NO"`, and the expected empty-array default.

A throwaway script loaded the built `EquipeService` against the migrated local database, inserted a temporary counter, created a member assigned to it, reset the assignment to `[]`, and removed both temporary records. It printed `{"assigned":["r-e22cb31b-bf6f-44f9-88c3-b4d52893c165"],"reset":[]}`.

A second throwaway script used two real PostgreSQL clients. It paused a real `EquipeService.modifier()` after its `FOR KEY SHARE` validation, confirmed `VitrineService.supprimerPointVente()` blocked on its `FOR UPDATE` lock, then released the update and confirmed deletion was refused by the new member reference. It printed `{"deletionBlocked":true,"deletionRefused":true,"comptoirs":["r-dd3c8039-51db-4d4c-a71d-eb349da5e002"]}` and removed its temporary records.

`git diff --check` completed with no output.

## Not done
No frontend source was changed. The backend's existing catalogue and application-bootstrap failures remain out of scope; the team-counter focused suite is green.

## Notes for the reviewer
The first independent review found the initially missing first-login and concurrency coverage; both were corrected in a second red-green cycle. The remediation review then found the case-normalization and lock-fixture gaps; both were corrected and re-verified against PostgreSQL. Review the local migration recovery carefully, especially the unrecoverable possibility of pre-existing `sales_goals` row loss after Prisma's generated SQL was first applied. The committed migration is limited to the additive `comptoirs` column; the local `sales_goals` table definition and grant were restored before verification.

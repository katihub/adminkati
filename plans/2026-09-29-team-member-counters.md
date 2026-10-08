# Team Member Counter Assignments

## Goal

Persist the `vitrine.points_vente.cle` values selected for a team member so the existing admin
counter pickers survive creation, update, list/detail reads, and a subsequent sign-in. Today the
frontend already sends and renders `TeamMember.comptoirs: string[]`, but `MembreEquipe` has no
column and the backend silently has nowhere to retain or return the values.

Implementation is primarily in [`../../nvc/NowTech-backend-`](../../nvc/NowTech-backend-). The
admin frontend's types, picker components, mutations, and generic BFF already carry this contract;
no frontend source change is planned.

## Confirmed Decisions

- Store `comptoirs` as `String[]` on `MembreEquipe`, mapped to a non-null
  `VARCHAR(40)[] DEFAULT ARRAY[]::VARCHAR(40)[]` column. `[]` means the member covers the whole
  shop; it is never equivalent to no access.
- Do not introduce a join table. Counter keys are immutable value references, have no
  per-assignment metadata, and live in the separately managed `vitrine` schema. That schema is
  deliberately not a foreign-key target because it is independently maintained; the same loose
  key pattern already backs orders, profiles, and addresses.
- Validate supplied keys against existing `vitrine.points_vente.cle` values in the service layer.
  This preserves the loose schema boundary without allowing a direction user to persist arbitrary
  strings. The check requires existence, not `active = true`: a closed counter can remain attached
  to an old member record and must not make an otherwise valid profile edit impossible. The existing
  frontend picker already offers active counters only for new choices.
- `POST` omission becomes `[]`; `PATCH` omission preserves the stored assignment; `PATCH` with
  `[]` explicitly restores whole-shop coverage. `null`, duplicate entries, blank keys, values over
  40 characters, non-strings, and more than 50 entries are invalid input.
- Keep the existing `POST /equipe/membres` and `PATCH /equipe/membres/:id` routes and their
  `@Roles(direction)` guard. Expanding their body DTOs is the controller wiring already used by
  Nest; no second assignment endpoint or controller route is needed.
- Extend the authenticated `Appelant` value and `/v1/moi` output with the stored list. The
  frontend login handler already copies that field into its sealed session. This plan does not add
  new order/cash authorization rules; it only makes the existing perimeter contract truthful and
  durable.

## Reuse And API Seams

| Existing seam | Current role | Planned contract |
| :-- | :-- | :-- |
| `POST /v1/equipe/membres` | Hires a member through `InscrireMembreDto` and `EquipeService.inscrire()` | Accept optional `comptoirs`; store supplied keys or `[]`; return the member projection with `comptoirs`. |
| `PATCH /v1/equipe/membres/:id` | Updates `ModifierMembreDto` through `EquipeService.modifier()` | Accept optional replacement `comptoirs`; omitted preserves, `[]` clears restrictions; return canonical projection with `comptoirs`. |
| `GET /v1/equipe/membres`, `GET /v1/equipe/membres/annuaire`, `GET /v1/equipe/membres/:id`, `POST /v1/equipe/membres/:id/reactiver` | Compatibility list, directory list, detail, and lifecycle reads | Include `comptoirs: string[]` in every team-member projection. |
| `GET /v1/moi` | Returns the request-time `Appelant`; the frontend login endpoint uses it to construct a session | Return the caller's persisted `comptoirs`, including `[]`, after every sign-in. |
| `POST /v1/auth/connexion`, `POST /v1/auth/rafraichir` | Alternate backend session contract that already returns role data | Return the same `comptoirs` field in normal, local-development, and refresh responses. |
| `DELETE /v1/vitrine/administration/points-vente/:id` | Refuses to remove a key referenced by durable boutique data | Also count team members whose array `has` the key, then include that count in the conflict decision/message. |
| `server/api/v1/[...path].ts` | Authenticated generic BFF proxy | No change. It already forwards the existing team endpoints and JSON bodies. |

The frontend's existing `HireTeamMemberInput`, `UpdateTeamMemberInput`, `TeamMember`,
`TeamHireDialog`, `TeamMemberDetails`, and `useTeamMutations()` remain the clients of these
contracts. Their payload shape is already correct:

```ts
type CreateMemberBody = {
  courriel: string
  nom: string
  roles: TeamRole[]
  telephone?: string
  comptoirs?: string[] // omitted is []
}

type UpdateMemberBody = {
  roles?: TeamRole[]
  nom?: string
  telephone?: string | null
  comptoirs?: string[] // omitted preserves; [] means whole shop
}
```

## Implementation Plan

### 1. Add the durable Prisma field and migration

**Where:**

- `../../nvc/NowTech-backend-/prisma/schema.prisma`
- `../../nvc/NowTech-backend-/prisma/migrations/20260929000000_membres_equipe_comptoirs/migration.sql` (new, generated then reviewed)

**What changes:**

1. Add a documented `comptoirs String[] @default([]) @db.VarChar(40)` field to
   `MembreEquipe`, immediately beside the other staff scope/contact fields.
2. Generate a committed Prisma migration named `membres_equipe_comptoirs`; verify its SQL adds a
   non-null `VARCHAR(40)[]` column with a constant empty-array default so every existing member
   receives whole-shop semantics without a data backfill or null state.
3. Regenerate Prisma Client after the schema is final. Do not add a cross-schema foreign key or an
   index: the normal access path is one member row by ID, while the infrequent counter-deletion
   guard can use PostgreSQL's array containment predicate.

**Done when:** applying the migration to a populated local database leaves existing
`membres_equipe` rows with `{}`, Prisma exposes `membreEquipe.comptoirs` as `string[]`, and
`pnpm prisma:generer` completes from the committed schema and migration.

### 2. Validate, persist, project, and audit assignments through the existing team endpoints

**Where:**

- `../../nvc/NowTech-backend-/src/equipe/equipe.dto.ts`
- `../../nvc/NowTech-backend-/src/equipe/equipe.service.ts`
- `../../nvc/NowTech-backend-/src/equipe/equipe.controller.ts` (existing route/DTO seam; no new route)

**What changes:**

1. Add `comptoirs` to both member body DTOs. Transform string entries by trimming them, validate
   the array's optional-but-not-null distinction, limit it to 50 unique strings, and validate each
   key at 1--40 characters. Do not use `ArrayNotEmpty`, because `[]` is the intentional
   whole-shop value.
2. In `EquipeService`, perform one parameterized lookup of the supplied distinct keys in
   `vitrine.points_vente` before a create or a replacement update. Reject missing keys with `400`
   before either a member write or journal entry. Skip the lookup for an omitted patch or an empty
   list.
3. Write `dto.comptoirs ?? []` on creation. On modification, include `comptoirs` in Prisma update
   data only when it is not `undefined`, so ordinary contact/role updates cannot erase a scope.
4. Add `comptoirs` to `SELECT_CANONIQUE`, the compatibility `lister()` select, the create response
   select, and every read/lifecycle response that already uses those projections. Preserve the
   existing hidden `userId` and `ajoutePar` boundary.
5. Read the previous array with the update's audit snapshot and append the before/after arrays to
   `equipe.modifie`; include the assigned array in `equipe.inscrit`. A successful scope change and
   its journal entry remain one transaction.
6. Retain the controller's current `@Body() InscrireMembreDto` and `@Body() ModifierMembreDto`
   signatures, forwarding, UUID parsing, and `@Roles(Role.direction)` decorators. Those handlers
   automatically bind the expanded DTOs; adding a route would duplicate and weaken the existing
   authorization seam.

**Done when:** creation with `comptoirs: ["Akwa"]` stores and returns that exact list, all list and
detail reads expose it, a patch with `[]` returns `[]`, an omitted patch retains the prior list,
and malformed/unknown input reaches neither Prisma update/create nor `JournalService.consigner()`.

### 3. Make the saved perimeter available to authenticated callers

**Where:**

- `../../nvc/NowTech-backend-/src/commun/garde/appelant.ts`
- `../../nvc/NowTech-backend-/src/commun/garde/garde-appelant.ts`
- `../../nvc/NowTech-backend-/src/auth/auth.dto.ts`
- `../../nvc/NowTech-backend-/src/auth/auth.service.ts`
- `../../nvc/NowTech-backend-/src/sante/sante.controller.ts` (verification target; it already returns `Appelant` unchanged)
- `../../nvc/NowTech-backend-/src/equipe/equipe.controller.ts` (verification target for the existing protected write seam)

**What changes:**

1. Make `comptoirs: string[]` part of the `equipe` variant of `Appelant`. Have
   `GardeAppelant.identifier()` select it from `MembreEquipe` and return it on every authenticated
   staff request, so the existing `/v1/moi` controller exposes the current database value without
   another lookup or route.
2. Extend the backend's `SessionDto` and the three `AuthService` read paths (`contexte`, local
   login, local refresh) to select and return the array with roles. This keeps direct backend auth
   responses aligned with `/v1/moi` and avoids a second stale perimeter contract.
3. Update all typed backend test caller fixtures for the newly required `Appelant.comptoirs` field:
   `src/equipe/equipe.service.spec.ts`, `src/profil/profil.service.spec.ts`,
   `src/statistiques/statistiques.service.spec.ts`, `src/statistiques/statistiques.roles.spec.ts`,
   `src/statistiques/statistiques.catalogue-summary.spec.ts`, `src/devis/devis.service.spec.ts`,
   `src/commandes/commande-export.controller.spec.ts`, `src/commandes/commandes.service.spec.ts`,
   `src/couts/couts.service.spec.ts`, and `src/caisse/caisse.service.spec.ts`.

**Done when:** an active team caller read by the guard has `comptoirs` as an array, `/v1/moi` returns
the same list including `[]`, direct login/refresh responses carry it, and all existing typed
`Appelant` fixtures compile without making the field optional again.

### 4. Preserve the loose counter-reference deletion invariant

**Where:**

- `../../nvc/NowTech-backend-/src/vitrine/vitrine.service.ts`
- `../../nvc/NowTech-backend-/src/vitrine/vitrine.controller.ts`

**What changes:**

1. Extend `supprimerPointVente()`'s existing parallel reference counts with
   `membreEquipe.count({ where: { comptoirs: { has: point.cle } } })`.
2. Include the team-member count in the total and refusal explanation so a key cannot be deleted
   while it still grants a member a persisted perimeter. Update the endpoint description's three
   reference types to the four actual checks.
3. Do not cascade, clear, or rewrite assignments when a point is deactivated or deleted. Deletion
   remains refused; deactivation retains history and does not force an unrelated employee-edit
   migration.

**Done when:** deleting a counter referenced only by a team member returns the same conflict class
as order/profile/address references and never issues the raw delete; an unreferenced counter still
deletes normally.

### 5. Prove the database/API boundary before implementation is declared complete

**Where:**

- `../../nvc/NowTech-backend-/src/equipe/equipe.dto.spec.ts` (new)
- `../../nvc/NowTech-backend-/src/equipe/equipe.service.spec.ts`
- `../../nvc/NowTech-backend-/src/commun/garde/garde-appelant.spec.ts` (new)
- `../../nvc/NowTech-backend-/src/vitrine/vitrine.service.spec.ts`
- `test/nuxt/team-hire-dialog.test.ts` (existing regression target)
- `test/nuxt/team-api.test.ts` (existing regression target)
- `test/nuxt/team-workspace.test.ts` (existing regression target)

**What changes:**

1. Start red with DTO tests for accepted omitted/empty/non-empty lists and rejected `null`,
   duplicates, blank/oversized entries, non-array input, excess entries, and unknown DTO keys under
   the application's whitelist settings. These test the application boundary, not
   `class-validator` internals.
2. Extend the team-service fixture and tests to prove create defaults to `[]`, create and patch
   persist a known list, an omitted patch preserves it, `[]` replaces it, every canonical/list
   projection returns it, invalid keys produce no write/audit, and journal details retain both
   scope states. Retain the final-direction and self-edit protections as regressions.
3. Add a focused guard test with a mocked verified staff member to prove the database list becomes
   the `Appelant` returned by `/v1/moi`; cover both a restricted list and `[]`. Do not add a
   tautological `SanteController.moi()` test that only repeats its return statement.
4. Add the fourth Vitrine deletion fixture count and a member-reference refusal case, preserving
   existing order/profile/address cases.
5. Run the existing frontend component/API tests unchanged against their endpoint contracts. They
   already prove hiring sends selected keys, member detail sends the whole replacement list, and
   the UI reads `[]` as whole-shop coverage; they must remain green without UI rewrites.

**Done when:** the new backend tests demonstrate functional persistence, malformed-input rejection,
and no dangling counter reference, while the frontend regression suite still observes its current
payload and whole-shop semantics.

## States And Failure Policy

| Condition | Required result |
| :-- | :-- |
| `POST` omits `comptoirs` | Persist and return `[]` for whole-shop coverage. |
| `PATCH` omits `comptoirs` | Preserve the stored list. |
| `PATCH` sends `[]` | Persist and return `[]`; it is an explicit scope reset, not an error. |
| `POST` or `PATCH` contains null, duplicates, blank/long/non-string keys, or over 50 keys | `400`; no mutation or audit entry. |
| A syntactically valid key is absent from `vitrine.points_vente` | `400`; no mutation or audit entry. |
| Member ID is unknown | Existing `404`; no scope side effect. |
| Member update/create audit fails | Existing transaction behavior rolls back the scope write. |
| A previously assigned counter is inactive | The assignment remains readable and editable; UI continues not to offer inactive counters for new selection. |
| A counter is still present in any member array | Counter delete is refused with `409`; deactivation remains the safe lifecycle action. |
| A staff member next signs in or refreshes | `/v1/moi` and backend session responses expose the persisted array; the existing frontend session stores it. |

There is no new frontend loading, empty, or error surface: existing hiring/detail mutation pending
states and API-error presentation already handle the same `POST`/`PATCH` calls. The backend adds
only normal validation errors, surfaced through those existing paths.

## Migration And Deployment Strategy

1. On a local owner-connected database, run
   `pnpm prisma:migrer -- --name membres_equipe_comptoirs`, inspect the generated SQL, commit it
   with `schema.prisma`, then run `pnpm prisma:generer`. Confirm a pre-existing team row reads an
   empty array after migration.
2. Deploy the migration before code that requires the field. The additive, defaulted column is
   backward-compatible with an old application process, while new code assumes a non-null array.
   No data export, downtime migration, or row-by-row backfill is required.
3. Production must keep using the committed migration through the image's existing
   `prisma migrate deploy` entrypoint and `DATABASE_URL_MIGRATION`; never run `migrate dev` in a
   container. The application role's table-level privileges already cover the added column, but
   verify the deployed service can read/write it before cutting traffic over.
4. Roll back application code separately if needed. Do not drop the column as a routine rollback:
   once a member scope is assigned, dropping it destroys authorization-relevant history.

## Risks And Earliest Checks

| Risk | Earliest check |
| :-- | :-- |
| Prisma emits a nullable/text array or loses the empty default | Inspect the generated migration and query a migrated legacy row before service work begins. |
| `[]` is accidentally rejected or treated as no access | DTO/service tests plus the unchanged frontend whole-shop regression. |
| A partial PATCH erases a prior assignment | Service test that edits only contact/name fields after seeding a restricted array. |
| A direction user saves an invented counter key | Parameterized Vitrine lookup test that proves no Prisma write or journal call follows a missing key. |
| A future point deletion leaves a stale permission reference | Vitrine member-reference refusal test and updated controller documentation. |
| Session data remains stale after persistence exists | Guard test for `/moi` and direct auth response tests for login/refresh. The current browser session updates on its normal next authentication cycle; this plan does not add live session-push behavior. |
| The migration runs under the application role or races generated schema/client code | Use the owner direct URL for local migration, commit generated SQL, and let the existing production entrypoint run `migrate deploy` before Nest starts. |

## Validation Commands

Run in `../../nvc/NowTech-backend-`:

```bash
pnpm prisma:migrer -- --name membres_equipe_comptoirs
pnpm prisma:generer
pnpm test -- src/equipe/equipe.dto.spec.ts src/equipe/equipe.service.spec.ts src/commun/garde/garde-appelant.spec.ts src/vitrine/vitrine.service.spec.ts
pnpm lint
pnpm build
pnpm test
```

Run in this admin worktree:

```bash
bunx vitest run test/nuxt/team-hire-dialog.test.ts test/nuxt/team-api.test.ts test/nuxt/team-workspace.test.ts
bun run typecheck
bun run lint
```

## Out Of Scope

- A new frontend picker, a new BFF endpoint, or a second team assignment endpoint.
- A join model, foreign key, counter-key rename feature, or per-assignment metadata such as shifts,
  start dates, or primary-counter ordering.
- Enforcing counter perimeters in order, payment, quote, delivery, or reporting services. This plan
  supplies durable, request-time caller data; any new authorization rule requires a separate
  behavior-specific plan.
- Automatically detaching members when a counter is deactivated, bulk reassignment, or historical
  scope versions.

## Open Questions

None blocking. The plan deliberately adopts existence-only key validation and preserves assignments
to inactive counters; requiring active-only keys or automatically detaching closed-counter members
would change lifecycle and authorization behavior beyond the requested persistence wiring.

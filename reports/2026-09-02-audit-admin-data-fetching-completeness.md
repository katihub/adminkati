# Audit — admin data-fetching completeness

**Date:** 2026-09-02  
**Question:** What data-fetching work remains before the admin panel can move primarily into UI implementation?

## Method

Inspected the dirty frontend implementation in `app/composables/`, `app/types/api/`,
`server/api/`, and the existing API tests; the current admin navigation and overview plans; and the
backend repository at local `main` commit `3100ab9`. Compared backend controllers, DTOs, services,
Prisma schema, and SQL with the client contracts and query/mutation surface.

This audit did not review visual fidelity, browser layout, component accessibility, or implement any
backend change. It also did not treat Swagger as authoritative where controller and service source
was available.

## Executive finding

The current client data layer is a useful partial foundation, but it is not yet complete enough for
the UI pass. The most important gap is that the overview still reads deterministic mock data rather
than a backend statistics endpoint. The next largest client gap is the entire caisse read and
reconciliation surface. Several requested management/filter capabilities are not present in the
backend at `3100ab9`, so they require backend contract work before a truthful frontend integration
can be written.

## Findings

### 1. Major — overview data is still mock-backed

`server/api/v1/statistiques/apercu.get.ts:1-29` authenticates the request but builds the response
from `server/utils/apercu-mock.ts`. There is no `statistiques` controller or `apercu` route in the
backend source at `3100ab9`, while `app/types/api/statistiques.ts:73-92` presents the mock shape as
the application contract.

The previous backend specification also records that sales objectives, cost of goods, stock
quantity/history, and role-specific omission of monetary fields cannot currently be derived from the
backend schema. Therefore the UI pass cannot honestly start from “real dashboard data” until the
backend endpoint and its role-safe response contract exist, or the overview is explicitly accepted
as a temporary mock surface.

### 2. Major — caisse fetching and reconciliation are absent from the client

There is no caisse type file or composable in the admin. The backend exposes:

- `GET /caisses`, optionally filtered by status (`src/caisse/caisse.controller.ts:28-32`)
- `GET /caisses/encours` (`:34-39`)
- `GET /caisses/:id` (`:41-45`)
- `POST /caisses/:id/compter`, `/ecart`, and `/valider` (`:47-73`)
- payment collection at `POST /commandes/:reference/encaisser` (`:16-26`)

Only the last operation is currently represented in `app/composables/useOrderMutations.ts`. The
overview's caisse health and any future caisse screen would otherwise remain disconnected from the
backend.

### 3. Major — catalogue state and proposal moderation are absent

Product reads and product mutations exist, but there is no client contract/query for
`GET /catalogue/etat`, no proposal list query, and no accept/refuse mutation for the routes at
`src/catalogue/administration.controller.ts:257-294`. These are backend-supported operations and
must be completed before the product UI is built.

The existing product contract is also stale: `ProductHistoryEntry.id` is still a string and omits
the nullable numeric `lot_id`, despite the backend serialization fix in
`src/catalogue/administration.service.ts:193-218`.

### 4. Medium — several existing contracts are broader or less precise than the backend

`ConfirmOrderResult` and `AdvanceOrderResult` currently alias `CommandeDetail`, although the backend
returns narrower payloads for confirmation and advancement. This can make later UI code depend on
fields that are not returned. The types need to distinguish list, detail, confirmation, advancement,
and payment results.

The current query/mutation tests cover the happy paths, but the boundary suite still needs the
revised numeric history fixture, proposal pagination/decision behavior, mutation 403 branches, and
the exact 5,000,000-byte proxy boundary.

### 5. Major — requested customer administration is not available in the backend

The backend currently provides only customer search and detail:
`GET /clients` and `GET /clients/:id` at `src/profil/profil.controller.ts:88-105`. Search is trimmed,
requires three characters, and is capped at 25 rows in `src/profil/profil.service.ts:247-315`.

There is no customer directory endpoint, pagination contract, sort contract, or team-side customer
management mutation. The existing `useCustomerSearch` and `useCustomer` composables cover only the
operations that exist today; they cannot complete the requested directory/management surface without
new backend routes and response contracts.

### 6. Major — requested taxonomy administration exceeds the backend contract

The backend supports one combined taxonomy read, category/rayon patch, and taxonomy recalculation
(`src/catalogue/administration.controller.ts:198-255`). It does not expose category/rayon create or
delete, or brand CRUD. Brands are derived read-only data from the combined taxonomy response.

The current client correctly exports no unsupported brand mutation, but the requested broader scope
requires backend operations first. Adding invented client routes would make the UI appear complete
while every write fails.

### 7. Major — requested team administration exceeds the backend contract

The backend supports the team list, create, patch, and deactivate routes at
`src/equipe/equipe.controller.ts:24-59`. It has no member detail route, search, pagination,
reactivation, or nullable-field clearing semantics. The current client covers only the supported
operations. The expanded scope requires explicit backend DTO/route behavior before client types and
queries can be finalized.

### 8. Major — requested order search/pagination/sort are not available

The team order route accepts only an optional status at
`src/commandes/commandes.controller.ts:33-38`; the service hard-limits the result to 100 rows.
There is no search, page, page size, sort, or cursor response. The current `useOrders` accurately
models the existing status filter, but cannot satisfy the expanded list contract until the backend
adds it.

### 9. Major — receipt access has an audience mismatch

The backend has `POST /commandes/:reference/recu` at
`src/commandes/commandes.controller.ts:60-74`, but the service documents and enforces it as a
client-only confirmation. The admin application's authenticated session is a team session, and the
route has no admin role contract. “Client receipt access” therefore needs a clear backend audience
and authorization response before an admin composable can be added without weakening ownership
checks.

### 10. Medium — raw product-image upload remains an acceptance blocker

The client transport preserves raw bytes and content type, but the backend mounts its raw parser at
`/catalogue/administration` while the global API prefix is `/v1`. The current client operation may be
correct while the actual backend request still fails to parse the body. End-to-end verification is
required before calling image fetching/mutation complete.

### 11. Medium — query-key and auth-boundary coverage is incomplete

The query-key foundation currently covers products, taxonomy, orders, customers, and team, but not
catalogue state, proposals, caisse, or statistics as shared constants. The mutation cache has been
added, but tests still need to prove both 403 outcomes: a deactivated account is cleared and a valid
session with an insufficient role remains authenticated. The authored taxonomy-array assertion must
remain removed; cache relationships should be tested behaviorally.

## What is already covered

The current dirty implementation already provides partial client plumbing for:

- same-origin SSR reads and CSRF-protected writes through the BFF;
- query-cache auth failure handling for queries and mutations;
- product list/detail and product writes;
- combined taxonomy read and supported taxonomy writes;
- team order list/detail, confirmation, state advancement, and payment collection;
- customer search/detail with short-query gating;
- team list/create/update/deactivate with invalidation after partial responses.

These are foundations, not a completion claim: their contracts and boundary tests still need the
corrections above.

## Recommended completion order

1. Finish NVC-48 boundary tests and correct the existing contracts.
2. Add caisse types, query keys, reads, and reconciliation mutations.
3. Add catalogue state and proposal queries/decisions, then complete product-history typing.
4. Add the missing client operations only after backend contracts exist: customer directory and
   management, taxonomy create/delete and brand CRUD, team detail/search/pagination/reactivation/
   nullable clearing, order search/pagination/sort, and receipt access.
5. Replace the overview mock route with the real backend statistics contract, including role-safe
   omission of monetary data and a decision for fields the schema cannot currently compute.
6. Run the full client quality gates and write the implementation walkthrough before beginning UI
   construction.

## Scope boundary for the next implementation pass

Keep the existing security architecture: no browser bearer tokens, direct backend URLs, broad cookie
forwarding, Pinia-owned server data, or optimistic replacement from partial responses. Those are
constraints on how the data layer is built, not missing features.

The following backend domains were inspected but are not current admin navigation consumers and were
not expanded into this recommendation: client-owned devis routes, public/admin vitrine banner routes,
and public catalogue verification. They should receive separate data-layer work if the product adds
those admin surfaces.

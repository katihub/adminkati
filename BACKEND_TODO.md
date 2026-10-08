# Backend TODO

Findings in [`NowTech-backend-`](https://github.com/New-Vision-Creatives) that cannot be resolved in
the admin panel. They are recorded here as backend-owned blockers so they are not lost.

**We do not work on the backend.** It is read as a source of truth and never modified
(`plans/2026-09-01-auth-and-data-infrastructure.md` §2.3). The admin must integrate only the
operations the backend actually provides; it must not invent pagination, mutations, or security
boundaries in the frontend. If ownership of the backend changes, this is the pick-up list.

Every finding was verified against the source at `../NowTech-backend-` or against the running
deployment. The NVC-19 findings below were checked on **2026-09-01**; the admin integration findings
in §8 were checked against backend commit `3100ab9` on **2026-09-02**. Citations are file:line at the
date of each check.

**Before acting on any of this, re-verify.** Backend source changes and deployment state can move
the cited line numbers; the current admin integration baseline is recorded in §8.

---

## 1. No response types anywhere in the OpenAPI spec

**Severity: high.** It is the reason we hand-write every API type.

`nest-cli.json:9` enables the `@nestjs/swagger` CLI plugin, which introspects **DTO classes**. Request
bodies are therefore fully typed — 20 named schemas across 23 operations. But the plugin cannot infer
a return type from `return this.service.lister()`, and there is **not one `@ApiOkResponse` or
`@ApiProperty` in the tree** (`grep` → 0 matches).

Measured across all 58 operations:

| Response schema | Count |
| :-- | :-- |
| `{"type":"object"}` — no properties | 27 |
| none at all | 28 |
| `{"type":"array","items":{"type":"object"}}` | 2 |
| genuinely typed (the Terminus health check) | 2 |

**Why it matters.** A generator renders `{"type":"object"}` as `Record<string, never>`, which is
*worse* than `unknown`: `data.nom` becomes a type **error** rather than an unchecked access. This is
what killed codegen for us.

**The fix, if it ever happens:** `@ApiOkResponse({ type: … })` on the 58 handlers, with response DTO
classes for the plugin to introspect. That would make a generated client viable and would let us
delete `app/types/api/` entirely.

**What we do instead, permanently:** hand-write types in `app/types/api/<domain>.ts`, each carrying a
citation comment naming the backend file and line. See §11.3 of the plan.

---

## 2. No exception filter, no error codes, hardcoded French prose

**Severity: high.** It is the reason our error layer translates by HTTP status rather than by cause.

`grep -rn "ExceptionFilter\|useGlobalFilters\|@Catch" src` → **0 matches**. Errors are Nest defaults:

```json
{ "message": "Authentification requise", "error": "Unauthorized", "statusCode": 401 }
```

Every message is hardcoded French prose with no machine-readable code — `'Aucun champ à modifier.'`,
`'Cette caisse est déjà validée.'`, `'Choisissez une adresse de livraison.'`. Accents are inconsistent
between call sites (`'Acces refuse'` next to `'Cette caisse est déjà validée.'`).

**Why it matters.** The admin panel is bilingual. There is nothing stable to map a message onto, so
the only signal we can translate is the status code. The result is a translated headline with a French
detail line underneath — for an English-speaking user, permanently.

**The fix, if it ever happens:** a global exception filter emitting stable codes
(`CAISSE_DEJA_VALIDEE`), with the French prose kept as a fallback. The frontend would map each code to
an i18n key on its side.

**What we do instead, permanently:** `app/utils/api-error.ts` maps status → i18n key, and shows
`e.data.message` verbatim as the detail. See §3.11.

---

## 3. The global throttler is 10 req/s shared by every caller on earth

**Severity: high, and it is live today.** This is the one item on this list that is a real production
problem right now rather than an inconvenience for us.

`src/app.module.ts:49-55` registers three windows: **10 req/s, 120/min, 1000/hour**. It runs *before*
the auth guard (`app.module.ts:71-75`).

`ThrottlerGuard`'s default tracker is `getTracker(req) { return req.ip }` — verified in the backend's
own `node_modules` — and `grep -rn "trust proxy" src` returns **nothing**. With Express behind
Traefik, `req.ip` is therefore **the proxy's container address for every caller**, so the entire
internet already shares one bucket.

**Why it matters.** One SSR render prefetching six queries spends 6 of the 10 requests available that
second. Two people loading a dashboard in the same second get 429s that look like an outage. The
1000/hour window is the harder ceiling — a five-person team refetching on focus can reach it in an
afternoon.

**The fix, if it ever happens:** `app.set('trust proxy', 1)` plus a caller-keyed tracker
(`getTracker` returning the authenticated `sub`, falling back to the real IP). Our BFF **already
forwards `x-forwarded-for`**, so this would start working the moment someone made the change — no
frontend work required.

**What we do instead, permanently:** treat it as a hard ceiling. Prefetch only above-the-fold queries;
a six-query dashboard is a design error, not a tuning problem.

---

## 4. Nothing sends invitations, so a new hire cannot obtain a password

**Severity: high. This is a product hole, not a technical one**, and it cannot be closed from the
frontend either.

`membres_equipe` carries `invitLe` and `premiereConnexionLe` (`prisma/schema.prisma:248-249`), and the
guard links a Supabase account to a pre-registered email on first authenticated request
(`garde-appelant.ts:96-99`, `107-113`). The counter can register a hire's email before they ever sign
in. But **no flow anywhere sends that person an invitation or lets them set a password.**

Until one exists, every team member must already have a Supabase account created out of band — by
hand, in the Supabase dashboard.

**The fix, if it ever happens:** either a backend endpoint calling Supabase's invite/magic-link admin
API, or a documented manual runbook. It will surface the first time someone is hired.

---

## 5. `deactivated` and `wrong role` are indistinguishable to a client

**Severity: low. This one is deliberate, and arguably correct.**

`garde-appelant.ts:60-72` returns the identical `'Acces refuse'` for a wrong caller type and for an
insufficient role — with a comment at 61-63 explaining why: distinguishing them would let a shop
customer map the staff surface.

**Why it matters to us.** A deactivated member and a member merely lacking a role both see `403`, and
those need opposite handling — one should be signed out, the other should stay on the page.

**We already have a workaround that does not need a backend change**, and it works precisely because
of `garde-appelant.ts:53/55/102`: `identifier()` runs *before* the public check, so an inactive member
gets 403 even on `@Publique()` routes. Probing `/v1/moi` therefore discriminates cleanly. See §3.12.

**No fix wanted.** Recorded only so nobody "improves" the guard by making the two distinguishable —
that would be a regression, and it would silently break our probe.

---

## 6. The backend checkout and generated auth documentation have drift

**Severity: medium, and it is a process/documentation issue rather than a runtime auth defect.**

On 2026-09-02 the backend checkout was at local `main` commit `3100ab9`, two commits ahead of its
`origin/main` at `6e108d7`. The current controllers use `@ApiBearerAuth('supabase')`, while the local
`src/main.ts:66-74` registers the generated bearer scheme as `supabase-jwt`. The generated docs can
therefore describe authentication inconsistently even though the runtime guard still uses the
actual bearer request.

The admin plan deliberately does not use this generated response contract. It reads controllers,
DTOs, services, Prisma schema, and SQL directly; the current product detail projection fix and
numeric proposal-id casts are recorded in §8.

---

## 7. Smaller notes

| | Finding | Evidence |
| :-- | :-- | :-- |
| 7.1 | `/v1/profil` is **client-only** (`exigerClient`). There is no team-member profile endpoint; `/v1/moi` is what the admin panel uses. | `src/profil/profil.controller.ts:44-46` |
| 7.2 | The audit journal reads `x-forwarded-for` and `user-agent` off the request, in five controllers. Behind any BFF these become the proxy unless forwarded — and the journal is **append-only**, so a wrong actor cannot be corrected later. Our proxy forwards both. | `src/equipe/equipe.controller.ts:66-73`, plus `caisse`, `devis`, `commandes`, `profil` |
| 7.3 | The OpenAPI JSON is at `/docs/openapi.json`, **not** `/docs-json`. YAML at `/docs/openapi.yaml`. The docs tree answers anonymous callers. | `src/main.ts:76-81`, `garde-appelant.ts:81-83` |
| 7.4 | CORS is a closed allowlist. Allowed headers are `Content-Type`, `Authorization`, `Cle-Idempotence` — **anything else we try to send will be rejected**. | `src/main.ts:41-48` |
| 7.5 | Deployment is a **single container**, Traefik-fronted, no replicas. Our refresh single-flight lock depends on this and breaks silently if it ever changes. | `deploiement/compose.yml:20-24` |

---

## 8. Admin resource integration blockers (2026-09-02)

Verified for the planned API integration of products, categories, departments, brands, orders,
customers, and team members. These limit the operations the admin can expose; they are not frontend
workarounds to implement.

The previous product-detail serialization failure is resolved in backend commit `3100ab9`: the detail
query no longer selects the generated `tsvector` column, and proposal `id`/`lot_id` values are cast
to integers. It is not a current blocker, but the frontend contract must use numeric history IDs.

| Resource | Blocker | Backend evidence |
| :-- | :-- | :-- |
| Product image upload | The raw parser is mounted at `/catalogue/administration`, while the API global prefix is `v1`; a real `/v1/catalogue/administration/**` image request must be verified before the admin claims end-to-end upload support. | `src/main.ts:19-32`, `src/main.ts:62-65`, `src/catalogue/administration.controller.ts:142-175` |
| Products | Clearing a product's primary category is inconsistent: `categorie_principale_id: null` is accepted, but the existing category association is retained during relationship replacement. | `src/catalogue/administration.dto.ts:91-127`, `src/catalogue/administration.service.ts:253-279`, `src/catalogue/administration.service.ts:638-643` |
| Categories | There is no category create or delete endpoint; only patching an existing category is supported. | `src/catalogue/administration.controller.ts:217-225` |
| Departments (rayons) | There is no department create or delete endpoint; only patching an existing department is supported. | `src/catalogue/administration.controller.ts:228-237` |
| Brands | Brands are derived taxonomy data. There is no brand-specific create, update, or delete operation. | `src/catalogue/administration.controller.ts:198-205`, `src/catalogue/administration.service.ts:395-408` |
| Orders | The team order list has no search, pagination, or sorting contract and is hard-capped to the newest 100 orders. It also omits customer display data and outstanding balance. | `src/commandes/commandes.controller.ts:33-38`, `src/commandes/commandes.service.ts:554-572` |
| Orders | Any authenticated team member can request order detail even though the list excludes some roles. The authorization boundary must be made consistent before the admin grants role-based detail access. | `src/commandes/commandes.controller.ts:40-43`, `src/commandes/commandes.service.ts:575-589` |
| Quotes | Resolved in backend commit `dafeee6`: `DELETE /devis/:reference` now requires `direction` or `comptoir`, matching the admin action gate. | `src/devis/devis.controller.ts:56-64`, `src/devis/devis.service.ts:192-222` |
| Customers | There is no customer directory: `GET /clients` requires a three-character search query and returns at most 25 results. No administrative customer update, deactivate, delete, list pagination, or detail-management operation exists. | `src/profil/profil.controller.ts:88-105`, `src/profil/profil.service.ts:247-315` |
| Team members | There is no member detail, search, pagination, reactivation, or clearing of nullable profile fields. Team mutation responses are partial and cannot safely update a cached full-list row without refetching. | `src/equipe/equipe.controller.ts:24-59`, `src/equipe/equipe.dto.ts:18-67`, `src/equipe/equipe.service.ts:15-165` |

---

## 9. Deferred admin data-fetching backlog (2026-09-02)

These items are intentionally excluded from the current frontend-only pass. The backend engineer
should define and implement each contract before the admin adds a client query or mutation. Do not
invent a route in the BFF to make a missing operation appear available.

| Backlog item | Contract required before frontend work | Current evidence |
| :-- | :-- | :-- |
| Overview statistics | Add `GET /v1/statistiques/apercu`, its period semantics, computable response fields, and role-safe omission of monetary data. Resolve the currently uncomputable sales objective, cost of goods, and stock quantity/history. | No statistics controller or route exists in the backend at `3100ab9`; the admin route is still mock-backed. |
| Customer directory and management | Add directory pagination/search/sort semantics plus audited team-side customer mutations and their role gates. | `src/profil/profil.controller.ts:88-105` exposes search/detail only. |
| Category and department lifecycle | Add category/rayon create and delete routes with response shapes, authorization, and taxonomy recalculation behavior. | `src/catalogue/administration.controller.ts:217-237` exposes patch only. |
| Brand management | Either add an explicit brand CRUD contract or confirm that brands remain derived and permanently read-only. | Brands are returned by `GET /catalogue/administration/taxonomie`; no brand controller exists. |
| Team member administration | Add detail, search, pagination, reactivation, and explicit nullable-field clearing semantics, including full/partial response shapes. | `src/equipe/equipe.controller.ts:24-59` exposes list/create/patch/deactivate only. |
| Order list controls | Add search, pagination/page size or cursor, sort fields/direction, and a stable response envelope. | `src/commandes/commandes.controller.ts:33-38` accepts status only; service caps results at 100. |
| Quote-to-order admin link | Resolved in backend commit `dafeee6`: quote detail now returns nullable `commandeReference` resolved from `commandeId`, so the admin can use the existing reference-driven Orders route without scanning or inventing an ID route. | `src/devis/devis.service.ts:125-150`, `src/commandes/commandes.controller.ts` exposes detail by `:reference` only. |
| Team-side receipt access | Define whether receipt confirmation remains client-owned or add a separate audited team operation with its own role gate. | `src/commandes/commandes.controller.ts:60-74` exposes the client confirmation route without an admin role contract. |
| Product image parser path | Verify or correct raw-body parsing for `/v1/catalogue/administration/produits/:id/images`. | `src/main.ts:19-32` mounts the parser without the global `v1` prefix. |
| Product primary-category clearing | Make `categorie_principale_id: null` actually remove the primary relationship, or change the DTO contract to reject null. | `src/catalogue/administration.service.ts:253-279`, `638-643`. |

---

## What is deliberately not on this list

Things that look like backend problems and are not:

- **JWTs verified locally rather than by calling Supabase per request** (`verificateur-jeton.service.ts:44-81`).
  Deliberate, documented in the source, and correct — a per-request identity call would cost hundreds
  of milliseconds on a Cameroonian link. Revocation is handled by re-reading `membres_equipe.actif`
  every request instead.
- **Membership re-read from Postgres on every request** (`garde-appelant.ts:92-99`). Looks like an
  N+1; is actually the mechanism that makes deactivation immediate. An indexed lookup on a table of a
  few dozen rows.
- **Deny-by-default guarding with `@Publique()` opt-out** (`app.module.ts:74-75`). Correct posture.
  Our frontend middleware deliberately mirrors it.

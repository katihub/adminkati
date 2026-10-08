# Project handbook PDF (backend and admin panel)

> **Withdrawn** on 2026-10-06, before any implementation. The user confirmed the handbooks stay separate:
> one for the backend, kept in the backend repository, and one for the admin panel, which already exists.
> The live plan is `plans/2026-10-06-backend-team-handbook-pdf.md`. Kept as the record of the combined
> shape that was considered and dropped.

Originally written as superseding `plans/2026-10-06-backend-team-handbook-pdf.md`, which covered the
backend alone.

## Goal

One handbook that lets **anyone** pick up this project, whether a new developer on the agency's team
or an external team such as the client: understand what the codebase is, install the dependencies,
run both applications locally, follow the conventions in use, avoid the known traps, set the
environment variables, and deploy to production. It covers the **backend** (`NowTech-backend-`) and
the **admin panel** (this repository) together.

It must work for a reader who has **only the PDF and the code folder**. It does not depend on our
development environment, and it does not care whether the code arrived as a Git repository or a ZIP.

Two PDFs with the same structure and page order, in the visual format of the existing admin handbook
(A4, selectable text, command tables, callouts, an architecture diagram): **French first, then English.**

## Decisions already made

Settled by the user on 2026-10-06.

| Topic | Decision | Consequence |
| :-- | :-- | :-- |
| Scope | The handbook applies to **both the backend and the frontend**, as one document. | One combined handbook, replacing two separate per-repository manuals. |
| Reader | A new team member or an external person with no knowledge of our setup. | Self-contained and written from zero: no unexplained tool, account, or term. |
| Environment | Nothing may depend on our development environment, or on Git versus ZIP. | Instructions start from "you have the code folder". No history, no hosts, no accounts, no agent tooling. |
| Hosting | The client's hosting is unknown, so it stays open. The agency's own VPS is not described. | The deployment section is a neutral, step-by-step recipe that works on any host. |
| Languages | French first, then English; two PDFs. | Two specifications. |
| Installation guide | Part of the handbook: install dependencies and set the project up locally. | A full install guide, not a pointer. The missing `livraison/guide-installation.pdf` is not a separate deliverable. |

## Neutrality rules

Each is checked mechanically before rendering (step 7).

- **No agency specifics**: no people, other clients, production hostnames or IP addresses, server
  names, account owners, or the fact that our server hosts other projects.
- **No credentials.** Variable names and harmless examples only. Real `.env` files are never read.
- **No agent or planning workflow.** The repository's `plans/`, `walkthroughs/`, `reviews/`, the AI
  agent roles, and memory tooling are our process. The handbook may say they exist as historical records
  and may be ignored. It describes how to **change the code**, plus ordinary branch-and-review practice.
- **No dependence on a repository.** No instruction needs history, a remote, or a branch name.
- **Self-sufficient.** Conventions are stated in the handbook rather than deferred to `AGENTS.md`,
  which is cited only as the long-form reference.
- **No invented commitments.** No support terms, warranty, or contacts. What the owner must decide or
  supply is a labelled blank.
- **Every term defined.** A glossary covers the tools and services (Prisma, Supabase, Fapshi, Resend,
  Brevo, Nuxt, Nitro, Bun, pnpm, reverse proxy) and the French domain vocabulary (`vitrine`, `panel`,
  `comptoir`, `caisse`, `devis`, `direction`, `périmètre`, `journal`, `registre`, `arbitrage`).

## Reuse

The existing admin handbooks (`tmp/nowtech-admin-team-handbook{,-fr}.pdf.json`) already carry verified,
bilingual content for the admin panel: system overview, project map, install, local sign-in, daily
commands, working agreements, rules that bite, build and deploy. The new specification is built from
**those nodes, neutralised**, plus new backend material. Their handoff-specific wording ("extracted
project archive", "handoff team", the plan/test/implement/review flow) is removed or rewritten. The
visual style block is reused unchanged so the PDF reads as the same family.

## Findings that shape the plan

Verified in the repositories while planning.

1. **The backend's local quick start cannot run from code alone.** `pnpm dev:preparer` restores
   `seed/nowtech-seed.sql.gz` and aborts if it is missing. The file is a dump of production data, is
   excluded by `.gitignore` (`seed/*.gz`), and has never been committed. It aborts again if fewer than
   1,000 products load. Without it the catalogue schemas are absent and routes fail with
   `relation "nowtech.produits" does not exist`. See Open question 1.
2. **The two backend quick starts disagree.** `README.md` omits the step that appends
   `SUPABASE_JWT_SECRET` to `.env`, and neither it nor `seed/LISEZMOI.md` says the seed is required.
   The handbook uses the sequence proven in step 2, not either file.
3. **Three of the backend's four database schemas are not managed by Prisma.** `boutique` is;
   `nowtech`, `arbitrage` and `vitrine` come from the seed locally and from a data archive or the
   storefront's `catalog.json` (`scripts/ingerer-catalogue.mjs`) in production. A fresh install has no
   catalogue until one is loaded.
4. **Backend production needs no manual role step.** The first migration creates the `nowtech_app` role,
   and `scripts/appliquer-sql.mjs` aligns its password with `DATABASE_URL` at every start. The host must
   let the owner role create the `pg_trgm` and `unaccent` extensions.
5. **Backend container boot is fixed**: `prisma migrate deploy`, then `scripts/appliquer-sql.mjs`, then
   `node dist/main`. A failure in either of the first two stops the container, deliberately. The image
   runs as a non-root user on port 3001. That is all a host must do, so the neutral deploy recipe is
   built on it.
6. **The admin panel is a server-rendered Nuxt application** with a server-side proxy to the backend. It
   needs a running backend to be useful, and `bun run dev:local` is the command for working against a
   local backend: it clears any `BACKEND_URL` or `NUXT_API_BASE_URL` exported in the shell so the values
   in `.env` apply. In production it refuses to start without `NUXT_OPENAI_API_KEY`.
7. **The two applications must agree on five things**: the backend's address in the admin's
   `NUXT_API_BASE_URL`; the admin's origin in the backend's `ORIGINES_AUTORISEES`; the same Supabase
   instance in both (`NUXT_SUPABASE_URL` and `NUXT_SUPABASE_ANON_KEY` against `SUPABASE_URL` and
   `SUPABASE_ANON_KEY`); the panel and storefront addresses in the backend's `URL_PANEL` and `URL_VITRINE`;
   and one secret under two names, the admin's `NUXT_BACKEND_SHARED_SECRET` equal to the backend's
   `REVALIDATION_SECRET`, which lets the backend's rate limiter recognise the admin server instead of
   throttling every operator as one address. The handbook shows these as one wiring table.
8. **Toolchains differ**: backend on Node 24 with pnpm 11.6.0; admin on Bun. Some backend scripts are
   bash (`dev:preparer`, `graine:exporter`, `sql:repeter`), so Windows needs WSL 2 or equivalent, which
   the agency has not run.
9. **The backend's `pnpm lint` cannot work**: the script calls ESLint, but neither ESLint nor Prettier is a
   dependency and no config is tracked. The admin panel's lint and format tools are installed and work.
   The handbook states the gap rather than describing a convention that does not exist.
10. **The backend assistant has no language model behind it.** It answers from a verified knowledge base
    on purpose, so there is no AI key to configure for it. (The admin panel's AI product-copy feature is
    separate and does use a key.)
11. **Known test baseline (admin)**: 12 failing tests in six files and one typecheck error, both recorded
    in `reports/2026-10-05-assessment-*.md`. The backend's six database suites silently skip without a
    database. Both facts belong in the caveats.

## Scope

| # | Section | Contents | Primary sources |
| :-- | :-- | :-- | :-- |
| 0 | Cover | Purpose, reader, the two applications, stack at a glance, how to read this document, date | `package.json` (both) |
| 1 | Know the system | What the project does; backend, admin panel, and the public storefront as a separate component; how they connect; module and repository maps; an architecture diagram | `src/`, `app/`, `server/` |
| 2 | **Install everything (installation guide)** | Per-OS prerequisites (Node 24, pnpm via corepack, Bun, Docker, git, an editor); **getting the code from a ZIP or a clone, and opening it**; installing dependencies in each app; creating each `.env`; the backend seed; starting the database; preparing it; troubleshooting table of the failures the scripts record | both `package.json`, `docker-compose.yml`, `scripts/preparer-dev.sh`, `.env.example` (both) |
| 3 | Run and explore locally | Start order (database, backend, admin); URLs; local sign-in for each app; fixtures and dev tokens; running both test suites; the wiring table | `seed/LISEZMOI.md`, `package.json`, `server/utils/supabase.ts` |
| 4 | Environment variables | Both applications: required, optional, production-only; how to generate each secret by hand; the two backend database URLs and why | both `.env.example`, `src/config/configuration.ts`, `nuxt.config.ts` |
| 5 | Data and database | Schemas and who manages them, migrations (forward only), `sql/` order and replay, the least-privilege role, loading the catalogue, stock import, first direction account, backups | `prisma/`, `sql/ordre.txt`, `scripts/` |
| 6 | Conventions | **Backend**: module layout, strict TypeScript, French naming, comment style, tests. **Admin**: layout, components, composables, schemas, state, i18n, TDD, formatting. **Both**: branch and review practice | `AGENTS.md`, `src/**`, `.claude/rules` content (restated, not referenced) |
| 7 | Caveats that bite | The invariants a newcomer breaks first, grouped by application, plus the known gaps from the findings | both codebases |
| 8 | **Deploy to production, step by step** | Neutral recipe in dependency order: database, identity (Supabase), backend, admin, TLS and CORS, first account, data, payment webhook and email, verification, rollback, backups. A no-container variant for each | `Dockerfile`, both CI workflows, both `.env.example` |
| 9 | Handover checklist | Accounts and secrets to take over and rotate, labelled blanks for the owner, what is not included | findings |
| 10 | Glossary and where to look next | Terms, files, the records folders as history | repositories |

## Implementation steps

Ordered by dependency; each can be reviewed alone.

### 1. Settle the blocking questions

**What changes:** Get answers to Open questions 1 to 3, which decide what section 2 may promise and
which components the handbook covers.

**Where:** Recorded at the top of the walkthrough.

**Done when:** Each has an answer, or a stated default the user accepted.

### 2. Prove the backend install from a ZIP-shaped copy

**What changes:** Export the backend's tracked tree with `git archive` into a clean directory (no `.git`,
none of our local files), supply the seed the way Open question 1 is settled, and follow the draft of
sections 2 and 3 literally. Record every command and result, plus each missing prerequisite or wrong step.

**Where:** A scratch directory outside both repositories.

**Done when:** `pnpm dev` serves `/sante` and `/docs` using only the steps the handbook states, **or** the
walkthrough names the exact failing step and marks the guide unproven beyond it.

### 3. Prove the admin install and sign-in against that backend

**What changes:** Export this repository the same way, follow the admin part of sections 2 and 3, start
it with `bun run dev:local` against the backend from step 2, and sign in.

**Where:** A scratch directory.

**Done when:** The admin panel loads and a backend call succeeds after sign-in, or the failing step is
recorded and the guide marked unproven beyond it.

### 4. Rehearse the neutral deploy recipe

**What changes:** From the exports, build the backend image and run it against a throwaway PostgreSQL
with only the values the recipe lists, then build and start the admin panel's production output.
Supabase sign-in, the payment gateway, and email are unavailable to the rehearsal and are recorded as
**not exercised**.

**Where:** Scratch directories and a throwaway database container.

**Done when:** The backend answers `/sante` and the admin panel serves a page through the documented
steps, or the failure is recorded and section 8 says what was not proven.

### 5. Author the French specification

**What changes:** Build the pdfmake specification from the neutralised admin nodes plus the new backend
sections, using the sequences proven in steps 2 to 4. Add the diagram, wiring table, troubleshooting
table, blanks, and glossary.

**Where:** `tmp/nowtech-project-handbook-fr.pdf.json`

**Done when:** Valid JSON, every section in the scope table present, and no node still carries
handoff-specific wording.

### 6. Author the English specification

**What changes:** Translate section for section, keeping French identifiers, routes, and variable names verbatim.

**Where:** `tmp/nowtech-project-handbook.pdf.json`

**Done when:** Same node count and section order as the French file.

### 7. Render and verify

**What changes:** Render both with the pdfmake setup used for the existing handbooks. Review every page
image for a clipped table, a row split across pages, a stranded heading, or a near-empty page. Then:

- **Commands.** Every `pnpm` and `bun run` script named exists in the matching `package.json`.
- **Variables.** Every variable named exists in the matching `.env.example`, and every one in either
  file appears in the variables section.
- **Neutrality scan.** Scan both extracted texts for individuals' names, other clients' names, the
  agency's hostnames, IPv4 addresses, key-shaped strings, and our tooling vocabulary. Run a **positive
  control** first so an empty result means something.
- **Seed (if it ships).** Scan its text for personal data before it is sent.

**Where:** `outputs/nowtech-project-handbook-fr.pdf` and `outputs/nowtech-project-handbook.pdf`; checks
in a throwaway script, not committed.

**Done when:** Both begin with `%PDF-`, `pdfinfo` reports A4 and between 18 and 26 pages, `pdftotext`
shows all eleven headings, the page review finds no defect, and every check reports zero findings with the
positive control having fired.

### 8. Record and commit

**What changes:** Write the walkthrough and commit the plan, walkthrough, specifications, and PDFs on this
repository's `feat/ai-integration`. The backend repository is untouched. No push, no pull request.

**Where:** `walkthroughs/2026-10-06-project-handbook-pdf.md`.

**Done when:** The walkthrough reuses the slug `project-handbook-pdf`, every result in it is output that
was actually printed, and the working tree is clean.

### Not in this plan

- Editing `README.md` or `livraison/LISEZMOI.md`, which promise a `guide-installation.pdf` that does not
  exist. The handbook makes that reference unnecessary; correcting it is a small change **made only on the
  user's go-ahead** (Open question 4).
- Changing any script in either repository, including making `dev:preparer` work without the seed.
- Cleaning repository history or the agency-specific text in `documents/travailler-et-deployer.md`. The
  handbook copies none of it and depends on none of it.
- The public storefront's own setup (Open question 2).
- Removing the two existing admin handbooks (Open question 3).

## Tests

None in the application sense: this is documentation, and a test of a PDF's prose would fail the
repository's "useless test" bar. Steps 2 to 4 and 7 are the equivalent: they run the instructions, check
every command and variable against the source, and scan for disclosure, and each can fail.

## Risks

| Risk | Earliest it surfaces | Mitigation |
| :-- | :-- | :-- |
| The install guide promises a backend setup that cannot work without a seed the reader lacks | Step 1 | Open question 1 is answered before section 2 is written; step 2 runs it from a ZIP-shaped copy. |
| The guide works only because of something on our machines (a global tool, a cached volume, a leftover `.env`) | Steps 2, 3 | Run from clean exports, no `.env`, a fresh database volume. |
| Neutralising the admin nodes leaves handoff-specific or agent-workflow wording behind | Step 5 | Neutrality scan plus a read of every reused node. |
| A secret or third party's data reaches the reader | Step 7 | Scan with a positive control; `.env`-class files never opened; seed scanned. |
| Deploy guidance is wrong for the reader's host | Step 4 | Built only on each application's fixed start sequence and plain Postgres; host specifics are blanks. |
| Supabase, payments, and email are documented from source, not exercised | Step 4 | Marked "not exercised" in the handbook and the walkthrough. |
| Windows instructions are wrong | Step 2 | State they are unverified; do not claim support. |
| The two editions drift | Step 6 | Same node count and section order, checked mechanically. |
| A combined handbook gets long and loses the reader | Step 7 | Page budget of 18 to 26, a one-page "start here" on the cover, and a per-application split inside each section. |
| The handbook goes stale | After delivery | Date on the cover; specifications stay in the repository so it can be regenerated. |

## Open questions

Each states the options and a recommendation. Defaults apply if the user does not object.

1. **How does the reader get `seed/nowtech-seed.sql.gz`?** Blocking: without it `pnpm dev:preparer`
   aborts, so the install guide cannot honestly promise a local backend.
   - A. Deliver it with the handover, **as a separate file outside the code**, and document where it
     goes. Scan it for personal data first.
   - B. Make local setup work without it: a change to `scripts/preparer-dev.sh` and probably a minimal
     catalogue, which is code work outside this plan.
   - C. Say "ask the delivering team", which defeats a handbook meant to need no one.
   - **Recommendation: A**, with the handbook naming the file, where it goes, and what to do if it is absent.

2. **Does "frontend" include the public storefront?** Assumed **no**: the frontend is this admin panel.
   The storefront is a separate codebase (it produces the catalogue the backend ingests and is hosted
   separately); I have not read it. Default: the handbook describes it as a separate component in the
   architecture and wiring sections and gives no setup steps for it. Say if it must be covered.

3. **The two existing admin-only handbooks.** Default: they stay in `outputs/` and the combined handbook is
   the one to send; the walkthrough notes they are superseded. Say if they should be deleted.

4. **May `README.md` and `livraison/LISEZMOI.md` be corrected afterwards?** Default: no edits until asked;
   the discrepancies are listed in the walkthrough.

5. **Does the reader receive production data?** A fresh install starts with no catalogue. Default: the
   handbook documents loading a data archive or the storefront's `catalog.json` and states that any
   archive is delivered separately. Say if no production data is being handed over.

6. **Support and contacts.** Default: none in the handbook, since a support page needs terms only the
   agency can state.

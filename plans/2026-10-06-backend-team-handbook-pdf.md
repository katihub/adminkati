# Backend team handbook PDF

Revised on 2026-10-06, before any implementation. An interim plan for a combined backend and admin
handbook (`plans/2026-10-06-project-handbook-pdf.md`) was withdrawn when the user confirmed the two
handbooks stay separate. This plan is the backend one.

## Goal

A **self-contained handbook for the backend** (`NowTech-backend-`) that lets anyone pick it up, whether
a new developer on the agency's team or an external team such as the client: understand what the
codebase is, install the dependencies, run it locally, follow the conventions in use, avoid the known
traps, set the environment variables, and deploy it to production.

It lives in the **backend repository**, in two PDFs with the same structure and page order, in the
visual format of the admin handbook (A4, selectable text, command tables, callouts, an architecture
diagram): **French first, then English.** The admin panel keeps its own separate handbook, which
already exists in both languages and is not touched.

## Decisions already made

Settled by the user on 2026-10-06.

| Topic | Decision | Consequence |
| :-- | :-- | :-- |
| Scope | **Backend only.** The admin panel has its own handbook; the two are not combined. | This handbook may name the admin panel as a connected application and say what it must be told, but gives no admin setup steps. |
| Location | The backend handbook is in the **backend repository**, in English and French. | PDFs and specifications are committed there, on the backend's `feat/ai-integration` branch. |
| Reader | A new team member or an external person with no knowledge of our setup. | Written from zero; no unexplained tool, account, or term. |
| Environment | Nothing may depend on our development environment, or on whether the code was shared as Git or a ZIP. | Instructions start at "you have the code folder". No history, hosts, accounts, or agent tooling. |
| Hosting | The agency runs it on its own VPS, but the client's hosting is unknown, so it stays **open**. | The deployment section is a neutral, step-by-step recipe that works on any host. Our VPS is not described. |
| Languages | French first, then English; two PDFs. | Two specifications. |
| Installation guide | Part of the handbook: install the dependencies and set the project up locally. | A full install guide, not a pointer. The `livraison/guide-installation.pdf` that the README promises is not a separate deliverable. |

## Reader

A competent engineering team that has never seen this project or this agency. They have a repository
or a ZIP, and may run macOS, Linux, or Windows. They know none of our people, our other projects, or our
tooling, and must be able to use the handbook without asking us anything.

## Source material, and its limits

| Material | Use | Limit |
| :-- | :-- | :-- |
| `README.md`, `seed/LISEZMOI.md` | Source for the quick start | **They disagree and are incomplete** (Finding 2). The handbook uses the sequence proven in step 2. |
| `documents/travailler-et-deployer.md` | Source for boot rules, stock behaviour, house rules | Written for the agency's own team and production. It names individuals and another client and quotes an internal URL. **Its facts are reused; its text is not.** |
| `Dockerfile`, `docker-compose.yml`, `.github/workflows/verifications.yml`, `.env.example`, `scripts/`, `sql/`, `prisma/` | Primary source for install, configuration, data, deployment | Read, never edited. |
| `livraison/` | Mentioned once as an optional helper | Its generator emits configuration for one specific pair of platforms and its data installer expects an archive made on our server. It is not the deployment path. |
| The admin handbook (`outputs/nowtech-admin-team-handbook*.pdf`) | Visual style block reused unchanged, so the two manuals read as a pair | Its content is the admin panel's and is not copied. |

## Findings that shape the plan

Verified in the backend repository while planning.

1. **The local quick start cannot run from the code alone.** `pnpm dev:preparer` restores
   `seed/nowtech-seed.sql.gz` and aborts if it is missing ("ABSENTE… Demandez-la, ou regenerez-la si
   vous avez l'acces au VPS"). The file is a dump of production data, is excluded by `.gitignore`
   (`seed/*.gz`), and has never been committed. It aborts again if fewer than 1,000 products load.
   Without it the catalogue schemas do not exist and routes fail with
   `relation "nowtech.produits" does not exist`. See Open question 1.
2. **The two quick starts disagree.** `README.md` omits the step that appends `SUPABASE_JWT_SECRET` to
   `.env`, and neither it nor `seed/LISEZMOI.md` says the seed is required.
3. **Three of the four database schemas are not managed by Prisma.** `boutique` is; `nowtech`,
   `arbitrage` and `vitrine` come from the seed locally and from a data archive or the storefront's
   `catalog.json` (`scripts/ingerer-catalogue.mjs`) in production. A fresh install has no catalogue
   until one is loaded.
4. **Production needs no manual role step.** The first migration creates the `nowtech_app` role, and
   `scripts/appliquer-sql.mjs` aligns its password with `DATABASE_URL` at every start. The host must let
   the owner role create the `pg_trgm` and `unaccent` extensions, which the `sql/` files do.
5. **Container boot is fixed**: `prisma migrate deploy`, then `scripts/appliquer-sql.mjs`, then
   `node dist/main`. A failure in either of the first two stops the container, deliberately. The image
   runs as a non-root user and listens on 3001. That is all a host must do, so the neutral deploy recipe
   is built on it.
6. **Docker is a real prerequisite for local work**: the database comes from `docker-compose.yml`, and
   `dev:preparer` runs `psql` through the container. A setup against the reader's own PostgreSQL is
   not supported by the scripts, and the handbook says so rather than inventing one.
7. **Some scripts are bash** (`dev:preparer`, `graine:exporter`, `sql:repeter`). On Windows they need
   WSL 2 or an equivalent, which the agency has not run.
8. **`pnpm lint` cannot work**: the script calls ESLint, but neither ESLint nor Prettier is a
   dependency and no config file is tracked. The handbook states the gap rather than describing a
   convention that does not exist.
9. **The assistant has no language model behind it.** It answers from a verified knowledge base on
   purpose (`seed/connaissances.json`), so there is no AI key to configure.
10. **The backend's connection points to other applications** are four values: `ORIGINES_AUTORISEES`
    must list the admin panel's and storefront's real origins; `URL_PANEL` and `URL_VITRINE` hold their
    addresses; `SUPABASE_URL` and `SUPABASE_ANON_KEY` must name the same Supabase instance the admin
    panel uses; and `REVALIDATION_SECRET` must equal the admin panel's `NUXT_BACKEND_SHARED_SECRET`,
    which lets the rate limiter recognise the admin server instead of throttling every operator as one
    address. The handbook gives these as one table, from the backend's side.
11. **Versions and sizes**: Node 24, pnpm 11.6.0; PostgreSQL 15 in CI and 17 in the local compose file;
    26 variables in `.env.example`; 29 Prisma models; three rate limiters (10 per second, 120 per
    minute, 1,000 per hour); email through Resend with Brevo as the alternative; payments through Fapshi.
12. **Stock in production** (per the repository guide, to be reconfirmed at handover): the stock
    register is empty, products are shown by fallback until counted, and a product's availability can be
    decided independently of its count. The handbook words this "at the time of writing".

## Neutrality rules

Each is checked mechanically before rendering (step 6).

- **No agency specifics**: no people, other clients, production hostnames or IP addresses, server
  names, account owners, or the fact that our server hosts other projects.
- **No credentials.** Variable names and harmless examples only. `.env`, `livraison/parametres.env` and
  `livraison/sortie/` are never read.
- **No agent or planning workflow.** Our AI agents, memory tools, and planning loop are our process and
  stay out. The handbook describes how to change the code, and ordinary branch-and-review practice.
- **No dependence on a repository or a ZIP.** No instruction needs history, a remote, or a branch name.
- **No dependence on our environment.** Prerequisites are installed from vendors' own instructions;
  nothing assumes our machines, shells, editors, or accounts.
- **Self-sufficient.** Conventions are stated in the handbook, not deferred to another file.
- **No invented commitments.** No support terms, warranty, or contacts. What the owner must decide or
  supply is a labelled blank.
- **Every term defined.** A glossary covers Prisma, Supabase, Fapshi, Resend, Brevo, pnpm, reverse proxy,
  and the French domain vocabulary (`vitrine`, `panel`, `comptoir`, `caisse`, `devis`, `direction`,
  `périmètre`, `journal`, `registre`, `arbitrage`).

## Scope

| # | Section | Contents | Primary sources |
| :-- | :-- | :-- | :-- |
| 0 | Cover | Purpose, reader, stack at a glance, how to read this document, date | `package.json` |
| 1 | Know the system | What the backend does; the applications around it (admin panel, public storefront); module and repository maps; an architecture diagram | `src/`, `README.md` |
| 2 | **Install and set up (the installation guide)** | Per-OS prerequisites (Node 24, pnpm via corepack, Docker, git, an editor); **getting the code from a ZIP or a clone, and opening it**; installing dependencies; creating `.env`; the seed; starting the database; preparing it; first run; a troubleshooting table of the failures the scripts' comments record | `package.json`, `docker-compose.yml`, `pnpm-workspace.yaml`, `scripts/preparer-dev.sh` |
| 3 | Run and explore locally | URLs (`/v1`, `/docs`, `/sante`), local sign-in, fixtures, dev tokens, running the tests, the connection table to the admin panel and storefront | `seed/LISEZMOI.md`, `package.json`, `src/main.ts` |
| 4 | Environment variables | All 26: required, optional, production-only; how to generate each secret by hand; the two database URLs and why | `.env.example`, `src/config/configuration.ts` |
| 5 | Data and database | Schemas and who manages them, migrations (forward only), `sql/` order and replay rule, the least-privilege role, loading the catalogue, stock import, first direction account, backups | `prisma/`, `sql/ordre.txt`, `scripts/` |
| 6 | Daily loop and conventions | Commands, tests (six suites need a real database), strict TypeScript, module layout, French naming, comment style, the lint gap, general branch-and-review practice | `package.json`, jest config, `tsconfig.json`, `src/**` |
| 7 | Caveats that bite | The invariants a newcomer breaks first: money perimeter, append-only ledgers, stock register versus decided availability, closed CORS list, rate limits, secrets | `src/main.ts`, `src/app.module.ts`, guide facts |
| 8 | **Deploy anywhere, step by step** | Neutral recipe: what you need, build the image, provide configuration, create the database, run it, front it with TLS, set CORS, create the first account, load data, wire the payment webhook and email, verify, roll back, back up. A no-container variant. | `Dockerfile`, `verifications.yml`, `.env.example` |
| 9 | Handover checklist and known gaps | Accounts and secrets to take over and rotate, labelled blanks for the owner, what is not included, the gaps above | findings |
| 10 | Glossary and where to look next | Terms, files, the companion admin handbook | repository |

## Implementation steps

Ordered by dependency; each can be reviewed alone.

### 1. Settle the blocking questions

**What changes:** Get answers to Open questions 1 and 2, which decide what section 2 may promise and
what section 5 says about data.

**Where:** Recorded at the top of the walkthrough.

**Done when:** Each has an answer, or a stated default the user accepted.

### 2. Prove the install guide from a ZIP-shaped copy

**What changes:** Export the tracked tree with `git archive` into a clean directory (no `.git`, none of
our local files), supply the seed the way Open question 1 is settled, and follow the draft of sections
2 and 3 literally. Record every command and result, and each missing prerequisite, undocumented step,
or wrong instruction the run reveals.

**Where:** A scratch directory outside the repository.

**Done when:** `pnpm dev` serves `/sante` and `/docs` using only the steps the handbook states, **or**
the walkthrough names the exact failing step and marks the guide unproven beyond it.

### 3. Rehearse the neutral deploy recipe

**What changes:** From the same export, build the image and run it against a throwaway PostgreSQL with
only the values the recipe lists, then confirm the boot sequence and `/sante`. Supabase sign-in, the
payment gateway, and email are unavailable to the rehearsal and are recorded as **not exercised**.

**Where:** A scratch directory and a throwaway database container.

**Done when:** The container reaches a healthy `/sante` through the documented steps, or the failure is
recorded and section 8 says what was not proven.

### 4. Author the French specification

**What changes:** Write the handbook in French as a pdfmake document specification, reusing the admin
handbook's style block. Include the diagram, tables, troubleshooting table, blanks, and glossary, using
the sequences proven in steps 2 and 3.

**Where:** `NowTech-backend-/documents/manuel/manuel-equipe-backend.pdf.json`

**Done when:** Valid JSON, and every section in the scope table is present.

### 5. Author the English specification

**What changes:** Translate section for section, keeping French identifiers, routes, and variable
names verbatim.

**Where:** `NowTech-backend-/documents/manuel/backend-team-handbook.pdf.json`

**Done when:** Same node count and section order as the French file.

### 6. Render and verify

**What changes:** Render both with the pdfmake setup used for the admin handbooks. Review every page
image for a clipped table, a row split across pages, a stranded heading, or a near-empty page. Then:

- **Commands.** Every `pnpm` script named exists in `package.json`.
- **Variables.** Every variable named exists in `.env.example`, and every one in `.env.example` appears
  in the variables section.
- **Neutrality scan.** Scan both extracted texts for individuals' names, other clients' names, the
  agency's hostnames, IPv4 addresses, key-shaped strings, and our tooling vocabulary. Run a **positive
  control** first so an empty result means something.
- **Seed (if it ships).** Scan its text for personal data before it is sent.

**Where:** `NowTech-backend-/documents/manuel-equipe-backend.pdf` and
`NowTech-backend-/documents/backend-team-handbook.pdf`; checks in a throwaway script, not committed.

**Done when:** Both begin with `%PDF-`, `pdfinfo` reports A4 and between 14 and 20 pages, `pdftotext`
shows all eleven headings, the page review finds no defect, and every check reports zero findings with
the positive control having fired.

### 7. Record and commit

**What changes:** Write the walkthrough. Commit the two PDFs and two specifications on the backend's
`feat/ai-integration` branch, and the plan and walkthrough on this repository's `feat/ai-integration`.
No push, no pull request.

**Where:** `walkthroughs/2026-10-06-backend-team-handbook-pdf.md`, plus the four backend files.

**Done when:** The walkthrough reuses the slug `backend-team-handbook-pdf`, every result in it is output
that was actually printed, and both working trees are clean.

### Not in this plan

- The admin handbook. It stays as it is, in both languages.
- Editing `README.md` or `livraison/LISEZMOI.md`, which promise a `guide-installation.pdf` that does not
  exist. The handbook makes that reference unnecessary; correcting it is a small change **made only on
  the user's go-ahead** (Open question 4).
- Changing any script, including making `dev:preparer` work without the seed.
- Cleaning repository history or the agency-specific text in `documents/travailler-et-deployer.md`. The
  handbook copies none of it and depends on none of it.
- Setting up the public storefront. It is described as a connected component only.

## Tests

None in the application sense: this is documentation, and a test of a PDF's prose would fail the
repository's "useless test" bar. Steps 2, 3 and 6 are the equivalent: they run the instructions, check
every command and variable against the source, and scan for disclosure, and each can fail.

## Risks

| Risk | Earliest it surfaces | Mitigation |
| :-- | :-- | :-- |
| The install guide promises a setup that cannot work without a seed the reader lacks | Step 1 | Open question 1 is answered before section 2 is written; step 2 runs it from a ZIP-shaped copy. |
| The guide works only because of something on our machines (a global tool, a cached volume, a leftover `.env`) | Step 2 | Clean export, no `.env`, a fresh database volume. |
| A secret or a third party's data reaches the reader | Step 6 | Scan with a positive control; `.env`-class files never opened; seed scanned. |
| Deploy guidance is wrong for the reader's host | Step 3 | Built only on the container's fixed boot sequence and plain PostgreSQL; host specifics are blanks. |
| Supabase, payments, and email are documented from source, not exercised | Step 3 | Marked "not exercised" in the handbook and the walkthrough. |
| Windows instructions are wrong | Step 2 | Say they are unverified; do not claim support. |
| The two editions drift | Step 5 | Same node count and section order, checked mechanically. |
| The handbook goes stale as the backend changes | After delivery | Date on the cover; the specifications stay in the repository so it can be regenerated (Open question 3). |

## Open questions

Each states the options and a recommendation. Defaults apply if the user does not object.

1. **How does the reader get `seed/nowtech-seed.sql.gz`?** Blocking: without it `pnpm dev:preparer`
   aborts, so the install guide cannot honestly promise a local setup.
   - A. Deliver it with the handover **as a separate file outside the code** (it is gitignored), and
     document where it goes. Scan it for personal data first.
   - B. Make local setup work without it: a change to `scripts/preparer-dev.sh` and probably a minimal
     catalogue, which is code work outside this plan.
   - C. Say "ask the delivering team", which defeats a handbook meant to need no one.
   - **Recommendation: A**, with the handbook naming the file, where it goes, and what to do if absent.

2. **Does the reader receive production data?** A fresh install starts with no catalogue. Default: the
   handbook documents loading a data archive and the storefront's `catalog.json`, and states that any
   archive is delivered separately. Say if no production data is being handed over.

3. **Should the specifications ship with a small render script?** The PDFs are built from pdfmake
   specifications, which are dead weight without a renderer. Options: specs only, or specs plus a short
   `documents/manuel/render.cjs` and a note on installing pdfmake (no change to `package.json`).
   **Recommendation: include the script**, so the handbook can be regenerated when the code changes.

4. **May `README.md` and `livraison/LISEZMOI.md` be corrected afterwards?** Default: no edits until
   asked; the discrepancies are listed in the walkthrough.

5. **Support and contacts.** Default: none in the handbook, since a support page needs terms only the
   agency can state.

## What I built

A self-contained handbook for the backend, in French and English, as two 18-page A4 PDFs that follow the
visual format of the admin handbook. It covers installing the tools and dependencies, running the API
locally, every environment variable, the database and data, conventions, the rules newcomers break, a
host-neutral step-by-step deployment, a handover checklist, and a glossary. It does not depend on the
agency's environment or on Git versus ZIP delivery. Everything is in the backend repository, committed
on its `feat/ai-integration` branch as `2eaa1f4` and `1aa905a`.

Both editions are built from one content definition (`bh/content1.cjs`, `bh/content2.cjs`, each string
written once per language), so their structure cannot drift: 119 nodes each, identical shape.

## Plan coverage

Plan: `plans/2026-10-06-backend-team-handbook-pdf.md`.

| Plan item | Status | Where |
| :-- | :-- | :-- |
| 1. Settle the blocking questions | Done | The seed is supplied by the user (not raised again). Defaults applied for the rest: render script included, `README.md` untouched, no support page. |
| 2. Prove the install guide from a ZIP-shaped copy | Done, with isolation deviations (below) | Scratch export of the tracked tree via `git archive` (329 files, no `.git`) |
| 3. Rehearse the neutral deploy recipe | Done for what a rehearsal can reach; Supabase, Fapshi, email, TLS and a proxy not exercised | Scratch containers, removed afterwards |
| 4. Author the French specification | Done | `documents/manuel/manuel-equipe-backend.pdf.json` |
| 5. Author the English specification | Done | `documents/manuel/backend-team-handbook.pdf.json` |
| 6. Render and verify | Done | `documents/manuel-equipe-backend.pdf`, `documents/backend-team-handbook.pdf` |
| 7. Record and commit | Done | This file; backend commits `2eaa1f4` and `1aa905a`; admin commit `9a7d157` for the plans and the first version of this walkthrough |

Also added, as the plan's Open question 3 recommended: `documents/manuel/render.cjs`, which regenerates
the PDFs from the specifications and looks for pdfmake in the current directory, so the project's
`package.json` and lockfile are unchanged.

## Deviations

1. **Isolation in the rehearsal.** The user's own development database (port 5433) and API (port 3001)
   were running, so the scratch copy used its own database container on port 5543 and PORT 3101. Two
   scratch-only edits made that possible: the compose file's `container_name` line removed and its published
   port changed, and `PORT` plus both database URLs in the scratch `.env` pointed at the new ports. The
   handbook documents the default ports; these edits are not part of it.
2. **Stand-in seed.** The only seed on the machine is from 3 September. It stops `pnpm dev:preparer` at step 9
   (below). To go on I applied `sql/arbitrage.sql` to the scratch database by hand, emulating a current seed.
   The handbook states that the seed must be recent. The seed itself is the user's to supply and was neither
   shipped nor scanned by me; the plan's "scan the seed for personal data if it ships" check was therefore
   not run.
3. **Section 4's check also reads `configuration.ts`.** The plan said every variable must exist in
   `.env.example`. `TRUSTED_PROXY_HOPS` is in the validation schema but not in `.env.example`, so the check
   accepts either source. The handbook says the code does not read it.
4. **Headings.** The mechanical check asserts the ten numbered headings. The cover title is not asserted by
   the script; I confirmed it in the page images.
5. **The first image build failed**, on network timeouts while downloading two of 666 packages. A retry
   succeeded. It is not a Dockerfile problem.
6. **Layout changes after the first render.** The first render left a table header alone at the foot of a page
   and two headings away from their tables. Those blocks are now grouped so the renderer moves each one whole,
   and one French section was shortened because a single table row spilled onto an almost empty page.
7. **Backend `main` moved while I worked.** Pull request #26 ("Le guide d'installation : d'un VPS nu a la
   boutique en ligne") merged into `main` on 6 October, after this branch diverged. It adds
   `livraison/guide-installation.pdf` (14 pages, French, written for one hosting setup) and its HTML source.
   The first version of the handbook called that guide missing. Backend commit `1aa905a` corrects it: the guide
   is now listed in the repository map and in "Where to look next", described as written for one particular
   hosting setup with section 8 as the host-neutral version, and the "guide is missing" gap is gone. The frozen
   plan still says the guide is absent; this entry is the record of why it no longer is. The branch merges into
   `main` with no conflicts (a dry-run merge showed none).

## Tests

This is documentation, so no application tests apply. The equivalents, with what each printed:

**Install from a clean copy** (empty environment via `env -i`, Node 24.19.0, pnpm 11.6.0):

```text
pnpm install                  -> Done in 8.9s using pnpm v11.6.0   (pnpm switched itself to the pinned version)
pnpm dev:preparer (stale seed) -> "ERROR: relation "arbitrage.marques_logos" does not exist" at step 9, exit 3
pnpm dev:preparer (emulated current seed, run again in a clean environment) -> exit 0, all 12 steps
pnpm dev                      -> /sante 200, /docs 200, /v1/catalogue/taxonomie 200
POST /v1/auth/connexion       -> returns an access_token for dev@nowtech.local
pnpm build                    -> exit 0, dist/main.js present
pnpm dev:jeton                -> prints a token, exit 0
NODE_ENV=development pnpm dev:fixtures        -> {"customers":5,"teamMembers":4,"orders":10,"quotes":3,"cashHandovers":4,"propositions":2}
NODE_ENV=development pnpm dev:fixtures:verify -> same counts, exit 0
node --env-file=.env scripts/premiere-direction.mjs ... -> "Refus: 1 direction(s) active(s) existe(nt) deja", exit 1
pnpm test                     -> Test Suites: 103 passed, 103 total; Tests: 2073 passed, 2073 total; Time: 85.126 s
pnpm lint                     -> "sh: eslint: command not found", exit failure
```

**Things the first start taught me**, all now in the handbook: with the stock `.env.example` the API refused
to start until `FAPSHI_SECRET_RAPPEL` (16 characters), `SECRET_SUIVI_COMMANDES` (32) and `REVALIDATION_SECRET`
(16) held real values, alongside `SUPABASE_JWT_SECRET` (32). A `DATABASE_URL` exported in the shell overrode
`.env` and produced `Can't reach database server at postgres:5432`.

**Test invocation forms.** `pnpm test src/commun/reference.spec.ts`, `pnpm test -- <path>`, `pnpm test
--runInBand <path>` and `pnpm test -- --runInBand <path>` each ran 1 suite, 5 tests, all passing. The bare form
the CI workflow uses, `pnpm test -- --runInBand` with no path, printed `Pattern: --runInBand - 0 matches` and
exited 1.

**Deploy rehearsal** (production image built from the export, run against brand-new PostgreSQL 17):

```text
docker build                  -> first attempt: TimeoutError during pnpm install; second attempt: BUILD_EXIT 0
container user                -> uid=1000(node)
boot on an empty database     -> 28 migrations applied; "[sql] le catalogue (schema nowtech) n'est pas encore charge : les fichiers sql/ ne sont PAS appliques"; "mot de passe du role applicatif aligne sur DATABASE_URL"; API listening on 3001
/sante                        -> 200
/v1/catalogue/taxonomie       -> 500 (catalogue schemas empty, as the handbook says)
restore the seed, restart     -> 0 errors, 4275 products; "[sql] les 10 fichiers sont a jour"; /v1/catalogue/taxonomie -> 200
docker run --env-file         -> /sante 200 with an unquoted value containing spaces and < >
docker exec ... premiere-direction.mjs -> creates the account; a second run is refused
no-container variant          -> prisma migrate deploy applied, appliquer-sql.mjs ran, node dist/main on 3301, /sante 200
```

The no-container variant first failed because the scratch folder's development `.env` was loaded alongside the
exported production variables, and production mode refused `MOT_DE_PASSE_DEV` and `STOCKAGE_LOCAL`. With that
`.env` moved aside it succeeded. The handbook warns about exactly this.

**Other commands I documented, checked on the scratch database**

```text
pg_dump -Fc                   -> 737,060 bytes, exit 0
pg_restore into an empty database -> exit 0, 0 errors, 4275 products, 30 boutique tables
psql "...?schema=boutique"    -> psql: error: invalid URI query parameter: "schema"
stock importer, dry run       -> "REFUS ... 4266 produits actifs vendables absents du fichier" and "Rien n'a ete ecrit."
pnpm stock:importer (no env)  -> exit 1, output ends with the importer's usage text; node --env-file=.env scripts/importer-stock-initial.mjs works
NODE_OPTIONS=--env-file=.env  -> "node: --env-file= is not allowed in NODE_OPTIONS"
```

**Verification of the finished PDFs** (`pdfinfo`, `pdftotext`, and a script written for this):

```text
backend-team-handbook.pdf     -> A4, 18 pages, starts with %PDF-
manuel-equipe-backend.pdf     -> A4, 18 pages, starts with %PDF-
every pnpm command named      -> exists in package.json (19 scripts plus pnpm install per edition, read cell by cell from the specifications)
every variable-like token     -> is a backend setting or a known non-setting
every setting in .env.example and the config schema -> appears in the handbook
ten numbered section headings -> present in both
neutrality scan (people, other clients, hosting names, IPv4 addresses, key-shaped strings, tooling words) -> 0 findings in both
scanner positive control      -> 6 of 6 patterns fired on a planted string
hostnames present             -> example.com, exemple.com, nodejs.org, nowtech.local
regenerated from the committed specs with documents/manuel/render.cjs -> extracted text identical to the verified PDFs
```

The scanner's positive control caught a real weakness the first time: the key pattern missed `sk_live_…`
because of the underscore. The command check had also been matching prose words across table columns. Both
were fixed before the passing run recorded above.

After correcting the handbook for the merged guide (commit `1aa905a`), both PDFs were regenerated from the
committed specifications with `documents/manuel/render.cjs`: 18 pages each, extracted text identical to the
scratch render, the verification script run again (all checks passed, positive control 6 of 6), and the changed
pages (repository map, known gaps, where to look next) reviewed as images in both languages.

Every page of both editions was reviewed as an image after the last layout change (36 pages, as contact sheets): no stranded headings, no header-only tables, no near-empty pages.

## Not done

- **Not exercised**, and marked so in the handbook where it matters: Supabase Cloud and any real Supabase
  instance, the Fapshi integration, email delivery, TLS and a reverse proxy, `scripts/ingerer-catalogue.mjs`
  (it needs a catalogue file), `scripts/charger-connaissances.mjs`, `pnpm graine:exporter` (it needs SSH access
  to a source database), and `pnpm sql:repeter` (left out of the commands table).
- **Linux and Windows.** Only macOS was used.
- **The admin panel** was not run against this backend; that is outside this handbook.
- **`README.md` and `livraison/LISEZMOI.md`** are untouched. The README quick start still omits the four
  secrets and the seed; the handbook says so in its known gaps.
- **Nothing is pushed** and no pull request is open.

## Notes for the reviewer

- **The seed.** The user supplies it. The handbook says it must be a recent export. The failure with an old
  one is specific: it breaks `pnpm dev:preparer` (step 9) but not the container path, because the container
  applies `sql/arbitrage.sql` first. The sentence "restored 4,275 products" in sections 5 and 8 is the figure
  from this machine's stand-in seed, and will differ with another seed.
- **CI.** `.github/workflows/verifications.yml` runs `pnpm test -- --runInBand`. Locally under pnpm 11.6.0 that
  exact form found no tests and exited 1. I did not look at CI logs, so I cannot say whether CI is affected.
  Worth checking.
- **Files that still carry agency-specific text.** `documents/travailler-et-deployer.md` names individuals and
  another client and quotes an internal URL, and it ships in the repository (as does the history). The
  handbook copies none of it and tells readers to prefer the handbook where they differ. I left the file alone.
- **`TRUSTED_PROXY_HOPS`** is validated in `src/config/configuration.ts` but never read, and it is missing from
  `.env.example`. The service hard-codes one trusted proxy hop. The handbook documents that.
- **Numbers that will age**: 103 suites, 2,073 tests, about 85 seconds, 29 models, 18 pages. Each is stated
  "at the time of writing" or can be regenerated.
- **Admin handbooks.** The two admin handbooks and their specifications in `outputs/` and `tmp/` were updated by
  earlier requests (the 6 October update and the `dev:local` correction). They are committed in the same pull
  request as their own commit. This task did not change them.

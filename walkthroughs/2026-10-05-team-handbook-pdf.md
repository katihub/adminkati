## What I built

Created a nine-page A4 onboarding handbook for NowTech Admin engineers. It covers local installation,
environment configuration, local-backend login, daily checks, engineering conventions, critical
constraints, and the known SSR deployment path without inventing a platform-specific release process.

The finished PDF is `outputs/nowtech-admin-team-handbook.pdf`. Its English body retains French
product and API terms such as `motDePasse`, `connexion`, and `rafraichir`.

## Plan coverage

| Plan item | Status | Where |
| :-- | :-- | :-- |
| Author concise handbook specification | Done | `tmp/nowtech-admin-team-handbook.pdf.json` |
| Render selectable-text vector PDF | Done | `outputs/nowtech-admin-team-handbook.pdf` |
| Validate the delivered PDF | Done | PDF signature, Poppler parser metadata, text extraction, and selected page previews |
| Keep sibling backend and hosting runbooks out of scope | Done | Handbook sections 3 and 7 |

## Deviations

None. The handbook is nine pages rather than the planned approximate range of eight to twelve pages.

## Tests

This is a documentation deliverable, so no application tests, linter, or typecheck were applicable.

Validation run:

```text
node -e 'JSON.parse(...)'                       -> Handbook JSON is valid
node tmp/render-nowtech-admin-team-handbook.cjs -> Rendered outputs/nowtech-admin-team-handbook.pdf
file outputs/nowtech-admin-team-handbook.pdf    -> PDF document, version 1.3, 9 pages
head -c 5                                      -> %PDF-
pdfinfo                                        -> A4, 9 pages, not encrypted
pdftotext                                      -> 12,423 characters; all 8 section headings present
```

Rendered previews of the cover, system architecture, daily development loop, and deployment page
were inspected for legibility, clipping, and page layout. The temporary renderer and previews are
removed after verification; the PDF specification remains in `tmp/` as the internal source.

## Not done

- No installation or migration guide for the sibling NowTech backend, PostgreSQL, Supabase, or
  fixtures. The approved scope assumes a team-provided local backend.
- No platform-specific Vercel, domain, release-approval, or rollback procedure. This repository
  has no `vercel.json` or deployment workflow that establishes one.
- No application source, README, CI, or environment template was changed.

## Notes for the reviewer

The handbook deliberately points readers to `AGENTS.md` for exhaustive rules instead of duplicating
it. Deployment guidance is intentionally limited to the standard Nitro SSR build/run path and the
production environment requirements visible in this repository.

# Team handbook PDF

## Goal

Create a short, practical onboarding handbook PDF for engineers joining `nowtech-admin`. The handbook will use English prose while retaining the French product and API terms that appear in the application.

## Reuse and constraints

- Reuse the established project facts in `AGENTS.md`, `.env.example`, `package.json`,
  `nuxt.config.ts`, `.github/workflows/quality.yml`, and the local-backend assessment.
- Follow the repository's `now-tech` deliverable rule and the PDF-document authoring workflow.
- Deliver the generated PDF as an uncommitted, one-off file under `outputs/`.
- Do not change application source, CI, the root README, or environment files.

## Scope

The handbook will cover:

1. Project purpose, boundaries, architecture, and repository map.
2. Required tools and local installation with Bun.
3. Environment setup, secret handling, and required versus optional variables.
4. Connecting the admin to a local backend and signing in with local authentication bypass.
5. Development, validation, test, formatting, and code-health commands.
6. Git, pull-request, CI, TDD, agent-role, i18n, and component conventions.
7. Operational gotchas that commonly cause unsafe or broken changes.
8. SSR/Nitro production deployment, required production configuration, and deployment limitations
   known from this repository.
9. Pointers to the project instructions and postmortems for deeper reference.

The handbook will not document installing the sibling backend, Postgres, Supabase, or fixtures, and
will not invent a Vercel configuration or release process absent from this repository.

## Data and configuration facts

| Item | Source | Handbook treatment |
| :-- | :-- | :-- |
| Package manager | `bun.lock`, `package.json` | Bun is the sole supported package manager; use `bun install`. |
| Runtime configuration | `.env.example`, `nuxt.config.ts` | Explain required settings, public values, and server-only secrets without exposing values. |
| Local authentication | `server/utils/supabase.ts` | Explain non-production backend sign-in through `connexion` and `rafraichir`. |
| Quality gates | `.husky/pre-commit`, `quality.yml` | Show local checks and their PR CI equivalents. |
| Deployment | Nuxt/Nitro setup and `.github/workflows/quality.yml` | Give standard SSR build/run steps and state the missing repository-specific release pipeline. |

## Implementation steps

### 1. Author the handbook specification

**What changes:** Create a concise A4 handbook document specification with command tables, focused
callouts, and an architecture diagram.

**Where:** `tmp/nowtech-admin-team-handbook.pdf.json`

**Done when:** It covers the scoped topics in readable English and preserves relevant French product
terms without duplicating `AGENTS.md`.

### 2. Render the PDF

**What changes:** Convert the handbook into a selectable-text vector PDF.

**Where:** `outputs/nowtech-admin-team-handbook.pdf`

**Done when:** The output is non-empty and begins with the PDF file signature.

### 3. Validate and document delivery

**What changes:** Parse the generated PDF and record the actual validation result.

**Where:** `walkthroughs/2026-10-05-team-handbook-pdf.md`

**Done when:** The walkthrough names the generated file, accurately records the export checks, and
identifies out-of-scope deployment and backend setup details.

## Validation

- Validate that the PDF specification is valid JSON.
- Confirm the rendered file is non-empty and begins with `%PDF-`.
- Open the file with a PDF parser and confirm its page count and extractable text.

## Risks and mitigations

| Risk | Mitigation |
| :-- | :-- |
| A handbook exposes a credential | Use variable names and examples only; never read or include `.env`. |
| Deployment guidance becomes invented policy | State only the standard Nitro SSR path and explicitly mark absent platform-specific automation. |
| Local login instructions are unsafe in production | Explain that `NUXT_LOCAL_AUTH_BYPASS` is blocked outside non-production environments. |
| The handbook becomes an incomplete copy of agent instructions | Link readers to `AGENTS.md` and reserve the PDF for high-value onboarding actions and constraints. |

## Open questions

None. The delivery language, scope, and output location were confirmed: English body with French
product terms, admin plus local-backend login, and a one-off PDF in `outputs/`.

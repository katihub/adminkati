# French team handbook PDF

## Goal

Create a complete French edition of the NowTech Admin engineering handbook, separate from the
English handbook. It will preserve source-code paths, commands, environment variable names, and
French product/API identifiers exactly.

## Reuse and constraints

- Use `tmp/nowtech-admin-team-handbook.pdf.json` as the content and layout baseline.
- Keep the existing A4 visual language: the same headings, callouts, command tables, architecture
  diagram, and onboarding scope.
- Translate prose, labels, headings, and guidance into natural French, rather than producing
  parallel bilingual text.
- Do not change application source, CI, README, environment files, or the English handbook.
- Deliver only an uncommitted PDF under `outputs/`.

## Implementation steps

### 1. Translate the handbook specification

**What changes:** Create a French PDF document specification that preserves all factual guidance
and source identifiers from the English handbook.

**Where:** `tmp/nowtech-admin-team-handbook-fr.pdf.json`

**Done when:** Every reader-facing heading, explanation, callout, and table value is French, while
commands, variable names, paths, URLs, branch names, API endpoints, and exact code identifiers
remain unchanged.

### 2. Render the French PDF

**What changes:** Convert the French document specification to a selectable-text vector PDF.

**Where:** `outputs/nowtech-admin-team-handbook-fr.pdf`

**Done when:** It is a non-empty PDF and retains the readable A4 handbook layout.

### 3. Validate and document delivery

**What changes:** Parse and visually check the PDF, then record the result.

**Where:** `walkthroughs/2026-10-05-team-handbook-french-pdf.md`

**Done when:** The walkthrough reports the commands actually run, output page count, and any scope
limits.

## Validation

- Verify the French specification is valid JSON.
- Confirm the rendered file begins with `%PDF-`.
- Use a PDF parser to confirm page count, A4 dimensions, and extractable French text.
- Render selected pages to confirm French copy does not clip or overflow.

## Risks and mitigations

| Risk | Mitigation |
| :-- | :-- |
| Translation alters executable instructions | Preserve commands, paths, variables, URLs, endpoints, and code identifiers exactly. |
| French copy overruns the design | Parse and visually inspect rendered pages, then refine spacing if required. |
| Facts diverge from the English edition | Translate from the approved handbook specification rather than re-researching or adding scope. |

## Open questions

None. The request is for a full French companion PDF, not a bilingual rewrite of the existing
English edition.

---
name: mockup-to-plan
description: >-
  Turn a design mockup into a scoped implementation plan. Use when the user supplies a mockup
  (image, screenshot, .pen design file, Figma export, or rendered URL) together with a requirement
  and asks for a plan, or invokes /mockup-to-plan. Studies the mockup's visuals in exhaustive
  detail, maps every observed element to the stated requirement, eliminates the parts the
  requirement does not ask for, and emits a build plan. Produces a plan only — it never writes
  implementation code.
---

# Mockup to Plan

A mockup is a proposal, not a specification. It always carries more than the requirement asks for:
filler content, decorative flourishes, screens from a neighbouring feature, an entire nav the
requirement never mentions. Building the mockup verbatim ships scope nobody asked for. Building
only the requirement, without studying the mockup, throws away the design thinking.

This skill separates the two, then rejoins them: observe the mockup exhaustively → decompose the
requirement → map one to the other → cut the surplus → name the gaps → plan the build.

**This skill ends at a plan. Do not write implementation code while running it.**

---

## Step 0 — Collect inputs

Two inputs are mandatory:

1. **The mockup** — one or more of: image file, screenshot, `.pen` design file, exported frame, live URL.
2. **The requirement** — a ticket, spec, message, or issue stating what must be built.

If the requirement is missing, stop and ask for it. Without it there is nothing to eliminate
against, and this skill degrades into "copy the mockup" — which is the failure mode it exists to
prevent. A mockup alone is never a substitute for a requirement.

Read the mockup with the right tool:

| Mockup form | How to read it |
| :-- | :-- |
| `.pen` file | `pencil` MCP only — `get_app_state({include_schema: true, include_canvas_design: true, include_scripts_and_shaders: false})`, then `get_screenshot` / `export_nodes`. Never `Read` or `Grep` a `.pen` file. |
| Image / screenshot | Read the image directly so you actually see it. Never plan from a filename. |
| Live URL | `agent-browser` skill — navigate and screenshot at each target breakpoint. |
| Figma / exported frames | Read the exported images. Ask for a full-resolution export if the one supplied is too small to read type and spacing. |

If you cannot actually see the mockup, say so and stop. Never infer a design from its file name,
from the ticket title, or from what a screen of that kind "usually" looks like.

Also read the existing codebase before planning: the components, layouts, and design tokens that
already exist decide how much of the mockup is new work versus reuse. A plan that reinvents an
existing component is a bad plan.

---

## Step 1 — Visual study (exhaustive)

Observe. Do not yet judge, redesign, or filter. The goal is a complete written inventory of what is
actually on the canvas, precise enough that someone who has never seen the mockup could argue with
you about it.

Assign every element a stable ID — **M1, M2, M3…** — used by every later step.

Work through all of these, in this order:

**Structure**
- Page/screen count, and the flow between them.
- Layout skeleton: grid columns, gutters, max content width, sidebar/rail widths, sticky vs. scrolling regions.
- Vertical rhythm: section spacing, and where it deliberately breaks.
- Z-order: overlays, sheets, modals, popovers, toasts, sticky headers.

**Components**
- Every distinct component, named. Group repeats (`M12: stat card ×4`).
- For each: its anatomy (slots, leading/trailing icons, badges, actions), and its variants.
- Which are plausibly existing components in this codebase vs. genuinely new.

**Typography**
- Distinct type styles: size, weight, case, tracking, leading, colour.
- The hierarchy those styles imply (h1 → body → caption → label).
- Where the same visual weight is reused for different semantic roles, and vice versa.

**Colour and surface**
- Palette in use, mapped to existing design tokens where they match.
- Surfaces: background, card, elevated, inset; borders vs. shadows vs. fills.
- Semantic colour: success / warning / danger / info, and what triggers each.
- Whether a dark variant is shown, implied, or absent.

**Spacing and sizing**
- The spacing scale actually used; note values that fall off the project's scale.
- Control heights, icon sizes, avatar sizes, radii.

**Content and data**
- Every piece of text, verbatim where legible.
- Which strings are real copy vs. lorem/filler.
- Every data point rendered, and the shape it implies: type, format, units, precision, timezone.
- Counts shown in lists/tables — and whether they suggest pagination, infinite scroll, or a fixed set.

**States** — the most commonly missed, and the most expensive to retrofit
- Which states the mockup shows: default, hover, focus, active, disabled, loading, empty, error, partial, success.
- Which it does **not** show. List these explicitly as unshown, because they still have to be built.
- Skeleton/loading treatment, if any.
- Validation: inline vs. summary, and when it fires.

**Interaction**
- Every affordance: buttons, links, menus, drag handles, sortable headers, resizers, keyboard hints.
- Where each one leads or what it mutates.
- Motion or transition cues visible or annotated.

**Responsive**
- Breakpoints shown. If only one width is given, say so — the responsive behaviour is then undefined and becomes an open question, not an assumption.
- How the layout is intended to reflow.

**Accessibility signals**
- Text/background contrast that looks marginal.
- Hit targets that look under ~44px.
- Meaning carried by colour alone.
- Icon-only controls with no visible label.

Close this step with a plain-language summary of what the mockup is trying to do. If you cannot
state its intent in three sentences, you have not studied it enough.

---

## Step 2 — Decompose the requirement

Parse the requirement into atomic, individually testable statements. Number them **R1, R2, R3…**

Atomic means one obligation per line. Split compound sentences:

> "Admins can filter and export the user list"

becomes:
- `R4` — Admins can filter the user list.
- `R5` — Admins can export the user list.

Mark each requirement:
- **Explicit** — stated in the requirement text.
- **Implied** — a necessary consequence of an explicit one (an export needs a trigger; a filter needs a cleared state). Label these `R7*` so the user can challenge them.

Never invent requirements from the mockup. That is exactly the leak this skill prevents. If the
mockup shows something desirable that the requirement omits, it belongs in Step 4, not here.

---

## Step 3 — Map mockup to requirement

Build the trace matrix. Every `M` and every `R` must appear at least once.

| ID | Element | Requirement | Verdict | Note |
| :-- | :-- | :-- | :-- | :-- |
| M7 | Bulk-select checkbox column | R5 | MATCH | Needed to scope the export |
| M12 | "Trending this week" panel | — | MOCKUP-ONLY | No requirement covers it |
| M3 | Status filter pills | R4 | PARTIAL | Mockup shows 3 statuses, R4 names 5 |
| — | CSV column selection | R5 | REQUIREMENT-ONLY | Not designed |

Four verdicts, no others:

- **MATCH** — element serves a requirement. Build it.
- **PARTIAL** — element serves a requirement but is incomplete or contradicts it. Build it, adjusted; state the adjustment.
- **MOCKUP-ONLY** — element serves no requirement. Goes to Step 4.
- **REQUIREMENT-ONLY** — requirement has no design. Goes to Step 5.

Where the mockup and the requirement conflict outright (mockup shows 3 statuses, requirement names
5), **the requirement wins** and the conflict is recorded as an open question. Never silently
resolve a conflict in the mockup's favour.

---

## Step 4 — Eliminate

Cut every MOCKUP-ONLY element. State each cut and its reason — a silent cut is indistinguishable
from an oversight.

**Do not cut** an element merely because no requirement names it, when it is one of:

- **Structural** — the page does not hold together without it (a heading, the container, the nav the screen lives inside).
- **An affordance for a required action** — R5 says "export"; the export button is not surplus even if unnamed.
- **A required state** — empty, loading, and error states for a required surface are required, whether or not the requirement lists them.
- **An accessibility necessity** — labels, focus targets, skip links.

Everything else goes: decorative panels, adjacent-feature entry points, placeholder widgets,
secondary CTAs pointing at unbuilt screens, filler charts.

For anything genuinely ambiguous — plausibly structural, plausibly surplus — **do not decide
unilaterally**. List it under "Needs a decision" and ask. One question now is cheaper than a week
of work in either direction.

Record cuts so they can be revived later:

| ID | Element | Reason for cut |
| :-- | :-- | :-- |
| M12 | "Trending this week" panel | No requirement; belongs to the analytics epic |
| M19 | Secondary "Invite team" CTA | Targets a screen not in scope |

---

## Step 5 — Name the gaps

Every REQUIREMENT-ONLY row is undesigned work. For each, either:

- **Propose a design** grounded in what the mockup already establishes — reuse its components, spacing, and type scale so the addition is visually native. State that it is your proposal, not the designer's.
- **Flag it as blocking** when the requirement cannot be served without a real design decision.

Also list, from Step 1, the states the mockup never showed but the build needs. These are almost
always where estimates go wrong.

---

## Step 6 — Write the plan

Ordered by dependency, not by visual position on the mockup. Each phase must be independently
reviewable — a phase that cannot be demonstrated is too big.

Every task states: what changes, which files, and how you know it works.

Ground the plan in the actual codebase. Name real paths, real existing components, real tokens. A
plan that says "create a card component" in a project that already has one is a plan that will be
rewritten on contact.

Flag anything requiring backend work, a new dependency, a schema change, or a design decision
**before** it is buried inside a task list.

---

## Output template

```markdown
# Implementation Plan — <feature>

## 1. What the mockup shows
<Three-sentence intent, then the M-numbered inventory grouped by the Step 1 headings.>

## 2. What the requirement asks for
<R-numbered atomic list. Implied items marked with *.>

## 3. Mapping
<The Step 3 trace matrix.>

## 4. Cut from the mockup
<Table of eliminations with reasons.>

## 5. Gaps — required but not designed
<Undesigned requirements + unshown states, each with a proposal or a blocking flag.>

## 6. Build plan

### Phase 1 — <name>
- [ ] **Task** — what changes
  - Files: `path/to/file.vue`
  - Reuses: `<ExistingComponent>`
  - Serves: R1, R3
  - Done when: <observable check>

### Phase 2 — <name>
...

## 7. Data contracts
<Endpoints, payload shapes, and types the UI needs. Mark which exist and which do not.>

## 8. Test plan
<What gets a test and why. Do not list tests for the sake of coverage.>

## 9. Risks
<What could force a rework, and the earliest point it would surface.>

## 10. Needs a decision
<Numbered questions. Each states the options and your recommendation.>
```

---

## Hard rules

- **Plan only.** No implementation code. Snippets are allowed solely to pin down a contract or an ambiguous shape.
- **Never plan from a mockup you have not actually seen.** No inferring from filenames or ticket titles.
- **The requirement wins every conflict** with the mockup. Record the conflict; never resolve it silently.
- **Every cut is stated with its reason.** Silent cuts read as oversights.
- **Ambiguity is a question, not a guess.** Genuinely unclear scope goes to "Needs a decision".
- **Reuse before creation.** Search the codebase for an existing component before planning a new one.
- **Unshown states are still scope.** List them; do not let the mockup's silence shrink the estimate.

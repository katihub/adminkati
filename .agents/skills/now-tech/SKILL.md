---
name: now-tech
description: >-
  The standing deliverable rule for nowtech-admin — planning writes a file to plans/, every
  implementation that had a plan writes a walkthrough to walkthroughs/, every review writes a file
  to reviews/, every report or audit writes a file to reports/. Always in force, for every agent,
  role, and tool. Load it before finishing any planning, implementation, review, audit, or
  investigation task, and whenever you need the file name, slug, or contents of one of those four
  artifacts.
---

# Now-Tech

Work in this repo leaves a written trace. Four kinds of work, four folders, no exceptions:
**a plan, a walkthrough, a review, a report.**

This is not a workflow you opt into. It applies to every agent in every tool, whether or not a role
from [`agent-roles`](../agent-roles/SKILL.md) was formally adopted, and whether the work was done by
a sub-agent or by one agent doing all of it alone.

## The rule

| When you finish… | Write | Path |
| :-- | :-- | :-- |
| Planning — a requirement, ticket, or mockup turned into an executable plan | a **plan** | `plans/YYYY-MM-DD-<slug>.md` |
| Implementing something that had a plan | a **walkthrough** | `walkthroughs/YYYY-MM-DD-<slug>.md` |
| Reviewing an implementation | a **review** | `reviews/YYYY-MM-DD-<slug>.md` |
| A report, audit, or investigation with no plan behind it | a **report** | `reports/YYYY-MM-DD-<kind>-<slug>.md` |

`<kind>` for reports is one of `audit`, `perf`, `research`, `postmortem`, `assessment`.

**The date is today's real date.** Run `date +%F` and use what it prints. Do not infer it from a
neighbouring filename, the last commit, or memory.

## The slug

One kebab-case slug threads a feature through all three folders — `orders-table`,
`kyc-detail-page`. The plan names it; the walkthrough and the review reuse it verbatim, so
`plans/2026-08-27-orders-table.md`, `walkthroughs/2026-08-27-orders-table.md`, and
`reviews/2026-08-27-orders-table.md` read as one story.

Pick it once, in the plan, and never rename it. If you are writing a walkthrough or a review,
**read the plan's filename and copy its slug** rather than deriving a new one.

The date prefix can differ across the three — implementation and review happen on later days than
the plan. The slug cannot.

## What goes in each file

Each folder's `README.md` owns its rules, and the role playbooks own the templates. Follow them; do
not improvise a structure.

| Artifact | Structure comes from |
| :-- | :-- |
| Plan | [`.agents/agents/planner.md`](../../agents/planner.md) — or the [`mockup-to-plan`](../mockup-to-plan/SKILL.md) skill when a mockup is involved |
| Walkthrough | [`.agents/agents/implementer.md`](../../agents/implementer.md) — template included there |
| Review | [`review-work`](../review-work/SKILL.md) skill — output template included there |
| Report | [`reports/README.md`](../../../reports/README.md) — question, method, findings with evidence, recommendation, scope limits |

## The gate

Before you report a task as finished, check the one that applies:

- **Planned something?** The plan file exists on disk, and your reply names its path.
- **Implemented against a plan?** The walkthrough exists, reuses the plan's slug, and every test result in it is output you actually watched print.
- **Reviewed something?** The review exists, reuses the slug, and its findings are ordered MAJOR → MEDIUM → MINOR → INT.
- **Ran an audit or investigation?** The report exists, and it states what it did *not* examine.

A task whose artifact is missing is not finished. Answering in chat is not a substitute — chat is
lost at the end of the session, and the next agent starts from these files.

## When it does not apply

The rule is about work that produces a decision or a change worth reconstructing later. It is not a
tax on every keystroke.

- **No plan, no walkthrough.** A walkthrough is required exactly when a plan exists. If feature work is large enough to need one and has none, that is a missing plan — write the plan first, do not skip both.
- **No artifact for**: answering a question, reading or explaining code, a typo fix, a dependency bump, a lockfile update, a formatting-only change, or any chore with nothing to decide.
- **Skip it when the user says to skip it.** They can waive an artifact; you cannot waive it for them, and "it felt small" is not a waiver.

## Rules

- **Write the artifact as part of the task, not after being asked.** Being asked means the rule already failed.
- **One file per unit of work.** A plan covering three features is three plans. A walkthrough covering two plans is two walkthroughs.
- **Never edit a frozen artifact.** A plan freezes when implementation starts — deviations go in the walkthrough. Reviews are append-only — follow-ups are new dated files.
- **Accuracy over completeness.** "Partial", "skipped", and "not examined" are valid content. An artifact that overstates what happened aims the next reader away from the problem.
- **Superseded files stay.** They are the record of why the current shape was chosen.

---

The canonical copy of this skill is `.agents/skills/now-tech/SKILL.md`. Every tool's skills
directory symlinks to it.

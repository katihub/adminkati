# Plans

Implementation plans. Written by the **planner** role before any code is written.

- **File name:** `YYYY-MM-DD-<slug>.md`
- **Slug:** short, kebab-case, names the feature — `orders-table`, `kyc-detail-page`.

The slug is the thread that ties the whole loop together. The plan, its walkthrough, and its review
all share it, so `2026-08-26-orders-table.md` exists in `plans/`, `walkthroughs/`, and `reviews/`
and the three can be read as one story.

## What belongs in a plan

Every task names what changes, which files, and how you know it works. Plus data contracts, the
required loading/empty/error states, the test plan, risks, and open questions.

The full structure is in `.agents/agents/planner.md`. When a mockup is involved, the
`mockup-to-plan` skill supplies the template.

## Rules

- One plan per feature. A plan that has grown to cover three features is three plans.
- A plan is a living document until implementation starts, then it freezes. Deviations get recorded in the walkthrough, not by quietly editing the plan.
- Superseded plans stay. They are the record of why the current shape was chosen.

---

When a plan is mandatory — and the rule that gates "done" on it — is the `now-tech` skill
(`.agents/skills/now-tech/SKILL.md`), which every agent keeps in force.

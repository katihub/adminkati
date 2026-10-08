# Reports

Standalone reports and audits — work that is not tied to a single plan. Security audits,
performance investigations, dependency reviews, research write-ups, architecture assessments,
incident post-mortems.

- **File name:** `YYYY-MM-DD-<kind>-<slug>.md`
- **Kind:** `audit`, `perf`, `research`, `postmortem`, `assessment`.

Examples: `2026-08-26-audit-auth-endpoints.md`, `2026-08-26-perf-orders-table.md`.

## Reports vs. reviews

A **review** judges one implementation against its plan. A **report** investigates a question that
spans the codebase and has no plan behind it. If it has a slug in `plans/`, it is a review.

## What belongs in a report

State the question, the method (what was actually examined, and what was not), the findings with
evidence, and the recommendation. Scope limits are part of the finding — a report that does not say
what it left out reads as complete when it is not.

---

When a report is mandatory — every audit or investigation with no plan behind it — is the
`now-tech` skill (`.agents/skills/now-tech/SKILL.md`), which every agent keeps in force.

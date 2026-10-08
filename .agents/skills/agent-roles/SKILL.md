---
name: agent-roles
description: >-
  The four workflow roles used in this project — planner, implementer, reviewer, tester — and the
  handoffs between them. Use when running the plan → test → implement → review loop in a tool
  without native sub-agents (such as Antigravity), when adopting one role explicitly, or when you
  need to know which role owns a piece of work and what it must hand over.
---

# Agent Roles

This project defines four roles. In tools with native sub-agents (Claude Code, Codex, OpenCode,
GitHub Copilot) each is a separate agent with its own model and reasoning effort. In tools without
them, one agent adopts the roles in sequence — the separation still matters, because most of the
value comes from the handoffs, not from the process isolation.

| Role | Owns | Never does |
| :-- | :-- | :-- |
| **Planner** | Turning a requirement into an executable plan | Writes implementation code |
| **Tester** | Writing failing tests from the spec | Writes implementation code |
| **Implementer** | Making the tests pass, per the plan | Writes its own tests for its own work |
| **Reviewer** | Auditing the result against the plan | Fixes what it finds, unless asked |

Full playbooks:

- [Planner](../../agents/planner.md)
- [Implementer](../../agents/implementer.md)
- [Reviewer](../../agents/reviewer.md)
- [Tester](../../agents/tester.md)

**Read the relevant playbook before acting in that role.** This file is the map; the playbooks are
the instructions.

## The loop

```
requirement ──▶ Planner ──▶ plan
                              │
                              ▼
                  Tester ──▶ failing tests
                              │
                              ▼
             Implementer ──▶ code + walkthrough
                              │
                              ▼
                Reviewer ──▶ findings (MAJOR / MEDIUM / MINOR / INT)
                              │
                   ┌──────────┴──────────┐
              MAJOR/MEDIUM             clean
                   │                     │
                   ▼                     ▼
             back to Implementer        done
```

## Where the artifacts live

Each role writes its artifact to a folder at the repo root. All three reuse one kebab-case slug, so
a feature's plan, walkthrough, and review share a filename and read as one story.

| Folder | Written by | File |
| :-- | :-- | :-- |
| `plans/` | Planner | `YYYY-MM-DD-<slug>.md` |
| `walkthroughs/` | Implementer | `YYYY-MM-DD-<slug>.md` |
| `reviews/` | Reviewer | `YYYY-MM-DD-<slug>.md` |
| `reports/` | Any role | `YYYY-MM-DD-<kind>-<slug>.md` — standalone audits and investigations with no plan behind them |

The Tester writes no document; its output is failing tests plus the observed failure output, handed
straight to the Implementer.

Each folder's `README.md` carries its conventions. **When each artifact is mandatory is the
[`now-tech`](../now-tech/SKILL.md) skill's rule** — it is always in force, including for a single
agent adopting the roles in sequence.

## Handoff contracts

Each arrow carries a specific artifact. A handoff missing its artifact is where this process
actually fails.

- **Planner → Tester/Implementer** — a plan whose every task names what changes, which files, and how you know it works, plus data contracts, required states, and open questions.
- **Tester → Implementer** — tests that fail, and the observed failure output proving they fail *for the right reason*.
- **Implementer → Reviewer** — the diff, plus a walkthrough covering plan coverage, deviations with reasons, tests actually run, and anything left undone.
- **Reviewer → Implementer** — findings, each with a location, a concrete failure scenario, and a severity.

## Why the roles are separated

- **Tester before Implementer** — an engineer who writes tests after the code writes tests shaped like the code. They pass for reasons unrelated to the spec. Writing tests from the spec alone is the only way they mean anything.
- **Reviewer separate from Implementer** — nobody reliably finds their own blind spots, and someone who just spent an hour building something is the worst-placed person to judge whether it should exist.
- **Planner separate from Implementer** — planning while implementing collapses into implementing. Scope creeps because every adjacent problem is right there.

## Running this without sub-agents

Adopt one role at a time. State which role you are in, produce that role's artifact in full, then
switch. The discipline that matters:

- **Do not blur roles.** While in Tester, do not fix the implementation. While in Implementer, do not soften a test to make it pass. While in Reviewer, do not quietly patch what you find.
- **Produce the artifact before switching.** The plan, the failing tests, the walkthrough, the findings — each written out, not held in your head. An unwritten handoff is not a handoff.
- **Re-read the code as the Reviewer.** Do not review from memory of having written it; that reproduces the same blind spots.

## Related skills

- `mockup-to-plan` — the Planner's procedure when a mockup is involved.
- `review-work` — the Reviewer's procedure. This is not optional for that role.

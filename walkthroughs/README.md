# Walkthroughs

Accounts of what was actually built. Written by the **implementer** role when a plan item is done.

- **File name:** `YYYY-MM-DD-<slug>.md` — the same slug as the plan it implements.

## What belongs in a walkthrough

What was built, plan coverage (done / partial / skipped, with file references), deviations from the
plan and why, the tests actually run with their real output, what was left undone, and notes for the
reviewer.

The full template is in `.agents/agents/implementer.md`.

## Rules

- **Accuracy is the whole point.** The reviewer checks every claim against the diff. A walkthrough that overstates what was done is worse than none — it aims the review away from where the problem is.
- **Never claim a passing test you did not watch pass.** Paste what the command actually printed.
- **Partial is a valid outcome.** Say so plainly rather than shrinking the scope in silence.
- Record deviations here, not by editing the frozen plan.

---

When a walkthrough is mandatory — every implementation that had a plan — is the `now-tech` skill
(`.agents/skills/now-tech/SKILL.md`), which every agent keeps in force.

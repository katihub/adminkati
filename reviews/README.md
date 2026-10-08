# Reviews

Reviews of completed implementations. Written by the **reviewer** role.

- **File name:** `YYYY-MM-DD-<slug>.md` — the same slug as the plan and walkthrough it reviews.

## What belongs in a review

A verdict, the plan-fidelity audit, a walkthrough-accuracy check, and findings ordered
**MAJOR → MEDIUM → MINOR → INT**. Each finding carries a location, a concrete failure scenario, and
a fix. Axes that came back clean are named explicitly.

The procedure and template are in the `review-work` skill.

## Rules

- **The code is the authority**, not the walkthrough. Any claim the code contradicts is MAJOR.
- **Every finding needs a location and a concrete failure.** No location, no finding.
- **Report; do not fix**, unless asked.
- Reviews are append-only. When findings are addressed, the follow-up goes in a new dated file rather than editing the original — the history of what was caught is worth keeping.

---

When a review file is mandatory — and the rule that gates "done" on it — is the `now-tech` skill
(`.agents/skills/now-tech/SKILL.md`), which every agent keeps in force.

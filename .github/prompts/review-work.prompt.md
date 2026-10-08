---
agent: 'agent'
description: 'Review an implementation against its plan and walkthrough across security, logic and correctness, performance, UI/UX, tests, and code quality. Reports findings ordered MAJOR, MEDIUM, MINOR, INT.'
tools: ['edit/editFiles', 'search', 'runCommands/terminalSelection', 'runCommands/terminalLastCommand', 'runTasks', 'usages', 'problems', 'changes', 'testFailure', 'fetch', 'githubRepo']
---

Read `.agents/skills/review-work/SKILL.md` and follow it in full for this task.

Get the real diff before reading the walkthrough, audit plan fidelity, then review all six quality
axes. Verify every finding against the code and run the tests yourself rather than trusting the
walkthrough's claims.

Report findings ordered MAJOR, MEDIUM, MINOR, INT using the skill's output template. Report only —
do not apply fixes unless explicitly asked.

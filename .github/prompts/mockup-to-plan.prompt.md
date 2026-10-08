---
agent: 'agent'
description: 'Study a mockup in detail, map it to the requirement, eliminate what the requirement does not ask for, and produce an implementation plan.'
tools: ['edit/editFiles', 'search', 'runCommands/terminalSelection', 'runCommands/terminalLastCommand', 'usages', 'problems', 'changes', 'fetch', 'githubRepo']
---

Read `.agents/skills/mockup-to-plan/SKILL.md` and follow it in full for this task.

Run every step in order: collect inputs, exhaustive visual study, decompose the requirement, build
the mapping matrix, eliminate mockup-only elements with stated reasons, name the undesigned gaps,
then write the plan using the skill's output template.

Hard rules from the skill apply — in particular: never plan from a mockup you have not actually
seen, the requirement wins every conflict with the mockup, and this command ends at a plan rather
than at implementation code.

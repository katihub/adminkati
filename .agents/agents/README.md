# Agent Roles — canonical playbooks

`planner.md`, `implementer.md`, `reviewer.md`, and `tester.md` in this directory are the **single
source of truth** for what each role does. Every tool's native agent definition mirrors them.

**Edit the playbook here.** Then propagate to the per-tool files below — they carry tool-specific
frontmatter, so they cannot be symlinks the way the skills in `.agents/skills/` are.

## Model matrix

| Role | Anthropic | OpenAI (Codex) |
| :-- | :-- | :-- |
| Planner | Opus 5 · high | GPT-5.6-Sol · medium |
| Implementer | Sonnet 5 · medium | GPT-5.6-Luna · medium |
| Reviewer | Sonnet 5 · xhigh | GPT-5.6-Terra · xhigh |
| Tester | Sonnet 5 · high | GPT-5.6-Terra · high |

## Where each tool reads its definitions

| Tool | Location | Format |
| :-- | :-- | :-- |
| Claude Code | `.claude/agents/<role>.md` | Frontmatter: `name`, `description`, `model`, `reasoning_effort`, `tools` |
| Codex | `.codex/config.toml` → `[agents.<role>]` → `.codex/agents/<role>.toml` | TOML: `model`, `model_reasoning_effort`, `sandbox_mode`, `model_instructions_file` |
| OpenCode | `.opencode/agent/<role>.md` | Frontmatter: `description`, `mode: subagent`, `model`, `reasoningEffort`, `tools` |
| GitHub Copilot | `.github/agents/<role>.agent.md` | Frontmatter: `description`, `tools`. Model comes from Copilot's own picker. |
| Antigravity | `.agents/skills/agent-roles/SKILL.md` | No native sub-agents — the roles are adopted in sequence by one agent. |

## Output folders

| Folder | Written by | File |
| :-- | :-- | :-- |
| `plans/` | Planner | `YYYY-MM-DD-<slug>.md` |
| `walkthroughs/` | Implementer | `YYYY-MM-DD-<slug>.md` |
| `reviews/` | Reviewer | `YYYY-MM-DD-<slug>.md` |
| `reports/` | Any role | `YYYY-MM-DD-<kind>-<slug>.md` |

One slug threads a feature through `plans/` → `walkthroughs/` → `reviews/`. Conventions live in each
folder's `README.md`; **when each file is mandatory is the `now-tech` skill's rule**
(`.agents/skills/now-tech/SKILL.md`), which every role loads and keeps in force.

## Notes

- **Codex** points at these playbooks directly via `model_instructions_file`, so it needs no copy — edits here take effect immediately.
- **Copilot** cannot pin a model from config; its roster comes from the subscription. Each `.agent.md` records the intended model at the top so it can be set in the picker.
- **Antigravity** supports rules, skills, plugins, hooks, and MCP — but not sub-agents. The `agent-roles` skill carries the same role separation and handoff contracts for a single-agent run.

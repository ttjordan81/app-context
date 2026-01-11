# Mini Brain (Windsurf / Cascade Instructions)

This repo uses @contextlab/app-context to generate runtime context for agents.

## Where to look

- agent-state/AGENT_CONTEXT.md
- agent-state/OPEN_ISSUES.md
- agent-state/RUNBOOK.md
- agent-state/AGENT_PLAYBOOK.md

## How to use it

- Before making changes, read the files above to understand current behavior, error patterns, and open issues.
- Treat these as *runtime signals*, not source-of-truth over code.
- Do not ingest or request secrets; the event stream is intentionally sanitized.

## Updating context

Run:

- npx app-context summarize --output ./agent-state --tail 2000


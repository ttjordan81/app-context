# App Context (Windsurf / Cascade Instructions)

This repo uses @contextlab/app-context to generate runtime context for agents.

## Where to look

- ../../../../../../../tmp/test-agent-state/AGENT_CONTEXT.md
- ../../../../../../../tmp/test-agent-state/OPEN_ISSUES.md
- ../../../../../../../tmp/test-agent-state/RUNBOOK.md
- ../../../../../../../tmp/test-agent-state/BUSINESS_GOAL.md
- ../../../../../../../tmp/test-agent-state/AGENT_PLAYBOOK.md

## How to use it

- Before making changes, read the files above to understand current behavior, error patterns, and open issues.
- Treat these as *runtime signals*, not source-of-truth over code.
- Do not ingest or request secrets; the event stream is intentionally sanitized.

## Updating context

Run:

- npx app-context summarize --output ./../../../../../../../tmp/test-agent-state --tail 2000


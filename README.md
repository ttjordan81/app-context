# @contextlab/app-context

**Keep your AI coding assistant up to speed.**

NPM DOWNLOAD - https://www.npmjs.com/package/@contextlab/app-context

App-context generates structured, sanitized Markdown context from your app's runtime activity, so Windsurf, Cursor, and other AI coding assistants can quickly understand what your app is actually doing (behavior, error patterns, and real API usage) without you reconstructing history or copy-pasting logs.

App-context is for:
- Debugging faster with real request/error patterns
- Returning to a project (or handing it off) with accurate, up-to-date context
- Getting Windsurf/Cursor productive immediately with minimal manual explanation

## Why this exists

When you come back to a project (or hand it off), the hardest part is usually missing context: what's happening right now, what's failing, and how the API is really being used.

You're working in Windsurf/Cascade and ask: *"Why is the `/api/submissions` endpoint returning 400s?"*

Instead of you manually explaining:
- Which routes exist
- What validation errors are happening
- How often errors occur vs successes

...the agent reads `agent-state/AGENT_CONTEXT.md` and `OPEN_ISSUES.md` (auto-generated from your app's runtime events) and immediately sees:

```markdown
## API Routes (last 2000 events)
- POST /api/submissions: 45 requests, 12 errors (26.7% error rate)
- GET /api/submissions: 89 requests, 0 errors

## Open Issues
- submission.validation_failed: 12 occurrences (missing fields: name, email)
```

Now the agent knows exactly what's broken and can propose a fix without you copy-pasting logs or explaining the codebase.

## Install

```bash
npm i @contextlab/app-context
```

## Quick start (Express)

```js
import express from "express";
import { createAppContext } from "@contextlab/app-context";

const app = express();
app.use(express.json());

const appContext = createAppContext({
  appName: "my-app",
  outputDir: "./agent-state",
  excludeRoutes: ["/health"],
});

app.use(appContext.middleware());

app.post("/api/thing", (req, res) => {
  appContext.emit("thing.created", { source: "api" });
  res.status(201).json({ ok: true });
});

app.listen(3000);
```

## CLI

Initialize agent files:

```bash
npx app-context init --output ./agent-state
```

Summarize events into markdown:

```bash
npx app-context summarize --output ./agent-state --tail 2000
```

## Auto-Update Workflow (Recommended)

For real-time context updates during development, use a file watcher to automatically run summarize when events are logged:

**1. Install nodemon:**
```bash
npm install --save-dev nodemon npm-run-all
```

**2. Add scripts to your `package.json`:**
```json
{
  "scripts": {
    "start": "node server.js",
    "watch-context": "nodemon --watch agent-state/events.ndjson --exec 'npx app-context summarize --output ./agent-state --tail 2000'",
    "dev": "npm-run-all --parallel start watch-context"
  }
}
```

**3. Run with auto-update:**
```bash
npm run dev
```

This keeps your agent-state files fresh without manual intervention. Every time your app logs events, the context files automatically update.

## Outputs

`app-context summarize` generates:

- `AGENT_CONTEXT.md`
- `OPEN_ISSUES.md`
- `RUNBOOK.md`
- `BUSINESS_GOAL.md` (created once if missing; human-authored)
- `AGENT_PLAYBOOK.md` (created once if missing)

It also writes `events.ndjson` (append-only) into the same output directory.

## Data hygiene

This library is designed to avoid logging request bodies and secrets. You should still review what you choose to emit via `appContext.emit()`.

# @contextlab/app-context

Capture sanitized request + domain events from a Node/Express app, write them as NDJSON, and generate markdown context files that are easy for agents (Windsurf/Cascade, Cursor, etc.) to consume.

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

## Outputs

`app-context summarize` generates:

- `AGENT_CONTEXT.md`
- `OPEN_ISSUES.md`
- `RUNBOOK.md`
- `AGENT_PLAYBOOK.md` (created once if missing)

It also writes `events.ndjson` (append-only) into the same output directory.

## Data hygiene

This library is designed to avoid logging request bodies and secrets. You should still review what you choose to emit via `appContext.emit()`.

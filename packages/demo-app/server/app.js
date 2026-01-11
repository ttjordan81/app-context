import express from "express";
import { createAppContext } from "@contextlab/app-context";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
app.use(express.json());

const here = path.dirname(fileURLToPath(import.meta.url));
const agentStateDir = path.resolve(here, "../agent-state");

const appContext = createAppContext({
  appName: "demo-app",
  outputDir: agentStateDir,
  excludeRoutes: ["/health"],
});

app.use(appContext.middleware());

const submissions = [];

app.get("/health", (_req, res) => res.status(200).send("ok"));

app.get("/api/submissions", (_req, res) => {
  res.json({ submissions });
});

app.post("/api/submissions", (req, res) => {
  const { name, email, message } = req.body || {};
  const missing = [
    !name ? "name" : null,
    !email ? "email" : null,
    !message ? "message" : null,
  ].filter(Boolean);

  if (missing.length) {
    appContext.emit("submission.validation_failed", { missingFieldsCount: missing.length });
    return res.status(400).json({ error: "Validation failed", missing });
  }

  // occasional simulated error
  if (Math.random() < 0.05) {
    appContext.emit("submission.create_failed", { reason: "simulated_500" });
    return res.status(500).json({ error: "Simulated server error" });
  }

  const created = {
    id: `sub_${Date.now()}`,
    name,
    email,
    message,
    createdAt: new Date().toISOString(),
  };

  submissions.unshift(created);
  appContext.emit("submission.created", { source: "web" });
  res.status(201).json({ submission: created });
});

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, () => {
  console.log(`demo-app listening on http://localhost:${port}`);
});

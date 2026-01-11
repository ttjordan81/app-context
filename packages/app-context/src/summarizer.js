import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readLastLines, ensureDir } from "./util/file.js";

export async function summarize({ outputDir = "./agent-state", tail = 2000 } = {}) {
  const resolved = path.resolve(process.cwd(), outputDir);
  ensureDir(resolved);

  const eventsPath = path.join(resolved, "events.ndjson");
  const lines = readLastLines(eventsPath, tail);

  const events = [];
  for (const line of lines) {
    try {
      events.push(JSON.parse(line));
    } catch (_e) {}
  }

  const routeCounts = new Map();
  const errorCounts = new Map();
  const domainCounts = new Map();
  const recentDomain = [];

  for (const e of events) {
    if (e.type === "request") {
      const key = `${e.method} ${e.path}`;
      routeCounts.set(key, (routeCounts.get(key) || 0) + 1);
      if (typeof e.status === "number" && e.status >= 400) {
        const ek = `${e.status} ${e.method} ${e.path}`;
        errorCounts.set(ek, (errorCounts.get(ek) || 0) + 1);
      }
    }

    if (e.type === "domain") {
      domainCounts.set(e.name, (domainCounts.get(e.name) || 0) + 1);
      recentDomain.push(e);
    }
  }

  const topRoutes = [...routeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const topErrors = [...errorCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const topDomain = [...domainCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const lastDomain = recentDomain.slice(Math.max(0, recentDomain.length - 10));

  const now = new Date().toISOString();

  fs.writeFileSync(
    path.join(resolved, "AGENT_CONTEXT.md"),
    `# AGENT_CONTEXT\n\nLast updated: ${now}\n\n## Top Routes\n\n${formatPairs(topRoutes)}\n\n## Top Errors\n\n${formatPairs(topErrors)}\n\n## Top Domain Events\n\n${formatPairs(topDomain)}\n\n## Recent Domain Events\n\n${formatRecentDomain(lastDomain)}\n`,
    "utf8"
  );

  fs.writeFileSync(
    path.join(resolved, "OPEN_ISSUES.md"),
    `# OPEN_ISSUES\n\nLast updated: ${now}\n\n## Issues\n\n${formatIssues(topErrors)}\n`,
    "utf8"
  );

  const runbookPath = path.join(resolved, "RUNBOOK.md");
  if (!fs.existsSync(runbookPath)) {
    fs.writeFileSync(runbookPath, "# RUNBOOK\n", "utf8");
  }

  const playbookPath = path.join(resolved, "AGENT_PLAYBOOK.md");
  if (!fs.existsSync(playbookPath)) {
    // create via init() semantics
    const here = path.dirname(fileURLToPath(import.meta.url));
    const templatePath = path.join(here, "templates", "AGENT_PLAYBOOK.md");
    const template = fs.readFileSync(templatePath, "utf8");
    fs.writeFileSync(playbookPath, template, "utf8");
  }
}

function formatPairs(pairs) {
  if (!pairs.length) return "(none)";
  return pairs.map(([k, v]) => `- ${k}: ${v}`).join("\n");
}

function formatIssues(topErrors) {
  if (!topErrors.length) return "(none)";
  return topErrors
    .map(([k, v]) => {
      return `- ${k} (count: ${v})\n  - Suggested next step: reproduce and inspect server logs for this route.`;
    })
    .join("\n");
}

function formatRecentDomain(events) {
  if (!events.length) return "(none)";
  return events.map((e) => `- ${e.ts} ${e.name}`).join("\n");
}

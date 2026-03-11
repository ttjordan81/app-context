const fs = require("node:fs");
const path = require("node:path");
const { readLastLines, ensureDir } = require("./util/file.cjs");

async function summarize({ outputDir = "./agent-state", tail = 2000 } = {}) {
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
  const routeErrorCounts = new Map();
  const errorCounts = new Map();
  const domainCounts = new Map();
  const recentDomain = [];

  for (const e of events) {
    if (e.type === "request") {
      const key = `${e.method} ${e.path}`;
      routeCounts.set(key, (routeCounts.get(key) || 0) + 1);
      if (typeof e.status === "number" && e.status >= 400) {
        routeErrorCounts.set(key, (routeErrorCounts.get(key) || 0) + 1);
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
    `# AGENT_CONTEXT\n\nLast updated: ${now}\n\n## Top Routes\n\n${formatRoutes(topRoutes, routeErrorCounts)}\n\n## Top Errors\n\n${formatPairs(topErrors)}\n\n## Top Domain Events\n\n${formatPairs(topDomain)}\n\n## Recent Domain Events\n\n${formatRecentDomain(lastDomain)}\n`,
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

  const here = __dirname;
  const businessGoalPath = path.join(resolved, "BUSINESS_GOAL.md");
  if (!fs.existsSync(businessGoalPath)) {
    const templatePath = path.join(here, "templates", "BUSINESS_GOAL.md");
    const template = fs.readFileSync(templatePath, "utf8");
    fs.writeFileSync(businessGoalPath, template, "utf8");
  }

  const playbookPath = path.join(resolved, "AGENT_PLAYBOOK.md");
  if (!fs.existsSync(playbookPath)) {
    const templatePath = path.join(here, "templates", "AGENT_PLAYBOOK.md");
    const template = fs.readFileSync(templatePath, "utf8");
    fs.writeFileSync(playbookPath, template, "utf8");
  }

  console.log(`✓ Updated AGENT_CONTEXT.md, OPEN_ISSUES.md (${events.length} events processed)`);
}

function formatPairs(pairs) {
  if (!pairs.length) return "(none)";
  return pairs.map(([k, v]) => `- ${k}: ${v}`).join("\n");
}

function formatRoutes(routes, routeErrorCounts) {
  if (!routes.length) return "(none)";
  return routes
    .map(([route, total]) => {
      const errors = routeErrorCounts.get(route) || 0;
      if (errors > 0) {
        const rate = ((errors / total) * 100).toFixed(1);
        return `- ${route}: ${total} requests, ${errors} errors (${rate}% error rate)`;
      }
      return `- ${route}: ${total} requests, 0 errors`;
    })
    .join("\n");
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

module.exports = { summarize };

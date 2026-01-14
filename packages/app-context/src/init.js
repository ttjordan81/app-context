import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureDir } from "./util/file.js";

export async function initAgentState({ outputDir = "./agent-state" } = {}) {
  const resolved = path.resolve(process.cwd(), outputDir);
  ensureDir(resolved);

  const projectRoot = process.cwd();

  const businessGoalTarget = path.join(resolved, "BUSINESS_GOAL.md");
  if (!fs.existsSync(businessGoalTarget)) {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const templatePath = path.join(here, "templates", "BUSINESS_GOAL.md");
    const template = fs.readFileSync(templatePath, "utf8");
    fs.writeFileSync(businessGoalTarget, template, "utf8");
  }

  const playbookTarget = path.join(resolved, "AGENT_PLAYBOOK.md");
  if (!fs.existsSync(playbookTarget)) {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const templatePath = path.join(here, "templates", "AGENT_PLAYBOOK.md");
    const template = fs.readFileSync(templatePath, "utf8");
    fs.writeFileSync(playbookTarget, template, "utf8");
  }

  const agentsMdPath = path.join(projectRoot, "AGENTS.md");
  if (!fs.existsSync(agentsMdPath)) {
    const relAgentState = path.relative(projectRoot, resolved) || "agent-state";
    const content = `# App Context (Windsurf / Cascade Instructions)\n\nThis repo uses @contextlab/app-context to generate runtime context for agents.\n\n## Where to look\n\n- ${relAgentState}/AGENT_CONTEXT.md\n- ${relAgentState}/OPEN_ISSUES.md\n- ${relAgentState}/RUNBOOK.md\n- ${relAgentState}/BUSINESS_GOAL.md\n- ${relAgentState}/AGENT_PLAYBOOK.md\n\n## How to use it\n\n- Before making changes, read the files above to understand current behavior, error patterns, and open issues.\n- Treat these as *runtime signals*, not source-of-truth over code.\n- Do not ingest or request secrets; the event stream is intentionally sanitized.\n\n## Updating context\n\nRun:\n\n- npx app-context summarize --output ./${relAgentState} --tail 2000\n\n`;
    fs.writeFileSync(agentsMdPath, content, "utf8");
  }

  const windsurfRulesDir = path.join(projectRoot, ".windsurf", "rules");
  ensureDir(windsurfRulesDir);
  const windsurfRulePath = path.join(windsurfRulesDir, "app-context.md");
  if (!fs.existsSync(windsurfRulePath)) {
    const relAgentState = path.relative(projectRoot, resolved) || "agent-state";
    const content = `# App Context Files\n\n- When working on bugs or behavior changes, consult ${relAgentState}/AGENT_CONTEXT.md and ${relAgentState}/OPEN_ISSUES.md first.\n- Prefer small, safe changes. Never log request bodies, headers, tokens, or secrets.\n`;
    fs.writeFileSync(windsurfRulePath, content, "utf8");
  }

  const cursorRulesPath = path.join(projectRoot, ".cursorrules");
  if (!fs.existsSync(cursorRulesPath)) {
    const relAgentState = path.relative(projectRoot, resolved) || "agent-state";
    const content = `# App Context Instructions\n\n- Read ${relAgentState}/AGENT_CONTEXT.md and ${relAgentState}/OPEN_ISSUES.md before coding.\n- Keep changes minimal and safe; do not introduce logging of secrets.\n`;
    fs.writeFileSync(cursorRulesPath, content, "utf8");
  }
}

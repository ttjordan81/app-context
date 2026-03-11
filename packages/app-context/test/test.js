import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { EventEmitter } from "node:events";
import { createAppContext } from "../index.js";
import { summarize } from "../src/summarizer.js";

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "app-context-test-"));
}

function cleanDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ── Writer tests ──────────────────────────────────────────────────────────

describe("writer", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });
  afterEach(() => cleanDir(tmpDir));

  it("creates events.ndjson and appends events", () => {
    const ctx = createAppContext({ outputDir: tmpDir });
    ctx.emit("test.event", { key: "value" });
    ctx.emit("test.event2", { num: 42 });

    const eventsPath = path.join(tmpDir, "events.ndjson");
    assert.ok(fs.existsSync(eventsPath), "events.ndjson should exist");

    const lines = fs.readFileSync(eventsPath, "utf8").trim().split("\n");
    assert.equal(lines.length, 2);

    const e1 = JSON.parse(lines[0]);
    assert.equal(e1.type, "domain");
    assert.equal(e1.name, "test.event");
    assert.equal(e1.meta.key, "value");

    const e2 = JSON.parse(lines[1]);
    assert.equal(e2.name, "test.event2");
    assert.equal(e2.meta.num, 42);
  });

  it("truncates events.ndjson beyond 2000 lines on restart", () => {
    const eventsPath = path.join(tmpDir, "events.ndjson");
    const lines = [];
    for (let i = 0; i < 2500; i++) {
      lines.push(JSON.stringify({ type: "domain", ts: new Date().toISOString(), name: `evt_${i}`, meta: {} }));
    }
    fs.writeFileSync(eventsPath, lines.join("\n") + "\n", "utf8");

    // Creating a new context triggers initOnce which truncates
    const ctx = createAppContext({ outputDir: tmpDir });
    ctx.emit("after.truncation", {});

    const content = fs.readFileSync(eventsPath, "utf8").trim().split("\n");
    // 2000 kept + 1 new = 2001
    assert.equal(content.length, 2001);

    // First line should be evt_500 (2500 - 2000 = 500)
    const first = JSON.parse(content[0]);
    assert.equal(first.name, "evt_500");
  });
});

// ── sanitizeMeta tests ───────────────────────────────────────────────────

describe("sanitizeMeta (strict mode)", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });
  afterEach(() => cleanDir(tmpDir));

  it("allows primitive values in strict mode", () => {
    const ctx = createAppContext({ outputDir: tmpDir });
    ctx.emit("test.primitives", { str: "hello", num: 123, bool: true, nil: null });

    const eventsPath = path.join(tmpDir, "events.ndjson");
    const line = fs.readFileSync(eventsPath, "utf8").trim();
    const e = JSON.parse(line);
    assert.deepEqual(e.meta, { str: "hello", num: 123, bool: true, nil: null });
  });

  it("strips nested objects in strict mode", () => {
    const ctx = createAppContext({ outputDir: tmpDir });
    ctx.emit("test.nested", { safe: "ok", nested: { secret: "password" }, arr: [1, 2] });

    const eventsPath = path.join(tmpDir, "events.ndjson");
    const line = fs.readFileSync(eventsPath, "utf8").trim();
    const e = JSON.parse(line);
    assert.deepEqual(e.meta, { safe: "ok" });
  });
});

// ── Middleware tests ─────────────────────────────────────────────────────

describe("middleware", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });
  afterEach(() => cleanDir(tmpDir));

  it("logs request events on response finish", async () => {
    const ctx = createAppContext({ outputDir: tmpDir });
    const mw = ctx.middleware();

    const res = new EventEmitter();
    res.statusCode = 200;
    const req = { method: "GET", path: "/api/test" };

    await new Promise((resolve) => {
      mw(req, res, () => {
        res.emit("finish");
        resolve();
      });
    });

    const eventsPath = path.join(tmpDir, "events.ndjson");
    const lines = fs.readFileSync(eventsPath, "utf8").trim().split("\n");
    const e = JSON.parse(lines[0]);
    assert.equal(e.type, "request");
    assert.equal(e.method, "GET");
    assert.equal(e.path, "/api/test");
    assert.equal(e.status, 200);
    assert.ok(typeof e.latencyMs === "number");
  });

  it("excludes routes in the exclude list", async () => {
    const ctx = createAppContext({ outputDir: tmpDir, excludeRoutes: ["/health"] });
    const mw = ctx.middleware();

    const res = new EventEmitter();
    res.statusCode = 200;
    const req = { method: "GET", path: "/health" };

    await new Promise((resolve) => {
      mw(req, res, () => {
        res.emit("finish");
        resolve();
      });
    });

    const eventsPath = path.join(tmpDir, "events.ndjson");
    if (fs.existsSync(eventsPath)) {
      const content = fs.readFileSync(eventsPath, "utf8").trim();
      assert.equal(content, "");
    }
  });

  it("strips query strings from URL via getSafePath", async () => {
    const ctx = createAppContext({ outputDir: tmpDir });
    const mw = ctx.middleware();

    const res = new EventEmitter();
    res.statusCode = 200;
    const req = { method: "GET", url: "/api/data?token=secret123&page=1" };

    await new Promise((resolve) => {
      mw(req, res, () => {
        res.emit("finish");
        resolve();
      });
    });

    const eventsPath = path.join(tmpDir, "events.ndjson");
    const lines = fs.readFileSync(eventsPath, "utf8").trim().split("\n");
    const e = JSON.parse(lines[0]);
    assert.equal(e.path, "/api/data");
  });
});

// ── Summarizer tests ─────────────────────────────────────────────────────

describe("summarizer", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });
  afterEach(() => cleanDir(tmpDir));

  it("generates AGENT_CONTEXT.md and OPEN_ISSUES.md from events", async () => {
    const events = [
      { type: "request", ts: "2025-01-01T00:00:00Z", requestId: "req_1", method: "GET", path: "/api/items", status: 200, latencyMs: 10 },
      { type: "request", ts: "2025-01-01T00:00:01Z", requestId: "req_2", method: "POST", path: "/api/items", status: 400, latencyMs: 5 },
      { type: "request", ts: "2025-01-01T00:00:02Z", requestId: "req_3", method: "POST", path: "/api/items", status: 400, latencyMs: 5 },
      { type: "request", ts: "2025-01-01T00:00:03Z", requestId: "req_4", method: "POST", path: "/api/items", status: 201, latencyMs: 8 },
      { type: "domain", ts: "2025-01-01T00:00:01Z", name: "item.validation_failed", meta: { missingFieldsCount: 2 } },
      { type: "domain", ts: "2025-01-01T00:00:02Z", name: "item.validation_failed", meta: { missingFieldsCount: 1 } },
      { type: "domain", ts: "2025-01-01T00:00:03Z", name: "item.created", meta: { source: "web" } },
    ];

    const eventsPath = path.join(tmpDir, "events.ndjson");
    fs.writeFileSync(eventsPath, events.map((e) => JSON.stringify(e)).join("\n") + "\n", "utf8");

    // Suppress console.log from summarize
    const origLog = console.log;
    console.log = () => {};
    await summarize({ outputDir: tmpDir });
    console.log = origLog;

    // Check AGENT_CONTEXT.md
    const agentContext = fs.readFileSync(path.join(tmpDir, "AGENT_CONTEXT.md"), "utf8");
    assert.ok(agentContext.includes("# AGENT_CONTEXT"));
    assert.ok(agentContext.includes("POST /api/items"));
    assert.ok(agentContext.includes("GET /api/items"));
    // Error rate should be present
    assert.ok(agentContext.includes("error rate"), "Should show error rate percentage");
    // Domain events with meta
    assert.ok(agentContext.includes("item.validation_failed"));
    assert.ok(agentContext.includes("missingFieldsCount="), "Should show meta values");

    // Check OPEN_ISSUES.md
    const openIssues = fs.readFileSync(path.join(tmpDir, "OPEN_ISSUES.md"), "utf8");
    assert.ok(openIssues.includes("# OPEN_ISSUES"));
    assert.ok(openIssues.includes("400 POST /api/items"));
  });

  it("handles empty events file gracefully", async () => {
    const eventsPath = path.join(tmpDir, "events.ndjson");
    fs.writeFileSync(eventsPath, "", "utf8");

    const origLog = console.log;
    console.log = () => {};
    await summarize({ outputDir: tmpDir });
    console.log = origLog;

    const agentContext = fs.readFileSync(path.join(tmpDir, "AGENT_CONTEXT.md"), "utf8");
    assert.ok(agentContext.includes("(none)"));
  });

  it("handles missing events file gracefully", async () => {
    const origLog = console.log;
    console.log = () => {};
    await summarize({ outputDir: tmpDir });
    console.log = origLog;

    const agentContext = fs.readFileSync(path.join(tmpDir, "AGENT_CONTEXT.md"), "utf8");
    assert.ok(agentContext.includes("(none)"));
  });

  it("creates template files if missing", async () => {
    const origLog = console.log;
    console.log = () => {};
    await summarize({ outputDir: tmpDir });
    console.log = origLog;

    assert.ok(fs.existsSync(path.join(tmpDir, "RUNBOOK.md")));
    assert.ok(fs.existsSync(path.join(tmpDir, "BUSINESS_GOAL.md")));
    assert.ok(fs.existsSync(path.join(tmpDir, "AGENT_PLAYBOOK.md")));
  });

  it("calculates correct error rate per route", async () => {
    const events = [];
    // 10 GET requests, 0 errors
    for (let i = 0; i < 10; i++) {
      events.push({ type: "request", ts: "2025-01-01T00:00:00Z", requestId: `req_g${i}`, method: "GET", path: "/api/items", status: 200, latencyMs: 5 });
    }
    // 20 POST requests: 5 errors (25% error rate)
    for (let i = 0; i < 15; i++) {
      events.push({ type: "request", ts: "2025-01-01T00:00:00Z", requestId: `req_p${i}`, method: "POST", path: "/api/items", status: 201, latencyMs: 5 });
    }
    for (let i = 0; i < 5; i++) {
      events.push({ type: "request", ts: "2025-01-01T00:00:00Z", requestId: `req_e${i}`, method: "POST", path: "/api/items", status: 400, latencyMs: 5 });
    }

    const eventsPath = path.join(tmpDir, "events.ndjson");
    fs.writeFileSync(eventsPath, events.map((e) => JSON.stringify(e)).join("\n") + "\n", "utf8");

    const origLog = console.log;
    console.log = () => {};
    await summarize({ outputDir: tmpDir });
    console.log = origLog;

    const agentContext = fs.readFileSync(path.join(tmpDir, "AGENT_CONTEXT.md"), "utf8");
    assert.ok(agentContext.includes("25.0% error rate"), `Should show 25.0% error rate, got:\n${agentContext}`);
    assert.ok(agentContext.includes("0 errors"), "GET route should show 0 errors");
  });
});

const { createMiddleware } = require("./middleware.cjs");
const { createWriter } = require("./writer.cjs");

function createAppContext(options = {}) {
  const {
    appName = "app",
    outputDir = "./agent-state",
    redact = { mode: "strict" },
    excludeRoutes = [],
  } = options;

  const writer = createWriter({ outputDir, appName });

  return {
    middleware() {
      return createMiddleware({ writer, redact, excludeRoutes });
    },
    emit(name, meta = {}) {
      writer.write({
        type: "domain",
        ts: new Date().toISOString(),
        name,
        meta: sanitizeMeta(meta, redact),
      });
    },
  };
}

function sanitizeMeta(meta, redact) {
  if (!meta || typeof meta !== "object") return {};

  if (redact && redact.mode === "strict") {
    const out = {};
    for (const [k, v] of Object.entries(meta)) {
      if (v === null) out[k] = null;
      else if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") out[k] = v;
    }
    return out;
  }

  return {};
}

module.exports = { createAppContext };

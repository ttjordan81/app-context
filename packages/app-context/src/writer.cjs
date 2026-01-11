const fs = require("node:fs");
const path = require("node:path");
const { ensureDir } = require("./util/file.cjs");

function createWriter({ outputDir }) {
  const resolved = path.resolve(process.cwd(), outputDir);
  const eventsPath = path.join(resolved, "events.ndjson");

  let initialized = false;
  function initOnce() {
    if (initialized) return;
    ensureDir(resolved);
    initialized = true;
  }

  return {
    write(event) {
      try {
        initOnce();
        const line = JSON.stringify(event);
        fs.appendFileSync(eventsPath, `${line}\n`, "utf8");
      } catch (_e) {}
    },
    getEventsPath() {
      initOnce();
      return eventsPath;
    },
  };
}

module.exports = { createWriter };

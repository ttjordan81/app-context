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
    
    // Truncate to last 2000 lines on restart
    try {
      if (fs.existsSync(eventsPath)) {
        const content = fs.readFileSync(eventsPath, "utf8");
        const lines = content.trim().split("\n");
        if (lines.length > 2000) {
          const truncated = lines.slice(-2000).join("\n") + "\n";
          fs.writeFileSync(eventsPath, truncated, "utf8");
        }
      }
    } catch (_e) {}
    
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

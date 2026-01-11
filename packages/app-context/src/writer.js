import fs from "node:fs";
import path from "node:path";
import { ensureDir } from "./util/file.js";

export function createWriter({ outputDir }) {
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
      } catch (_e) {
        // swallow - never crash host app
      }
    },
    getEventsPath() {
      initOnce();
      return eventsPath;
    },
  };
}

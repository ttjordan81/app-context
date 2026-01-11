#!/usr/bin/env node

import { summarize } from "../src/summarizer.js";
import { initAgentState } from "../src/init.js";

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : true;
      args[key] = value;
      if (value !== true) i += 1;
    } else {
      args._.push(a);
    }
  }
  return args;
}

async function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const args = parseArgs(argv.slice(1));

  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
    process.stdout.write(
      "app-context\n\n" +
        "Commands:\n" +
        "  summarize --output <dir> [--tail <n>]\n" +
        "  init --output <dir>\n"
    );
    process.exit(0);
  }

  if (cmd === "summarize") {
    const output = args.output || "./agent-state";
    const tail = args.tail ? Number(args.tail) : 2000;
    await summarize({ outputDir: output, tail });
    return;
  }

  if (cmd === "init") {
    const output = args.output || "./agent-state";
    await initAgentState({ outputDir: output });
    return;
  }

  process.stderr.write(`Unknown command: ${cmd}\n`);
  process.exit(1);
}

main().catch((err) => {
  process.stderr.write(`${err?.stack || err}\n`);
  process.exit(1);
});

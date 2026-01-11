import fs from "node:fs";

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function readLastLines(filePath, maxLines) {
  if (!fs.existsSync(filePath)) return [];
  const buf = fs.readFileSync(filePath, "utf8");
  const lines = buf.split(/\r?\n/).filter(Boolean);
  return lines.slice(Math.max(0, lines.length - maxLines));
}

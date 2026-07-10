import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const versionPath = path.join(rootDir, "VERSION.md");
const outputPath = path.join(rootDir, "src/ui/releaseHistory.js");
const checkMode = process.argv.includes("--check");
const releaseHistory = parseReleaseHistory(fs.readFileSync(versionPath, "utf8"));
const source = `// Generated from VERSION.md by scripts/generate-release-history.mjs.\nexport const releaseHistory = ${JSON.stringify(releaseHistory, null, 2)};\n`;

if (checkMode) {
  const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  if (current !== source) {
    throw new Error("src/ui/releaseHistory.js 与 VERSION.md 不一致，请重新生成迭代记录");
  }
  console.log(`迭代记录数据检查通过：${releaseHistory.length} 个版本`);
} else {
  fs.writeFileSync(outputPath, source);
  console.log(`迭代记录数据已生成：${releaseHistory.length} 个版本`);
}

export function parseReleaseHistory(markdown) {
  const releases = [];
  let current = null;
  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trim();
    const versionMatch = line.match(/^##\s+(v\d[^\s]*)$/);
    if (versionMatch) {
      current = { version: versionMatch[1], title: "", changes: [] };
      releases.push(current);
      continue;
    }
    if (!current) continue;
    const coreMatch = line.match(/^核心：(.+)$/);
    if (coreMatch) {
      current.title = coreMatch[1].replace(/[。.]$/, "");
      continue;
    }
    const changeMatch = line.match(/^[-*]\s+(.+)$/);
    if (changeMatch && current.changes.length < 4) current.changes.push(changeMatch[1]);
  }
  return releases.filter((release) => release.title || release.changes.length).slice(0, 60);
}

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(rootDir, "dist");
const runtimeDirectories = ["assets", "components", "data", "domain", "services", "ui"];
const edgeoneCli = process.env.ROBOTAXI_EDGEONE_CLI || path.join(rootDir, "node_modules", ".bin", "edgeone");

const babel = await import(path.join(rootDir, "vendor/babel.min.js"));
const source = fs.readFileSync(path.join(rootDir, "src/main.jsx"), "utf8");
const compiledBundle = babel.default.transform(source, { presets: ["react"] }).code + "\n";
const trackedBundle = fs.readFileSync(path.join(rootDir, "src/main.bundle.js"), "utf8");
assert.equal(compiledBundle, trackedBundle, "src/main.bundle.js 与 src/main.jsx 不一致，请先重新生成 bundle");

const commit = process.env.GITHUB_SHA || readGitCommit() || "local-preview";
const cacheVersion = commit.slice(0, 12).replace(/[^a-zA-Z0-9_-]/g, "-");
const version = fs.readFileSync(path.join(rootDir, "VERSION.md"), "utf8").match(/^##\s+(v[^\s]+)/m)?.[1] || "unknown";

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(path.join(outputDir, "src"), { recursive: true });

for (const directory of runtimeDirectories) {
  const sourceDirectory = path.join(rootDir, "src", directory);
  if (fs.existsSync(sourceDirectory)) {
    fs.cpSync(sourceDirectory, path.join(outputDir, "src", directory), { recursive: true });
  }
}
fs.cpSync(path.join(rootDir, "vendor"), path.join(outputDir, "vendor"), { recursive: true });
fs.copyFileSync(path.join(rootDir, "src/styles.css"), path.join(outputDir, "src/styles.css"));
fs.copyFileSync(path.join(rootDir, "README.md"), path.join(outputDir, "README.md"));
fs.cpSync(path.join(rootDir, "edge-functions"), path.join(outputDir, "edge-functions"), { recursive: true });
fs.writeFileSync(path.join(outputDir, "package.json"), `${JSON.stringify({
  name: "robotaxi-edgeone-release",
  private: true,
}, null, 2)}\n`);

const productionBundle = compiledBundle.replace(/(\.js)\?v=[^"')]+/g, `$1?v=${cacheVersion}`);
fs.writeFileSync(path.join(outputDir, "src/main.bundle.js"), productionBundle);

const productionIndex = fs.readFileSync(path.join(rootDir, "index.html"), "utf8")
  .replace(/(\.css)\?v=[^"']+/g, `$1?v=${cacheVersion}`)
  .replace(/(\.js)\?v=[^"']+/g, `$1?v=${cacheVersion}`);
fs.writeFileSync(path.join(outputDir, "index.html"), productionIndex);
fs.writeFileSync(path.join(outputDir, ".nojekyll"), "");
fs.writeFileSync(path.join(outputDir, "deployment-manifest.json"), `${JSON.stringify({
  version,
  commit,
  cache_version: cacheVersion,
  deployment_target: "EDGEONE",
  production_url: "https://robotaxi.xingbuild.top/",
}, null, 2)}\n`);

if (fs.existsSync(edgeoneCli)) {
  execFileSync(edgeoneCli, ["makers", "build"], {
    cwd: outputDir,
    encoding: "utf8",
    stdio: "inherit",
  });
  console.log(`EdgeOne 完整部署产物已生成：dist/.edgeone (${version}, ${cacheVersion})`);
} else {
  assert.notEqual(process.env.ROBOTAXI_REQUIRE_EDGEONE_BUILD, "1", "缺少项目内 EdgeOne CLI，正式发布不得继续");
  console.log(`EdgeOne 完整源发布包已生成：dist（当前工作树未安装 CLI，跳过函数编译）`);
}

function readGitCommit() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: rootDir, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

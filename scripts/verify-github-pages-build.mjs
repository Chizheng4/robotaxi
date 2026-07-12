import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(rootDir, "dist");
const indexPath = path.join(outputDir, "index.html");
const bundlePath = path.join(outputDir, "src/main.bundle.js");
const readmePath = path.join(outputDir, "README.md");

assert(fs.existsSync(indexPath), "生产站点缺少 index.html");
assert(fs.existsSync(bundlePath), "生产站点缺少 src/main.bundle.js");
assert(fs.existsSync(readmePath), "生产站点缺少 README.md，项目说明浮层无法读取内容");
assert.equal(fs.readFileSync(readmePath, "utf8"), fs.readFileSync(path.join(rootDir, "README.md"), "utf8"), "生产站点 README 必须与当前项目文档完全一致");
assert(fs.existsSync(path.join(outputDir, "src/assets/robotaxi-map-marker.png")), "生产站点缺少 Robotaxi 地图资产");
assert(fs.existsSync(path.join(outputDir, ".nojekyll")), "生产站点缺少 .nojekyll");
assert(fs.existsSync(path.join(outputDir, "deployment-manifest.json")), "生产站点缺少发布清单");
assert(!fs.existsSync(path.join(outputDir, "doc")), "生产站点不应发布设计文档");
assert(!fs.existsSync(path.join(outputDir, "scripts")), "生产站点不应发布工程脚本");
assert(!fs.existsSync(path.join(outputDir, "src/main.jsx")), "生产站点不应发布 JSX 源入口");

const index = fs.readFileSync(indexPath, "utf8");
const bundle = fs.readFileSync(bundlePath, "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(outputDir, "deployment-manifest.json"), "utf8"));

assert(!/(?:src|href)=["']\//.test(index), "入口资源必须使用相对路径，确保 GitHub 项目子路径可用");
assert(index.includes(`?v=${manifest.cache_version}`), "入口资源没有使用本次提交缓存版本");
assert(bundle.includes(`?v=${manifest.cache_version}`), "动态模块没有使用本次提交缓存版本");

for (const reference of index.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
  const resource = reference[1];
  if (/^(?:data:|https?:|#)/.test(resource)) continue;
  assertResourceExists(outputDir, resource, `入口资源不存在：${resource}`);
}

for (const dynamicImport of bundle.matchAll(/import\(["']([^"']+)["']\)/g)) {
  assertResourceExists(path.join(outputDir, "src"), dynamicImport[1], `动态模块不存在：${dynamicImport[1]}`);
}

const totalBytes = directorySize(outputDir);
assert(totalBytes < 1024 ** 3, "生产站点超过 GitHub Pages 1 GB 限制");
console.log(`GitHub Pages 发布产物验证通过：${(totalBytes / 1024 / 1024).toFixed(2)} MiB`);

function assertResourceExists(baseDirectory, reference, message) {
  const normalized = reference.split(/[?#]/)[0].replace(/^\.\//, "");
  assert(fs.existsSync(path.resolve(baseDirectory, normalized)), message);
}

function directorySize(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).reduce((total, entry) => {
    const entryPath = path.join(directory, entry.name);
    return total + (entry.isDirectory() ? directorySize(entryPath) : fs.statSync(entryPath).size);
  }, 0);
}

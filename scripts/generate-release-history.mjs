import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const versionPath = path.join(rootDir, "VERSION.md");
const outputPath = path.join(rootDir, "src/ui/releaseHistory.js");
const isMainModule = path.resolve(process.argv[1] || "") === fileURLToPath(import.meta.url);

if (isMainModule) {
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
}

export function parseReleaseHistory(markdown) {
  const releases = [];
  let current = null;
  let section = "engineering";
  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trim();
    const versionMatch = line.match(/^##\s+(v\d[^\s]*)$/);
    if (versionMatch) {
      current = {
        version: versionMatch[1],
        title: "",
        changes: [],
        audienceTitle: "",
        audienceChanges: [],
      };
      section = "engineering";
      releases.push(current);
      continue;
    }
    if (!current) continue;
    const coreMatch = line.match(/^核心：(.+)$/);
    if (coreMatch) {
      current.title = coreMatch[1].replace(/[。.]$/, "");
      section = "engineering";
      continue;
    }
    const audienceTitleMatch = line.match(/^用户标题：(.+)$/);
    if (audienceTitleMatch) {
      current.audienceTitle = sanitizeAudienceText(audienceTitleMatch[1]);
      continue;
    }
    if (line === "用户更新：") {
      section = "audience";
      continue;
    }
    const changeMatch = line.match(/^[-*]\s+(.+)$/);
    if (!changeMatch) continue;
    if (section === "audience") current.audienceChanges.push(sanitizeAudienceText(changeMatch[1]));
    else current.changes.push(changeMatch[1]);
  }
  return releases
    .filter((release) => release.title || release.changes.length)
    .map((release) => ({
      ...release,
      audienceTitle: release.audienceTitle || createAudienceTitle(release.title),
      audienceChanges: release.audienceChanges.length
        ? release.audienceChanges
        : release.changes.map(createAudienceChange).filter(Boolean),
      audienceSource: release.audienceTitle && release.audienceChanges.length ? "curated" : "generated",
    }));
}

function sanitizeAudienceText(value) {
  return String(value || "").replace(/`([^`]+)`/g, "$1").replace(/\s+/g, " ").trim();
}

function createAudienceTitle(value) {
  return createAudienceChange(value)
    .replace(/\bv\d+(?:\.\d+)*\b/gi, "")
    .replace(/^建立/, "新增")
    .replace(/^实现/, "新增")
    .replace(/^收敛/, "统一")
    .replace(/^补齐/, "完善")
    .replace(/^修正/, "修复")
    .replace(/^完成\s*阶段版本更新计划，完成本轮(.+)完成$/, "完成$1阶段更新")
    .replace(/\s+/g, " ")
    .trim();
}

function createAudienceChange(value) {
  return sanitizeAudienceText(value)
    .replace(/Fleet Operations/gi, "运维任务")
    .replace(/GitHub Pages/gi, "在线网站")
    .replace(/TimedOperation/g, "时间作业")
    .replace(/SimulationRun/g, "模拟运行")
    .replace(/SimulationEvent/g, "模拟事件")
    .replace(/[A-Za-z0-9_.-]+\/[A-Za-z0-9_./-]+\.(?:js|mjs|md|command)\b/g, "相关模块")
    .replace(/\b[A-Z][A-Z0-9_]{2,}(?:\s*\/\s*[A-Z][A-Z0-9_]{2,})+/g, "多种业务状态")
    .replace(/\b[A-Z][A-Z0-9_]{2,}\b/g, "相关状态")
    .replace(/\b[a-z][A-Za-z0-9]*(?:[A-Z][A-Za-z0-9]*)+\b/g, "相关能力")
    .replace(/自动执行计划/g, "更新计划")
    .replace(/大版本/g, "阶段版本")
    .replace(/归档收口/g, "阶段更新完成")
    .replace(/归档/g, "完成")
    .replace(/收口/g, "完成")
    .replace(/提交前检查/g, "稳定性检查")
    .replace(/代码级验证/g, "稳定性检查")
    .replace(/前端/g, "页面")
    .replace(/后端/g, "系统服务")
    .replace(/状态机/g, "状态流程")
    .replace(/初始化/g, "默认数据")
    .replace(/类型定义/g, "基础能力")
    .replace(/\btick\b/gi, "时间步")
    .replace(/\bdemo\b/gi, "演示")
    .replace(/时间作业\s*时间作业/g, "时间作业")
    .replace(/多种业务状态作业状态/g, "多种作业状态")
    .replace(/通过校验/g, "通过检查")
    .replace(/字段字典/g, "中文字段")
    .replace(/服务化/g, "统一能力")
    .replace(/闭环/g, "完整流程")
    .replace(/运行态/g, "运行数据")
    .replace(/合同验证/g, "稳定性验证")
    .replace(/合同/g, "规则")
    .replace(/页面层/g, "界面")
    .replace(/主路径/g, "主要流程")
    .replace(/^本轮[，：:]?\s*/, "")
    .replace(/^代码级[，：:]?\s*/, "")
    .replace(/([\u4e00-\u9fff])\s+([\u4e00-\u9fff])/g, "$1$2")
    .replace(/([\u4e00-\u9fff])\s+([\u4e00-\u9fff])/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

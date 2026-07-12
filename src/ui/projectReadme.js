export async function loadProjectReadme() {
  const response = await fetch("./README.md", { cache: "no-store" });
  if (!response.ok) throw new Error("项目说明读取失败");
  return response.text();
}

export function parseProjectReadme(markdown = "") {
  const lines = String(markdown).replaceAll("\r\n", "\n").split("\n");
  const blocks = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }
    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const content = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) content.push(lines[index++]);
      index += 1;
      blocks.push({ type: language === "mermaid" ? "diagram" : "code", language, content: content.join("\n") });
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, content: heading[2] });
      index += 1;
      continue;
    }
    if (line.startsWith("> ")) {
      blocks.push({ type: "quote", content: line.slice(2) });
      index += 1;
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index])) items.push(lines[index++].replace(/^[-*]\s+/, ""));
      blocks.push({ type: "list", items });
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) items.push(lines[index++].replace(/^\d+\.\s+/, ""));
      blocks.push({ type: "orderedList", items });
      continue;
    }
    if (line.includes("|") && lines[index + 1]?.match(/^\s*\|?[\s:|-]+\|/)) {
      const rows = [];
      rows.push(splitMarkdownTableRow(line));
      index += 2;
      while (index < lines.length && lines[index].includes("|")) rows.push(splitMarkdownTableRow(lines[index++]));
      blocks.push({ type: "table", headers: rows[0], rows: rows.slice(1) });
      continue;
    }
    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines, index)) paragraph.push(lines[index++].trim());
    blocks.push({ type: "paragraph", content: paragraph.join(" ") });
  }
  return blocks;
}

function splitMarkdownTableRow(line) {
  return line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
}

function isBlockStart(lines, index) {
  const line = lines[index];
  return /^(#{1,4})\s+|^```|^>\s+|^[-*]\s+|^\d+\.\s+/.test(line)
    || (line.includes("|") && lines[index + 1]?.match(/^\s*\|?[\s:|-]+\|/));
}

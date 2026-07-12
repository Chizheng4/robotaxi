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

export function parseMermaidFlowchart(source = "") {
  const lines = String(source).split("\n").map((line) => line.trim()).filter(Boolean);
  const direction = lines[0]?.match(/^flowchart\s+(LR|TB)$/)?.[1] || "LR";
  const nodeMap = new Map();
  const edges = [];
  lines.slice(1).forEach((line) => {
    const operator = ["<-->", "-.->", "-->", "---"].find((token) => line.includes(` ${token} `));
    if (!operator) return;
    const [left, right] = line.split(` ${operator} `);
    const from = parseMermaidNode(left);
    const to = parseMermaidNode(right);
    if (!from || !to) return;
    registerMermaidNode(nodeMap, from);
    registerMermaidNode(nodeMap, to);
    edges.push({ from: from.id, to: to.id, operator });
  });
  const ranks = calculateNodeRanks([...nodeMap.keys()], edges);
  const groups = new Map();
  [...nodeMap.keys()].forEach((id) => {
    const rank = ranks.get(id) || 0;
    groups.set(rank, [...(groups.get(rank) || []), id]);
  });
  const maxRank = Math.max(0, ...groups.keys());
  const maxGroupSize = Math.max(1, ...[...groups.values()].map((items) => items.length));
  const nodeWidth = direction === "LR" ? 176 : 184;
  const nodeHeight = 58;
  const rankGap = direction === "LR" ? 54 : 42;
  const crossGap = direction === "LR" ? 24 : 28;
  const padding = 24;
  const width = direction === "LR"
    ? padding * 2 + (maxRank + 1) * nodeWidth + maxRank * rankGap
    : padding * 2 + maxGroupSize * nodeWidth + (maxGroupSize - 1) * crossGap;
  const height = direction === "LR"
    ? padding * 2 + maxGroupSize * nodeHeight + (maxGroupSize - 1) * crossGap
    : padding * 2 + (maxRank + 1) * nodeHeight + maxRank * rankGap;
  const nodes = [...nodeMap.values()].map((node) => {
    const rank = ranks.get(node.id) || 0;
    const group = groups.get(rank) || [];
    const index = group.indexOf(node.id);
    const x = direction === "LR" ? padding + rank * (nodeWidth + rankGap) : padding + index * (nodeWidth + crossGap);
    const y = direction === "LR" ? padding + index * (nodeHeight + crossGap) : padding + rank * (nodeHeight + rankGap);
    return { ...node, x, y, width: nodeWidth, height: nodeHeight };
  });
  const positionedNodes = new Map(nodes.map((node) => [node.id, node]));
  return { direction, width, height, nodes, edges: edges.map((edge) => ({ ...edge, fromNode: positionedNodes.get(edge.from), toNode: positionedNodes.get(edge.to) })) };
}

function parseMermaidNode(value) {
  const match = String(value).trim().match(/^([A-Za-z0-9_]+)(?:\["([\s\S]*)"\])?$/);
  if (!match) return null;
  return { id: match[1], label: (match[2] || match[1]).replaceAll("<br/>", "\n"), explicitLabel: Boolean(match[2]) };
}

function registerMermaidNode(nodeMap, node) {
  const current = nodeMap.get(node.id);
  nodeMap.set(node.id, {
    ...current,
    ...node,
    label: node.explicitLabel ? node.label : current?.label || node.label,
    explicitLabel: Boolean(current?.explicitLabel || node.explicitLabel),
  });
}

function calculateNodeRanks(nodeIds, edges) {
  const ranks = new Map();
  const incoming = new Map(nodeIds.map((id) => [id, 0]));
  const outgoing = new Map(nodeIds.map((id) => [id, []]));
  edges.forEach((edge) => {
    incoming.set(edge.to, (incoming.get(edge.to) || 0) + 1);
    outgoing.get(edge.from)?.push(edge.to);
  });
  const queue = nodeIds.filter((id) => (incoming.get(id) || 0) === 0);
  if (queue.length === 0 && nodeIds[0]) queue.push(nodeIds[0]);
  queue.forEach((id) => ranks.set(id, 0));
  while (queue.length) {
    const id = queue.shift();
    (outgoing.get(id) || []).forEach((nextId) => {
      if (!ranks.has(nextId)) {
        ranks.set(nextId, (ranks.get(id) || 0) + 1);
        queue.push(nextId);
      }
    });
  }
  nodeIds.forEach((id) => { if (!ranks.has(id)) ranks.set(id, 0); });
  return ranks;
}

function splitMarkdownTableRow(line) {
  return line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
}

function isBlockStart(lines, index) {
  const line = lines[index];
  return /^(#{1,4})\s+|^```|^>\s+|^[-*]\s+|^\d+\.\s+/.test(line)
    || (line.includes("|") && lines[index + 1]?.match(/^\s*\|?[\s:|-]+\|/));
}

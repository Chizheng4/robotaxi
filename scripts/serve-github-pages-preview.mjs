import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(rootDir, "dist");
const port = Number(process.env.PORT || 4174);
const basePath = normalizeBasePath(process.env.ROBOTAXI_PAGES_BASE_PATH || "/Robotaxi/");
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

if (!fs.existsSync(path.join(outputDir, "index.html"))) {
  throw new Error("缺少 dist/index.html，请先执行 node scripts/build-github-pages.mjs");
}

const server = http.createServer((request, response) => {
  const requestPath = new URL(request.url, `http://${request.headers.host}`).pathname;
  if (basePath !== "/" && requestPath === basePath.slice(0, -1)) {
    response.writeHead(302, { Location: basePath });
    response.end();
    return;
  }
  if (!requestPath.startsWith(basePath)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }
  const relativePath = decodeURIComponent(requestPath.slice(basePath.length)) || "index.html";
  const filePath = path.resolve(outputDir, relativePath);
  if (!filePath.startsWith(`${outputDir}${path.sep}`) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }
  response.writeHead(200, {
    "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  fs.createReadStream(filePath).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`GitHub Pages 预览服务：http://127.0.0.1:${port}${basePath}`);
});

function normalizeBasePath(value) {
  const normalized = String(value).replace(/^\/+|\/+$/g, "");
  return normalized ? `/${normalized}/` : "/";
}

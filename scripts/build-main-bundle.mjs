import fs from "node:fs";

const babel = await import("../vendor/babel.min.js");
const source = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const bundle = `${babel.default.transform(source, { presets: ["react"] }).code}\n`;

fs.writeFileSync(new URL("../src/main.bundle.js", import.meta.url), bundle);
console.log("src/main.bundle.js 已重新生成");

import assert from "node:assert/strict";
import fs from "node:fs";

const pageSource = fs.readFileSync("src/main.jsx", "utf8");
const styleSource = fs.readFileSync("src/styles.css", "utf8");

assert.doesNotMatch(pageSource, /地图图层说明|aria-label="地图图层"|legendItems|layersOpen/);
assert.doesNotMatch(styleSource, /\.map-layer-panel\b/);
assert.match(pageSource, /aria-label="放大地图"/);
assert.match(pageSource, /aria-label="缩小地图"/);
assert.match(pageSource, /aria-label="复位地图"/);

console.log("v049.12.3 地图图例退役合同验证通过");

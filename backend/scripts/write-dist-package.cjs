const fs = require("fs");
const path = require("path");

const distDir = path.join(__dirname, "..", "dist");

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

fs.writeFileSync(
  path.join(distDir, "package.json"),
  JSON.stringify({ type: "commonjs" }, null, 2)
);

// Rename index.js to index.cjs to force CommonJS
const indexPath = path.join(distDir, "index.js");
const indexCjsPath = path.join(distDir, "index.cjs");

if (fs.existsSync(indexPath)) {
  fs.renameSync(indexPath, indexCjsPath);
  console.log("Renamed dist/index.js to dist/index.cjs");
}

console.log("Created dist/package.json with type=commonjs");

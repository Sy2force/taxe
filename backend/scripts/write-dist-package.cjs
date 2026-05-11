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

console.log("Created dist/package.json with type=commonjs");

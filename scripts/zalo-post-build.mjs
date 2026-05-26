import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");
const htmlPath = path.join(distDir, "index.html");

const html = fs.readFileSync(htmlPath, "utf-8");

const jsMatch = html.match(/src="[./]*(assets\/index-[^"]+\.js)"/);
const cssMatch = html.match(/href="[./]*(assets\/index-[^"]+\.css)"/);

if (!jsMatch) {
  console.error("Could not find main JS file in index.html");
  process.exit(1);
}

const jsFile = jsMatch[1]; // e.g. assets/index-Dqhx3kwp.js
const cssFile = cssMatch ? cssMatch[1] : null;
// jsFileName is relative to assets/ folder (bootstrap.js lives in assets/)
const jsFileName = path.basename(jsFile); // e.g. index-Dqhx3kwp.js

console.log("Main JS:", jsFile);
console.log("Main CSS:", cssFile);

const bootstrap = [
  "(function(){",
  "var a=document.getElementById('app');",
  "if(!a){a=document.createElement('div');a.id='app';document.body.appendChild(a);}",
  // import path is relative to assets/bootstrap.js location
  `import('./${jsFileName}').then(function(){console.log('[Bootstrap] OK');}).catch(function(e){console.error('[Bootstrap] failed:',e);});`,
  "})();",
].join("");

// Write bootstrap.js into assets/ so relative import path works
fs.writeFileSync(path.join(distDir, "assets", "bootstrap.js"), bootstrap);
console.log("Created assets/bootstrap.js");

// Update both dist/app-config.json and root app-config.json
const cfgPath = path.resolve(__dirname, "../app-config.json");
const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf-8"));
cfg.listSyncJS = ["assets/bootstrap.js"];
cfg.listCSS = cssFile ? [cssFile] : [];

fs.writeFileSync(path.join(distDir, "app-config.json"), JSON.stringify(cfg, null, 2));
fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
console.log("Updated app-config.json:", cfg.listSyncJS);

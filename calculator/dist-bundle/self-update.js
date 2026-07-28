var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// self-update.ts
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var https = __toESM(require("https"));
var import_child_process = require("child_process");
function args() {
  const a = {};
  for (const x of process.argv.slice(2)) {
    const m = x.match(/^--([^=]+)=(.*)$/);
    if (m) a[m[1]] = m[2];
  }
  return a;
}
function get2(url, timeout, binary = false) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout, headers: { "User-Agent": "bazi-ziwei-decoder-selfupdate" } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        get2(res.headers.location, timeout, binary).then(resolve, reject);
        res.resume();
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        res.resume();
        return;
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    });
    req.on("timeout", () => {
      req.destroy(new Error("timeout"));
    });
    req.on("error", reject);
  });
}
function semverGt(a, b) {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
}
var out = (o) => {
  console.log(JSON.stringify(o));
  process.exit(0);
};
async function main() {
  const A = args();
  const root = A.root || path.join(__dirname, "..", "..");
  const repo = A.repo || "Hyperionjust/Bazi-Ziwei-Decoder";
  const branch = A.branch || "main";
  const timeout = A.timeout ? +A.timeout : 4e3;
  let local = "0.0.0";
  try {
    local = fs.readFileSync(path.join(root, "VERSION"), "utf-8").trim();
  } catch {
    try {
      local = fs.readFileSync(path.join(root, "..", "VERSION"), "utf-8").trim();
    } catch {
    }
  }
  let remote = "";
  try {
    remote = (await get2(`https://raw.githubusercontent.com/${repo}/${branch}/VERSION`, timeout)).toString("utf-8").trim();
  } catch (e) {
    out({ local, remote: null, update_available: false, skip: `\u7248\u672C\u68C0\u67E5\u5931\u8D25(${e.message}),\u6309\u5F53\u524D\u7248\u672C\u7EE7\u7EED` });
  }
  if (!/^\d+\.\d+\.\d+$/.test(remote)) out({ local, remote, update_available: false, skip: "\u8FDC\u7AEF VERSION \u683C\u5F0F\u5F02\u5E38,\u6309\u5F53\u524D\u7248\u672C\u7EE7\u7EED" });
  const upd = semverGt(remote, local);
  if (!upd || A.fetch !== "true") out({ local, remote, update_available: upd });
  const workdir = A.workdir || process.cwd();
  try {
    const zipBuf = await get2(`https://codeload.github.com/${repo}/zip/refs/heads/${branch}`, Math.max(timeout, 15e3), true);
    const zipPath = path.join(workdir, "bzd-latest.zip");
    fs.writeFileSync(zipPath, zipBuf);
    const dest = path.join(workdir, "bzd-latest");
    fs.rmSync(dest, { recursive: true, force: true });
    fs.mkdirSync(dest, { recursive: true });
    (0, import_child_process.execFileSync)("unzip", ["-q", "-o", zipPath, "-d", dest], { stdio: "pipe" });
    const inner = fs.readdirSync(dest).find((d) => fs.statSync(path.join(dest, d)).isDirectory());
    const fetched = inner ? path.join(dest, inner) : dest;
    if (!fs.existsSync(path.join(fetched, "calculator", "dist-bundle", "run-chart.js")) || !fs.existsSync(path.join(fetched, "SKILL.md")))
      out({ local, remote, update_available: true, skip: "\u65B0\u7248\u5305\u4E0D\u5B8C\u6574(\u7F3A dist-bundle/SKILL.md),\u7EE7\u7EED\u7528\u5F53\u524D\u7248\u672C" });
    out({ local, remote, update_available: true, fetched_to: fetched });
  } catch (e) {
    out({ local, remote, update_available: true, skip: `\u65B0\u7248\u4E0B\u8F7D/\u89E3\u538B\u5931\u8D25(${e.message}),\u7EE7\u7EED\u7528\u5F53\u524D\u7248\u672C` });
  }
}
main();

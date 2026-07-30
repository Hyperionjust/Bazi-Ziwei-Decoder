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

// version-check.ts
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var https = __toESM(require("https"));
function args() {
  const a = {};
  for (const x of process.argv.slice(2)) {
    const m = x.match(/^--([^=]+)=(.*)$/);
    if (m) a[m[1]] = m[2];
  }
  return a;
}
function getText(url, timeout, depth = 0) {
  return new Promise((resolve, reject) => {
    if (depth > 3) {
      reject(new Error("\u91CD\u5B9A\u5411\u8FC7\u591A"));
      return;
    }
    const req = https.get(url, { timeout, headers: { "User-Agent": "bazi-ziwei-decoder-versioncheck" } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        getText(res.headers.location, timeout, depth + 1).then(resolve, reject);
        res.resume();
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        res.resume();
        return;
      }
      let s = "";
      let n = 0;
      res.setEncoding("utf-8");
      res.on("data", (c) => {
        n += c.length;
        if (n > 65536) {
          req.destroy(new Error("\u54CD\u5E94\u8FC7\u5927"));
          return;
        }
        s += c;
      });
      res.on("end", () => resolve(s));
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
    remote = (await getText(`https://raw.githubusercontent.com/${repo}/${branch}/VERSION`, timeout)).trim();
  } catch (e) {
    out({ local, remote: null, update_available: false, skip: `\u7248\u672C\u68C0\u67E5\u5931\u8D25(${e.message}),\u6309\u5F53\u524D\u7248\u672C\u7EE7\u7EED` });
  }
  if (!/^\d+\.\d+\.\d+$/.test(remote)) out({ local, remote, update_available: false, skip: "\u8FDC\u7AEF VERSION \u683C\u5F0F\u5F02\u5E38,\u6309\u5F53\u524D\u7248\u672C\u7EE7\u7EED" });
  if (!semverGt(remote, local)) out({ local, remote, update_available: false });
  out({ local, remote, update_available: true, notice: `\u6709\u65B0\u7248 v${remote}(\u5F53\u524D v${local});\u672C\u6B21\u4F1A\u8BDD\u4ECD\u7528\u5F53\u524D\u7248\u672C,\u5982\u9700\u66F4\u65B0\u8BF7\u624B\u52A8\u91CD\u88C5 .skill` });
}
main();

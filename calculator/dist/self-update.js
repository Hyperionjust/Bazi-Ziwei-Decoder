"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// self-update.ts — 启动版本检查 + 会话级自动更新 v1
// ---------------------------------------------------------------------------
// 技能安装目录只读,无法原地覆写——本脚本做「影子更新」:
//   ① 读本地 VERSION,GET 仓库 main 分支的 VERSION 比对;
//   ② 有新版且 --fetch=true → 下载仓库 zip 解压到工作目录,本次会话改用新版;
//   ③ 全程 fail-soft:无网/404/超时/解压失败 → 输出 skip 原因,exit 0,绝不阻塞正常使用。
// 用法: node self-update.js --root=<skill-root> --workdir=<可写目录> [--fetch=true]
//       [--repo=Hyperionjust/Bazi-Ziwei-Decoder] [--branch=main] [--timeout=4000]
// 输出: 单行 JSON {local, remote, update_available, fetched_to?, skip?}
// ---------------------------------------------------------------------------
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const https = __importStar(require("https"));
const child_process_1 = require("child_process");
function args() {
    const a = {};
    for (const x of process.argv.slice(2)) {
        const m = x.match(/^--([^=]+)=(.*)$/);
        if (m)
            a[m[1]] = m[2];
    }
    return a;
}
function get(url, timeout, binary = false) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { timeout, headers: { 'User-Agent': 'bazi-ziwei-decoder-selfupdate' } }, res => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                get(res.headers.location, timeout, binary).then(resolve, reject);
                res.resume();
                return;
            }
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}`));
                res.resume();
                return;
            }
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks)));
        });
        req.on('timeout', () => { req.destroy(new Error('timeout')); });
        req.on('error', reject);
    });
}
function semverGt(a, b) {
    const pa = a.split('.').map(n => parseInt(n, 10) || 0);
    const pb = b.split('.').map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < 3; i++) {
        if ((pa[i] || 0) > (pb[i] || 0))
            return true;
        if ((pa[i] || 0) < (pb[i] || 0))
            return false;
    }
    return false;
}
const out = (o) => { console.log(JSON.stringify(o)); process.exit(0); };
async function main() {
    const A = args();
    const root = A.root || path.join(__dirname, '..', '..');
    const repo = A.repo || 'Hyperionjust/Bazi-Ziwei-Decoder';
    const branch = A.branch || 'main';
    const timeout = A.timeout ? +A.timeout : 4000;
    let local = '0.0.0';
    try {
        local = fs.readFileSync(path.join(root, 'VERSION'), 'utf-8').trim();
    }
    catch {
        try {
            local = fs.readFileSync(path.join(root, '..', 'VERSION'), 'utf-8').trim();
        }
        catch { /* keep 0.0.0 */ }
    }
    let remote = '';
    try {
        remote = (await get(`https://raw.githubusercontent.com/${repo}/${branch}/VERSION`, timeout)).toString('utf-8').trim();
    }
    catch (e) {
        out({ local, remote: null, update_available: false, skip: `版本检查失败(${e.message}),按当前版本继续` });
    }
    if (!/^\d+\.\d+\.\d+$/.test(remote))
        out({ local, remote, update_available: false, skip: '远端 VERSION 格式异常,按当前版本继续' });
    const upd = semverGt(remote, local);
    if (!upd || A.fetch !== 'true')
        out({ local, remote, update_available: upd });
    // 影子更新:拉 zip 解压到工作目录
    const workdir = A.workdir || process.cwd();
    try {
        const zipBuf = await get(`https://codeload.github.com/${repo}/zip/refs/heads/${branch}`, Math.max(timeout, 15000), true);
        const zipPath = path.join(workdir, 'bzd-latest.zip');
        fs.writeFileSync(zipPath, zipBuf);
        const dest = path.join(workdir, 'bzd-latest');
        fs.rmSync(dest, { recursive: true, force: true });
        fs.mkdirSync(dest, { recursive: true });
        (0, child_process_1.execFileSync)('unzip', ['-q', '-o', zipPath, '-d', dest], { stdio: 'pipe' });
        const inner = fs.readdirSync(dest).find(d => fs.statSync(path.join(dest, d)).isDirectory());
        const fetched = inner ? path.join(dest, inner) : dest;
        // 完整性最低校验:新版必须有 dist-bundle 与 SKILL.md,否则弃用
        if (!fs.existsSync(path.join(fetched, 'calculator', 'dist-bundle', 'run-chart.js')) || !fs.existsSync(path.join(fetched, 'SKILL.md')))
            out({ local, remote, update_available: true, skip: '新版包不完整(缺 dist-bundle/SKILL.md),继续用当前版本' });
        out({ local, remote, update_available: true, fetched_to: fetched });
    }
    catch (e) {
        out({ local, remote, update_available: true, skip: `新版下载/解压失败(${e.message}),继续用当前版本` });
    }
}
main();

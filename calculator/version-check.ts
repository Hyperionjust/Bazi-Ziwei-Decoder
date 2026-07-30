// version-check.ts — 启动版本检查 v2（只读比对，不下载、不执行）
// ---------------------------------------------------------------------------
// 【v2 安全收敛（2026-07-30）】
//   v1 曾做「影子更新」：下载仓库 zip → unzip → 本次会话切到新版目录运行。
//   那等于「开机自动从网络拉取代码并执行」，属于远程代码执行/供应链风险的典型形状，
//   即使拉取的是作者自己的仓库也一样——任何安全审查都会（且应该）标记它。
//   本脚本因此**只保留版本比对**：
//     · 唯一的网络行为是 GET 一个纯文本 VERSION 文件；
//     · 不写任何文件、不起子进程、不解压、不改变后续命令的 skill-root；
//     · 发现新版只是告知用户「请重装 .skill」，更新与否完全由用户手动决定。
//   —— 全脚本无 child_process、无 fs 写入、无可执行产物落地。
//
//   ① 读本地 VERSION，GET 仓库 main 分支的 VERSION 比对（semver）；
//   ② 全程 fail-soft：无网/404/超时/格式异常 → 输出 skip 原因，exit 0，绝不阻塞正常使用。
// 用法: node version-check.js --root=<skill-root>
//       [--repo=Hyperionjust/Bazi-Ziwei-Decoder] [--branch=main] [--timeout=4000]
// 输出: 单行 JSON {local, remote, update_available, notice?, skip?}
// ---------------------------------------------------------------------------
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

function args(): Record<string, string> {
  const a: Record<string, string> = {};
  for (const x of process.argv.slice(2)) { const m = x.match(/^--([^=]+)=(.*)$/); if (m) a[m[1]] = m[2]; }
  return a;
}
// 只取文本。上限 64KB —— VERSION 文件只有几个字节，超出即视为拿错了东西。
function getText(url: string, timeout: number, depth = 0): Promise<string> {
  return new Promise((resolve, reject) => {
    if (depth > 3) { reject(new Error('重定向过多')); return; }
    const req = https.get(url, { timeout, headers: { 'User-Agent': 'bazi-ziwei-decoder-versioncheck' } }, res => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        getText(res.headers.location, timeout, depth + 1).then(resolve, reject); res.resume(); return;
      }
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); res.resume(); return; }
      let s = ''; let n = 0;
      res.setEncoding('utf-8');
      res.on('data', c => { n += c.length; if (n > 65536) { req.destroy(new Error('响应过大')); return; } s += c; });
      res.on('end', () => resolve(s));
    });
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
    req.on('error', reject);
  });
}
function semverGt(a: string, b: string): boolean {
  const pa = a.split('.').map(n => parseInt(n, 10) || 0);
  const pb = b.split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) { if ((pa[i] || 0) > (pb[i] || 0)) return true; if ((pa[i] || 0) < (pb[i] || 0)) return false; }
  return false;
}
const out = (o: any) => { console.log(JSON.stringify(o)); process.exit(0); };

async function main() {
  const A = args();
  const root = A.root || path.join(__dirname, '..', '..');
  const repo = A.repo || 'Hyperionjust/Bazi-Ziwei-Decoder';
  const branch = A.branch || 'main';
  const timeout = A.timeout ? +A.timeout : 4000;
  let local = '0.0.0';
  try { local = fs.readFileSync(path.join(root, 'VERSION'), 'utf-8').trim(); }
  catch { try { local = fs.readFileSync(path.join(root, '..', 'VERSION'), 'utf-8').trim(); } catch { /* keep 0.0.0 */ } }

  let remote = '';
  try { remote = (await getText(`https://raw.githubusercontent.com/${repo}/${branch}/VERSION`, timeout)).trim(); }
  catch (e) { out({ local, remote: null, update_available: false, skip: `版本检查失败(${(e as Error).message}),按当前版本继续` }); }
  if (!/^\d+\.\d+\.\d+$/.test(remote)) out({ local, remote, update_available: false, skip: '远端 VERSION 格式异常,按当前版本继续' });

  if (!semverGt(remote, local)) out({ local, remote, update_available: false });
  out({ local, remote, update_available: true, notice: `有新版 v${remote}(当前 v${local});本次会话仍用当前版本,如需更新请手动重装 .skill` });
}
main();

// schema-check.ts — 配置完整性自检
// 用法: npx tsx schema-check.ts   (有错 exit 1)
// 目的:防止 Cowork 改了 shensha.json 却漏改 shensha.ts(新 method 没有 case),
//       或 lineage 白名单引用了不存在的神煞 id 等"改一处漏一处"的错。

import * as fs from 'fs';
import * as path from 'path';

const here = __dirname;
const defs = JSON.parse(fs.readFileSync(path.join(here, 'shensha.json'), 'utf-8'));
const lin  = JSON.parse(fs.readFileSync(path.join(here, 'lineages.json'), 'utf-8'));
const tsSrc = fs.readFileSync(path.join(here, 'shensha.ts'), 'utf-8');

const errs: string[] = [];
const warns: string[] = [];

// 引擎实际实现的 method(从 shensha.ts 的 `case 'xxx':` 抽取)
const engineMethods = new Set(
  [...tsSrc.matchAll(/case\s+'([^']+)':/g)].map(m => m[1])
);

const ALLOWED_TIERS = new Set(['T1', 'T2', 'T3', 'COMPOUND']);
const REQUIRED = ['id', 'name', 'tier', 'method', 'source'];
const ids = new Set<string>();

for (const d of defs.shensha) {
  for (const f of REQUIRED) if (d[f] === undefined || d[f] === '') errs.push(`[${d.id || '?'}] 缺字段 ${f}`);
  if (ids.has(d.id)) errs.push(`[${d.id}] id 重复`);
  ids.add(d.id);
  if (!ALLOWED_TIERS.has(d.tier)) errs.push(`[${d.id}] tier 非法: ${d.tier}`);
  if (typeof d.needs_review !== 'boolean') errs.push(`[${d.id}] needs_review 须为 boolean`);
  // ★核心校验:每个 method 必须在引擎里有 case
  if (!engineMethods.has(d.method)) errs.push(`[${d.id}] method '${d.method}' 在 shensha.ts 中无对应 case —— 改了 json 别忘了加引擎分派`);
  if (d.needs_review) warns.push(`[${d.id}] ${d.name} 标记 needs_review,起法待人工定版`);
}

// lineage 引用的神煞 id 必须存在
for (const [key, L] of Object.entries<any>(lin.lineages)) {
  const pol = L.shensha_policy || {};
  const wl = pol.whitelist || pol.whitelist_TODO || {};
  for (const sid of Object.keys(wl)) {
    if (!ids.has(sid)) errs.push(`[lineage ${key}] 白名单引用了不存在的神煞 id: ${sid}`);
  }
  for (const sid of (pol.blacklist || [])) {
    if (!ids.has(sid)) errs.push(`[lineage ${key}] 黑名单引用了不存在的神煞 id: ${sid}`);
  }
  // 段氏 stub 允许字符串权重(TODO),其余派权重须为数字
  if (!key.includes('TODO') && pol.whitelist) {
    for (const [sid, w] of Object.entries(pol.whitelist)) {
      if (typeof w !== 'number') errs.push(`[lineage ${key}] ${sid} 权重须为数字(非 stub 派),现为: ${w}`);
    }
  }
}

// 报告
if (warns.length) console.log('⚠ 待人工核对:\n  ' + warns.join('\n  ') + '\n');
if (errs.length) {
  console.log('❌ schema 自检失败:\n  ' + errs.join('\n  '));
  process.exit(1);
}
console.log(`✅ schema 自检通过 (${defs.shensha.length} 神煞, ${Object.keys(lin.lineages).length} 流派, 引擎 method: ${[...engineMethods].join('/')})`);

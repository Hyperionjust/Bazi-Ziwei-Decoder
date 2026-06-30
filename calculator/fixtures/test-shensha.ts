// test-shensha.ts — 神煞引擎回归测试运行器
// 用法: cd fixtures && npx tsx test-shensha.ts
// 成功 exit 0;任一用例失败 exit 1(Cowork 以此判断是否收敛)。

import * as fs from 'fs';
import * as path from 'path';
import { computeShensha, Hit } from '../shensha';

const here = __dirname;
const defs  = JSON.parse(fs.readFileSync(path.join(here, '..', 'shensha.json'), 'utf-8'));
const lin   = JSON.parse(fs.readFileSync(path.join(here, '..', 'lineages.json'), 'utf-8'));
const cases = JSON.parse(fs.readFileSync(path.join(here, 'shensha-cases.json'), 'utf-8')).cases;

let failed = 0;

function subset(want: string[], got: string[]): boolean {
  return want.every(w => got.includes(w));
}

for (const c of cases) {
  const policy = lin.lineages[c.lineage]?.shensha_policy;
  if (!policy) { console.log(`✗ ${c.id}: 未知流派 ${c.lineage}`); failed++; continue; }

  const hits: Hit[] = computeShensha(c.chart, defs, policy);
  const byId = new Map(hits.map(h => [h.id, h]));
  const errs: string[] = [];

  // expect_count
  if (typeof c.expect_count === 'number' && hits.length !== c.expect_count)
    errs.push(`命中数 ${hits.length} ≠ 预期 ${c.expect_count} [实际: ${hits.map(h=>h.name).join('、')}]`);

  // expect_present
  for (const e of (c.expect_present || [])) {
    const h = byId.get(e.id);
    if (!h) { errs.push(`缺命中: ${e.name}(${e.id})`); continue; }
    if (e.pillars && !subset(e.pillars, h.pillars))
      errs.push(`${e.name} 柱不符: 预期⊆ [${e.pillars}] 实际 [${h.pillars}]`);
  }

  // expect_absent
  for (const id of (c.expect_absent || []))
    if (byId.has(id)) errs.push(`不应命中却出现: ${byId.get(id)!.name}(${id}) @${byId.get(id)!.pillars.join('')}`);

  if (errs.length) { console.log(`✗ ${c.id}\n   - ${errs.join('\n   - ')}`); failed++; }
  else console.log(`✓ ${c.id} (${hits.length} 命中)`);
}

console.log(`\n${failed === 0 ? '✅ 全部通过' : `❌ ${failed} 个用例失败`}  (${cases.length} 例)`);
process.exit(failed === 0 ? 0 : 1);

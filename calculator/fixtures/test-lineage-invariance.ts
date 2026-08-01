// 五流派不变性：流派只生成解读子视图，不得改旺衰、open 关系或总置信度。
import * as crypto from 'crypto';
import * as path from 'path';
import { spawnSync } from 'child_process';

let failed = 0;
function ok(condition: boolean, message: string): void {
  if (condition) console.log('✓', message);
  else { console.log('✗', message); failed++; }
}

const calculatorDir = path.join(__dirname, '..');
const tsxCli = path.join(calculatorDir, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const runChart = path.join(calculatorDir, 'run-chart.ts');
const lineages = ['ziping', 'ditian', 'shenfeng', 'mangpai', 'open'];
const fingerprints = new Map<string, string>();

for (const lineage of lineages) {
  const result = spawnSync(process.execPath, [tsxCli, runChart,
    '--year=1910', '--month=6', '--day=3', '--hour=22', '--minute=0', '--gender=female',
    '--timeZone=8', '--currentYear=2026', `--lineage=${lineage}`,
  ], { cwd: calculatorDir, encoding: 'utf-8', maxBuffer: 24 * 1024 * 1024 });
  ok(result.status === 0, `${lineage} 排盘命令成功${result.status === 0 ? '' : `：${result.stderr}`}`);
  if (result.status !== 0) continue;
  const chart = JSON.parse(result.stdout);
  const enrichment = chart.bazi.enrichment;
  const stable = {
    旺衰: enrichment.旺衰,
    open作用关系: {
      policy: enrichment.作用关系.policy,
      policy_note: enrichment.作用关系.policy_note,
      items: enrichment.作用关系.items,
    },
    confidence_tier: enrichment.confidence_tier,
  };
  const hash = crypto.createHash('sha256').update(JSON.stringify(stable)).digest('hex');
  fingerprints.set(lineage, hash);
  if (lineage === 'open') ok(!enrichment.作用关系.lineage, 'open 镜片不重复生成 lineage 子视图');
  else ok(!!enrichment.作用关系.lineage && enrichment.作用关系.lineage.id === lineage, `${lineage} 只附本派关系子视图`);
}

const unique = new Set(fingerprints.values());
ok(fingerprints.size === 5 && unique.size === 1,
  `五流派旺衰/open关系/confidence 逐字一致（${[...fingerprints.entries()].map(([key, hash]) => `${key}:${hash.slice(0, 10)}`).join(' ') }）`);

if (failed) {
  console.log(`\n❌ 流派不变性失败 ${failed} 项`);
  process.exit(1);
}
console.log('\n✅ 五流派不变性全部通过');

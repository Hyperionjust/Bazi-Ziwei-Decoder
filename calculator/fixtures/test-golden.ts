// test-golden.ts — 随包样例即金标(v3.9.1 新增)
// ---------------------------------------------------------------------------
// 四条海报线的 examples/sample-analysis-*.json 必须各自通过对应 mode 的体检。
// 它们同时是 few-shot 素材:样例本身破规 = 教模型破规(v3.8 就修过一次
// ——sample-analysis 判词 8 字违反 7字/4+4、主叙事是第三人称播报腔)。
// ---------------------------------------------------------------------------
import * as fs from 'fs';
import * as path from 'path';
import { checkAnalysis, checkZonghe, checkZiwei, checkMbti } from '../check-analysis';

function findRoot(start: string): string {
  let d = start;
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(d, 'SKILL.md'))) return d;
    d = path.dirname(d);
  }
  return path.join(start, '..', '..');
}
const ROOT = findRoot(__dirname);
const EX = path.join(ROOT, 'examples');
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(EX, f), 'utf-8'));
const chart = read('sample-chart.json');

type Rep = Record<string, { status: string; reasons: string[] }>;
const CASES: [string, string, () => Rep][] = [
  ['bazi',   'sample-analysis-bazi.json',   () => checkAnalysis(read('sample-analysis-bazi.json'), chart, 2026)],
  ['zonghe', 'sample-analysis-zonghe.json', () => checkZonghe(read('sample-analysis-zonghe.json'), chart)],
  ['ziwei',  'sample-analysis-ziwei.json',  () => checkZiwei(read('sample-analysis-ziwei.json'), chart)],
  ['mbti',   'sample-analysis-mbti.json',   () => checkMbti(read('sample-analysis-mbti.json'), chart)],
];

let fail = 0;
for (const [mode, file, run] of CASES) {
  if (!fs.existsSync(path.join(EX, file))) { console.error(`❌ ${mode}: 缺随包样例 ${file}`); fail++; continue; }
  const rep = run();
  const bad = Object.entries(rep).filter(([, v]) => v.status === 'FAIL');
  if (bad.length) {
    console.error(`❌ ${mode} (${file}) 体检不过:`);
    for (const [k, v] of bad) console.error(`     ${k} → ${v.reasons.join(' / ')}`);
    fail++;
  } else {
    console.log(`  ✓ ${mode.padEnd(6)} ${file} — ALL PASS (${Object.keys(rep).length} 项)`);
  }
}

// 渲染产物也要齐:每条线都应有一份可直接打开的样例海报
for (const f of ['sample-bazi-report.html', 'sample-zonghe-report.html', 'sample-ziwei-report.html', 'sample-mbti-report.html']) {
  const p = path.join(EX, f);
  if (!fs.existsSync(p)) { console.error(`❌ 缺渲染样例 ${f}`); fail++; continue; }
  const html = fs.readFileSync(p, 'utf-8');
  const left = html.match(/\{\{[A-Za-z_0-9]+\}\}/g);
  if (left) { console.error(`❌ ${f} 残留未替换占位符 ${left.length} 处: ${left.slice(0, 3).join(',')}`); fail++; }
}

if (fail) { console.error(`\n金标样例 ${fail} 处不合格`); process.exit(1); }
console.log('✅ 全部通过 (四线金标样例 + 四份渲染产物)');

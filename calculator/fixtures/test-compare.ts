// test-compare.ts — 多年对比回归(P1-B)
// 探针盘 2000-01-01 12:00(己卯 丙子 戊午 戊午), 对比 2026/2027/2028
// 用法: npx tsx test-compare.ts (或 esbuild 打包后 node 直跑);全过 exit 0
import { analyzeCompareYears } from '../bazi-enrich/yunsui';
import { createChart } from '../yiqi-core/index';
import { enrichOpen as enrichBazi } from './support/open-policy';

let failed = 0;
function ok(cond: boolean, msg: string) { if (cond) console.log('✓', msg); else { console.log('✗', msg); failed++; } }

const chart: any = createChart({ year: 2000, month: 1, day: 1, hour: 12, minute: 0, gender: 'male', isLunar: false, timeZone: 8 } as any);
const siZhu: any = { 年: chart.bazi.siZhu.year, 月: chart.bazi.siZhu.month, 日: chart.bazi.siZhu.day, 时: chart.bazi.siZhu.hour };
const en: any = enrichBazi(siZhu);
const chuKou = en.用神建议?.出口;

const r = analyzeCompareYears(siZhu, chart.bazi.dayun || [], [2026, 2027, 2028], chuKou);

// ── 1) 年集与干支 ────────────────────────────────────────────────────────
ok(r.年.length === 3, `恰 3 个年份条目 (得到 ${r.年.length})`);
ok(r.年.map(e => e.干支).join(',') === '丙午,丁未,戊申', `干支=丙午/丁未/戊申 (得到 ${r.年.map(e => e.干支).join(',')})`);
ok(r.年.every(e => /\(\d{4}-\d{4}\)/.test(e.大运)), '每年附所在大运(含年份区间)');

// ── 2) 逐年引动(复用流年检测器) ───────────────────────────────────────────
const y26 = r.年[0];
ok(y26.vs原局.some(h => h.type === '支冲' && h.desc.includes('提纲')), '2026 丙午: 午冲月支子(冲提纲)检出');
ok(y26.vs原局.some(h => h.type === '自刑'), '2026 丙午: 午午自刑检出');
ok(y26.重级引动.some(s => s.includes('冲提纲')), '2026 重级引动含冲提纲标记');
const y27 = r.年[1];
ok(y27.vs原局.some(h => h.type === '支害(穿)') && y27.vs原局.some(h => h.type === '支合'), '2027 丁未: 未穿子 + 未午合检出');

// ── 3) 喜忌评分(用神出口口径, 同盘可复现) ─────────────────────────────────
ok(r.年.every(e => Number.isInteger(e.喜忌对照.评分) && e.喜忌对照.评分 >= -2 && e.喜忌对照.评分 <= 2), '评分 ∈ [-2, 2] 整数');
ok(r.年.every(e => /·(喜|忌|平)$/.test(e.喜忌对照.干) && /·(喜|忌|平)$/.test(e.喜忌对照.支)), '干支各附 喜/忌/平 标注');
const r2 = analyzeCompareYears(siZhu, chart.bazi.dayun || [], [2026, 2027, 2028], chuKou);
ok(JSON.stringify(r) === JSON.stringify(r2), '同盘同年集重算结果一致(确定性可复现)');

// ── 4) 无出口时评分退化为 0(不崩) ────────────────────────────────────────
const r3 = analyzeCompareYears(siZhu, chart.bazi.dayun || [], [2026]);
ok(r3.年[0].喜忌对照.评分 === 0 && r3.年[0].喜忌对照.干.endsWith('·平'), '无用神出口 → 评分 0 全平(降级不崩)');

if (failed === 0) { console.log('\n✅ 全部通过 (多年对比)'); process.exit(0); }
else { console.log(`\n❌ ${failed} 项失败`); process.exit(1); }

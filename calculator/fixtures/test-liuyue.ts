// test-liuyue.ts — 流月引动回归(P1-A)
// 已知年份 2026(丙午): 五虎遁 丙辛起庚寅 → 庚寅…辛丑;探针盘 2000-01-01 12:00(己卯 丙子 戊午 戊午)
// 用法: npx tsx test-liuyue.ts (或 esbuild 打包后 node 直跑);全过 exit 0
import { analyzeLiuYue } from '../bazi-enrich/liuyue';
import { suiVsYun } from '../bazi-enrich/yunsui';
import { createChart } from '../yiqi-core/index';

let failed = 0;
function ok(cond: boolean, msg: string) { if (cond) console.log('✓', msg); else { console.log('✗', msg); failed++; } }

const chart: any = createChart({ year: 2000, month: 1, day: 1, hour: 12, minute: 0, gender: 'male', isLunar: false, timeZone: 8 } as any);
const siZhu: any = { 年: chart.bazi.siZhu.year, 月: chart.bazi.siZhu.month, 日: chart.bazi.siZhu.day, 时: chart.bazi.siZhu.hour };

const r = analyzeLiuYue(siZhu, chart.bazi.dayun || [], 2026);

// ── 1) 12 流月干支(丙午年·五虎遁) ─────────────────────────────────────────
ok(r.年干支 === '丙午', `2026 年干支=丙午 (得到 ${r.年干支})`);
ok(r.月.length === 12, `恰 12 个流月 (得到 ${r.月.length})`);
const expectGZ = ['庚寅', '辛卯', '壬辰', '癸巳', '甲午', '乙未', '丙申', '丁酉', '戊戌', '己亥', '庚子', '辛丑'];
ok(r.月.map(m => m.干支).join(',') === expectGZ.join(','),
  `12 流月干支=五虎遁定序 (得到 ${r.月.map(m => m.干支).join(',')})`);

// ── 2) 节气公历对照(lunar-typescript 精确表) ──────────────────────────────
ok(r.月[0].公历起 === '2026-02-04', `寅月起=立春 2026-02-04 (得到 ${r.月[0].公历起})`);
ok(r.月[0].公历止 === '2026-03-05', `寅月止=惊蛰日 (得到 ${r.月[0].公历止})`);
ok(r.月[11].公历起 === '2027-01-05', `丑月起=次年小寒 2027-01-05 (得到 ${r.月[11].公历起})`);
ok(r.月[11].公历止 === '2027-02-04', `丑月止=次年立春 2027-02-04 (得到 ${r.月[11].公历止})`);
ok(r.月[6].约农历月 === '七月' && r.月[6].支 === '申', '申月≈农历七月(月级白话对照)');

// ── 3) 逐月引动命中(vs 原局 己卯 丙子 戊午 戊午;至少 2 条已知命中) ──────────
const mao = r.月[1];  // 辛卯月
ok(mao.vs原局.some(h => h.type === '相刑' && h.desc.includes('卯')), `卯月 vs 月支子: 子卯相刑检出 (${mao.干支})`);
ok(mao.vs原局.some(h => h.type === '支破'), '卯月 vs 日/时支午: 午卯破检出');
const wu = r.月[4];   // 甲午月
ok(wu.vs原局.some(h => h.type === '支冲' && h.desc.includes('提纲')), '午月冲月支子: 冲提纲检出');
ok(wu.vs原局.some(h => h.type === '自刑'), '午月 vs 日/时支午: 午午自刑检出');
ok(wu.vs原局.some(h => h.type === '干合' && h.desc.includes('甲')), '甲午月天干甲合年干己: 干合检出');
ok(wu.vs原局.every(h => h.desc.startsWith('流月')), '流月 hits 描述以「流月」开头(复用检测器换 label)');

// ── 4) vs 大运存在且为数组;suiVsYun label 缺省行为不变 ────────────────────
ok(Array.isArray(wu.vs大运), 'vs大运 已计算(数组)');
const s1 = suiVsYun({ gan: '甲', zhi: '子' } as any, { gan: '庚', zhi: '午' } as any);
ok(s1.some(h => h.desc.startsWith('流年')), 'suiVsYun 缺省 label 仍为「流年」(向后兼容)');
const s2 = suiVsYun({ gan: '甲', zhi: '子' } as any, { gan: '庚', zhi: '午' } as any, '流月');
ok(s2.some(h => h.desc.startsWith('流月')), 'suiVsYun label=流月 生效');

if (failed === 0) { console.log('\n✅ 全部通过 (流月引动)'); process.exit(0); }
else { console.log(`\n❌ ${failed} 项失败`); process.exit(1); }

// test-boundary.ts — v3.5 边界回归：阴阳男女年干口径 / 农历输入 / 时区换算 / 晚子时 / 闰月 / 调候表 / 格局纯气
// 背景: v3.5 修复了一批边界接线 bug——getYinYang 误用公历年干(1月~春节前出生大限方向全错)、
//       --isLunar/--timeZone 被静默忽略、紫微晚子时与八字不同步、闰月未定义、丁寅调候错、午月误作纯气。
// 用法: npx tsx test-boundary.ts ;全过 exit 0
import { createChart, resolveSolarClock } from '../yiqi-core/index';
import { getTiaoHou } from '../bazi-enrich/tiao-hou';
import { judgeGeJu } from '../bazi-enrich/ge-ju';

let failed = 0;
function ok(cond: boolean, msg: string) { if (cond) console.log('✓', msg); else { console.log('✗', msg); failed++; } }

const DIZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const pillarStr = (c: any) => [c.bazi.siZhu.year, c.bazi.siZhu.month, c.bazi.siZhu.day, c.bazi.siZhu.hour]
  .map((p: any) => p.gan + p.zhi).join(' ');

// ── 1) 阴阳男女取农历年干(核心回归: 2000-01-01 = 农历己卯年, 阴年) ─────────────
const c1 = createChart({ year: 2000, month: 1, day: 1, hour: 12, minute: 0, gender: 'male', isLunar: false, timeZone: 8 } as any);
ok(pillarStr(c1) === '己卯 丙子 戊午 戊午', '探针盘四柱=己卯 丙子 戊午 戊午');
ok(c1.ziwei.yinYang === '阴男', '2000-01-01(农历己卯年)男=阴男(修复前误为阳男)');
ok(c1.ziwei.gongs[0].dizhi === '午' && c1.ziwei.gongs[0].mainStars.includes('紫微'), '命宫午·紫微坐命');
ok(c1.ziwei.wuXingJu.number === 5, '土五局');
ok(c1.ziwei.mingGongIndex === c1.ziwei.shenGongIndex, '命身同宫(午时生于十一月)');
// 阴男大限逆行: 第二大限应落在兄弟宫方向(宫序下一位, 地支-1)
const g1 = c1.ziwei.gongs;
const dx1 = g1[0].daXian, dx2 = g1[1].daXian;
ok(g1[0].gong === '命宫' && dx1 && dx1.startAge === 5, '土五局 5 虚岁起限');
ok(g1[1].gong.startsWith('兄弟') && dx2 && dx2.startAge === 15, '阴男逆行: 第二大限入兄弟宫(修复前顺行入父母宫)');
// 对照: 立春后同年(2000-02-05, 农历庚辰年)应为阳男且方向相反
const c1b = createChart({ year: 2000, month: 2, day: 5, hour: 12, minute: 0, gender: 'male', isLunar: false, timeZone: 8 } as any);
ok(c1b.ziwei.yinYang === '阳男', '2000-02-05(农历庚辰年)男=阳男');

// ── 2) 农历输入真正生效(修复前 --isLunar 被静默忽略) ─────────────────────────
const c2 = createChart({ year: 1999, month: 11, day: 25, hour: 12, minute: 0, gender: 'male', isLunar: true, timeZone: 8 } as any);
ok(pillarStr(c2) === '己卯 丙子 戊午 戊午' && c2.ziwei.yinYang === '阴男' && c2.ziwei.gongs[0].dizhi === '午',
  '农历1999-11-25 ≡ 公历2000-01-01(同一盘)');
// 闰月输入(2023 闰二月初一 = 公历 2023-03-22)
const c2r = createChart({ year: 2023, month: -2, day: 1, hour: 12, minute: 0, gender: 'male', isLunar: true, timeZone: 8 } as any);
const c2s = createChart({ year: 2023, month: 3, day: 22, hour: 12, minute: 0, gender: 'male', isLunar: false, timeZone: 8 } as any);
ok(pillarStr(c2r) === pillarStr(c2s), '农历闰二月初一 ≡ 公历2023-03-22(负月=闰月)');
// 闰月排盘不崩且按本月论: 公历 2023-04-01 = 农历闰二月十一, 命宫应与(非闰)二月十一一致
const c3 = createChart({ year: 2023, month: 4, day: 1, hour: 12, minute: 0, gender: 'male', isLunar: false, timeZone: 8 } as any);
const c3ref = createChart({ year: 2023, month: 2, day: 11, hour: 12, minute: 0, gender: 'male', isLunar: true, timeZone: 8 } as any);
ok(Number.isInteger(c3.ziwei.mingGongIndex) && c3.ziwei.mingGongIndex === c3ref.ziwei.mingGongIndex,
  '闰二月十一出生: 命宫按二月论, 与非闰参考盘一致(修复前负月份代入算错宫位)');

// ── 3) 时区换算(修复前被静默忽略) ───────────────────────────────────────────
const c4 = createChart({ year: 2000, month: 1, day: 1, hour: 4, minute: 0, gender: 'male', isLunar: false, timeZone: 0 } as any);
ok(pillarStr(c4) === '己卯 丙子 戊午 戊午', 'timeZone=0 的 04:00 ≡ 东八区 12:00(同一盘)');
const c4b = createChart({ year: 2000, month: 1, day: 1, hour: 20, minute: 0, gender: 'male', isLunar: false, timeZone: 8 } as any);
const c4c = createChart({ year: 2000, month: 1, day: 1, hour: 7, minute: 0, gender: 'male', isLunar: false, timeZone: -5 } as any);
ok(pillarStr(c4b) === pillarStr(c4c), 'timeZone=-5(美东) 07:00 ≡ 东八区 20:00(跨日界换算)');
// resolveSolarClock 半时区
const r4 = resolveSolarClock({ year: 2000, month: 1, day: 1, hour: 0, minute: 30, gender: 'male', isLunar: false, timeZone: 5.5 } as any);
ok(r4.hour === 3 && r4.minute === 0, 'timeZone=5.5(印度) 00:30 → 东八区 03:00');

// ── 4) 晚子时两盘同步(23 点换日) ─────────────────────────────────────────────
const c5 = createChart({ year: 2000, month: 1, day: 1, hour: 23, minute: 30, gender: 'male', isLunar: false, timeZone: 8 } as any);
ok(pillarStr(c5).startsWith('己卯 丙子 己未'), '八字晚子时: 日柱推次日己未');
ok(c5.ziwei.lunarDate.day === 26, '紫微晚子时: 农历日同步为廿六(修复前仍为廿五)');
const c5ref = createChart({ year: 2000, month: 1, day: 2, hour: 0, minute: 30, gender: 'male', isLunar: false, timeZone: 8 } as any);
ok(c5.ziwei.mingGongIndex === c5ref.ziwei.mingGongIndex, '晚子时紫微命宫 ≡ 次日早子时命宫');

// ── 5) 调候表: 丁日寅月 = 甲庚(《穷通宝鉴》: 非庚不能劈甲,非甲不能引丁) ──────
const th = getTiaoHou('丁' as any, '寅' as any);
ok(th.join('') === '甲庚', '丁日寅月调候=甲庚(修复前误作庚壬)');

// ── 6) 格局: 午月非纯气, 甲日午月己土透干立正财格(修复前恒误立伤官格) ─────────
const ge = judgeGeJu({ 年: { gan: '己', zhi: '卯' }, 月: { gan: '庚', zhi: '午' }, 日: { gan: '甲', zhi: '子' }, 时: { gan: '甲', zhi: '子' } } as any);
ok(ge.primary === '正财格', `甲日午月己土透干=正财格(得到: ${ge.primary})`);
const ge2 = judgeGeJu({ 年: { gan: '丙', zhi: '子' }, 月: { gan: '甲', zhi: '午' }, 日: { gan: '甲', zhi: '子' }, 时: { gan: '甲', zhi: '子' } } as any);
ok(ge2.primary === '伤官格', `甲日午月丁己皆不透=本气伤官格(得到: ${ge2.primary})`);

// ── 7) 运岁补检: 伏吟兼自刑 / 岁运相刑 ────────────────────────────────────────
import { gzVsChart, suiVsYun } from '../bazi-enrich/yunsui';
const SZ7 = { 年: { gan: '壬', zhi: '子' }, 月: { gan: '壬', zhi: '寅' }, 日: { gan: '丙', zhi: '辰' }, 时: { gan: '丙', zhi: '申' } } as any;
const hits7 = gzVsChart({ gan: '丙', zhi: '辰' } as any, SZ7, '流年');
ok(hits7.some(h => h.type === '伏吟') && hits7.some(h => h.type === '自刑'), '丙辰流年 vs 日柱丙辰: 伏吟+自刑双报(修复前自刑被吞)');
ok(suiVsYun({ gan: '辛', zhi: '卯' } as any, { gan: '甲', zhi: '子' } as any).some(h => h.type === '相刑'), '流年卯 vs 大运子: 无礼之刑检出(修复前漏报)');
ok(suiVsYun({ gan: '辛', zhi: '酉' } as any, { gan: '辛', zhi: '酉' } as any).some(h => h.type === '自刑'), '岁运并临酉酉: 自刑检出');

// ── 8) 拱会收紧: 夹拱中位才算拱, 其余为半会 ──────────────────────────────────
import { detectZhiRelations } from '../bazi-enrich/zhi-relations';
const zr8a = detectZhiRelations({ 年: '寅', 月: '辰', 日: '子', 时: '戌' } as any);
ok(zr8a.some(r => r.type === '拱会' && (r.detail || '').includes('卯')), '寅辰相邻=拱会卯(夹拱中位)');
const zr8b = detectZhiRelations({ 年: '寅', 月: '卯', 日: '子', 时: '戌' } as any);
ok(!zr8b.some(r => r.type === '拱会') && zr8b.some(r => r.type === '半会'), '寅卯=木方半会(修复前误报拱会辰)');

// ── 9) 旺衰: 墓库不作衰论 / 极旺门槛抬高 ─────────────────────────────────────
import { judgeWangShuai } from '../bazi-enrich/wang-shuai';
const ws9 = judgeWangShuai({ 年: { gan: '甲', zhi: '寅' }, 月: { gan: '丙', zhi: '未' }, 日: { gan: '甲', zhi: '子' }, 时: { gan: '甲', zhi: '子' } } as any);
ok(!(ws9.breakdown.details.join('').match(/墓 \(-3\)/)), '甲日主未月(墓): 长生修正不再判 -3(墓库有根)');
const ws9b = judgeWangShuai({ 年: { gan: '丙', zhi: '午' }, 月: { gan: '甲', zhi: '午' }, 日: { gan: '丙', zhi: '午' }, 时: { gan: '甲', zhi: '午' } } as any);
ok(ws9b.verdict.includes('极旺'), '四午丙火(得令+多根+印势)仍判极旺');
const ws9c = judgeWangShuai({ 年: { gan: '壬', zhi: '辰' }, 月: { gan: '丙', zhi: '午' }, 日: { gan: '丙', zhi: '午' }, 时: { gan: '戊', zhi: '子' } } as any);
ok(!ws9c.verdict.includes('极旺'), `丙午日午月仅得令帝旺、杀食夹制, 不再误报从强(得到: ${ws9c.verdict} ${ws9c.score})`);

// ── 10) v3.8 真太阳时可选校正(--longitude, 默认关) ───────────────────────────
// 6月中旬均时差≈0:120°E 校正≈0;90°E ≈ -120min;缺省完全不动
const r10a = resolveSolarClock({ year: 2000, month: 6, day: 14, hour: 12, minute: 30, gender: 'male', isLunar: false, timeZone: 8, longitude: 120 } as any);
ok(r10a.hour === 12 && Math.abs(r10a.minute - 30) <= 2, `lon=120 6月中旬(均时差≈0): 12:30→≈12:30 (得到 ${r10a.hour}:${r10a.minute})`);
const r10b = resolveSolarClock({ year: 2000, month: 6, day: 14, hour: 12, minute: 30, gender: 'male', isLunar: false, timeZone: 8, longitude: 90 } as any);
ok(r10b.hour === 10 && Math.abs(r10b.minute - 30) <= 2, `lon=90: 12:30→≈10:30 经度差-120min (得到 ${r10b.hour}:${r10b.minute})`);
const r10c = resolveSolarClock({ year: 2000, month: 2, day: 12, hour: 12, minute: 0, gender: 'male', isLunar: false, timeZone: 8, longitude: 120 } as any);
ok(r10c.hour === 11 && r10c.minute >= 43 && r10c.minute <= 49, `lon=120 2月中旬(均时差≈-14min): 12:00→≈11:46 (得到 ${r10c.hour}:${r10c.minute})`);
const r10d = resolveSolarClock({ year: 2000, month: 6, day: 14, hour: 12, minute: 30, gender: 'male', isLunar: false, timeZone: 8 } as any);
ok(r10d.hour === 12 && r10d.minute === 30, '缺省 longitude: 完全不校正(默认关,现行为不变)');

// ── S1-2(v3.11.0):调候∩扶抑 轴冲突显式标记 ────────────────────────────────
// 公开命例回测暴露(毛泽东盘,1893-12-26 辰时,史料公案):该盘调候取甲庚(木金)而
// 扶抑忌金 —— 庚金年【调候说该来、扶抑说别来】。改动前两轴各说各的、谁也不提对方,
// 解读层只能读成两个独立信号,写出来就是「宜金」和「忌金」并列出现,自相矛盾还看不出
// 为什么。现在把交集摆到明处 + 给出文硬约束。验收用两个公开命例(多案例制,不单盘校准)。
{
  const enrich = require('../bazi-enrich/enrich').enrichBazi;
  const of = (y: number, m: number, d: number, h: number) => {
    const c: any = createChart({ year: y, month: m, day: d, hour: h, minute: 0, gender: 'male', isLunar: false, timeZone: 8 } as any);
    const sz = c.bazi.siZhu;
    return { 柱: ['year','month','day','hour'].map(k => sz[k].gan + sz[k].zhi).join(' '),
             y: enrich({ 年: sz.year, 月: sz.month, 日: sz.day, 时: sz.hour }).用神建议 };
  };
  const mao = of(1893, 12, 26, 8);
  ok(mao.柱 === '癸巳 甲子 丁酉 甲辰', `案例一(毛泽东盘)四柱 (得到 ${mao.柱})`);
  const zc = mao.y.出口.轴冲突;
  ok(!!zc && zc.五行.join('') === '金',
    `案例一轴冲突=金(调候取${mao.y.调候.取.join('')} ∩ 扶抑忌${mao.y.扶抑.忌.join('')}) (得到 ${zc ? zc.五行.join('') : '无'})`);
  ok(!!zc && /合并叙述/.test(zc.出文要求) && /不得两处各说一遍/.test(zc.出文要求),
    '轴冲突带「合并叙述、不得两处各说一遍」的出文硬约束');
  // 案例二(吴佩孚盘,典籍命例库 classics/):戊/辰 调候甲丙癸 ∩ 扶抑忌火土 → 冲突=火
  const wu = of(1874, 4, 21, 0);
  ok(wu.柱 === '甲戌 戊辰 戊申 壬子', `案例二(吴佩孚盘)四柱 (得到 ${wu.柱})`);
  const zc2 = wu.y.出口.轴冲突;
  ok(!!zc2 && zc2.五行.join('') === '火',
    `案例二轴冲突=火(调候取${wu.y.调候.取.join('')} ∩ 扶抑忌${wu.y.扶抑.忌.join('')}) (得到 ${zc2 ? zc2.五行.join('') : '无'})`);
  // 交集为空的盘不得平白多出这个字段(免得解读层被无谓的告警噪音淹掉)
  const ok2000 = of(2000, 1, 1, 12);
  ok(ok2000.y.出口.轴冲突 === undefined,
    `无交集的盘不出轴冲突字段(样例盘 调候${ok2000.y.调候.取.join('')} / 扶抑忌${ok2000.y.扶抑.忌.join('')||'无'})`);
}

// ── 汇总 ────────────────────────────────────────────────────────────────────
if (failed === 0) { console.log('\n✅ 全部通过 (边界回归)'); process.exit(0); }
else { console.log(`\n❌ ${failed} 项失败`); process.exit(1); }

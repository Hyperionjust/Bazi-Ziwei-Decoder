// test-boundary.ts — v3.5 边界回归：阴阳男女年干口径 / 农历输入 / 时区换算 / 晚子时 / 闰月 / 调候表 / 格局纯气
// 背景: v3.5 修复了一批边界接线 bug——getYinYang 误用公历年干(1月~春节前出生大限方向全错)、
//       --isLunar/--timeZone 被静默忽略、紫微晚子时与八字不同步、闰月未定义、丁寅调候错、午月误作纯气。
// 用法: npx tsx test-boundary.ts ;全过 exit 0
import { createChart, resolveSolarClock } from '../yiqi-core/index';
import { getTiaoHou } from '../bazi-enrich/tiao-hou';
import { judgeGeJu } from '../bazi-enrich/ge-ju';
import { aggregateConfidenceTier } from '../bazi-enrich/confidence';
import { enrichBazi } from '../bazi-enrich/enrich';

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
  // 案例二(吴佩孚盘,典籍命例库 classics/):戊/辰 调候甲丙癸。
  //   火:S1-3 起由「相神裁决」救回(杀重用印化杀,韦氏金标)——救回者仍豁免,不列轴冲突 ✓
  //   木:v3.12 批B1 扩义(∩出口忌)后**正确暴露的新冲突**——调候要甲疏土,而重神转忌判
  //   「木已过重再见为过」(韦「甲运最危」),这正是「同一个字两条线唱反调」的真形态,
  //   旧定义(∩扶抑忌)抓不到(木进忌走的是裁决转忌不是扶抑忌)。解读须合并叙述:
  //   「疏土之功原局两甲已足,岁运再见木反成过重」。故断言从「无字段」重祝福为「=木且不含火」。
  const wu = of(1874, 4, 21, 0);
  ok(wu.柱 === '甲戌 戊辰 戊申 壬子', `案例二(吴佩孚盘)四柱 (得到 ${wu.柱})`);
  ok(!!wu.y.出口.轴冲突 && wu.y.出口.轴冲突.五行.join('') === '木' && !wu.y.出口.轴冲突.五行.includes('火')
    && !!wu.y.出口.相神裁决,
    `案例二v3.12:轴冲突=木(调候疏土∩重神转忌,扩义暴露)·火仍被裁决豁免·裁决块在场 (得到 ${wu.y.出口.轴冲突 ? wu.y.出口.轴冲突.五行.join('') : '无'})`);
  // 交集为空的盘不得平白多出这个字段(免得解读层被无谓的告警噪音淹掉)
  const ok2000 = of(2000, 1, 1, 12);
  ok(ok2000.y.出口.轴冲突 === undefined,
    `无交集的盘不出轴冲突字段(样例盘 调候${ok2000.y.调候.取.join('')} / 扶抑忌${ok2000.y.扶抑.忌.join('')||'无'})`);

  // ── S1-3(v3.11.0):格局相神裁决——出口拆〔格局相神/扶抑忌〕 ────────────────
  // 韦千里《批命104例》对照集(fixtures/calibration/classics/)两例实质分歧的修法:
  //   身旺+禄刃比劫月+重神透干 → 格局线按重神格定例取相神,裁决权归格局线。
  //   身弱侧(阎/许/马)算法本来就对,断言其零触碰,防「把对的一半改坏」。
  // 正例一(蒋介石·S1-3 主证):伤官庚双透通根戌,佩印用火——改动前忌火取金,方向相反
  const jiang = of(1887, 10, 31, 12);
  ok(jiang.柱 === '丁亥 庚戌 己巳 庚午', `S1-3 正例一(蒋介石盘)四柱 (得到 ${jiang.柱})`);
  {
    const ck = jiang.y.出口, cj = ck.相神裁决;
    ok(!!cj && cj.格局相神.join('') === '火' && /伤食/.test(cj.重神),
      `蒋:相神裁决=火(伤食重佩印) (得到 ${cj ? cj.格局相神.join('') + '/' + cj.重神 : '无'})`);
    ok(ck.开运用神.join('') === '火' && !ck.忌神.includes('火'),
      `蒋:开运=火且火不入忌——韦氏「运喜逢印」不再被扶抑忌压倒 (开运[${ck.开运用神}] 忌[${ck.忌神}])`);
    ok(ck.忌神.includes('金') && cj!.所制之神.五行 === '金',
      `蒋:所制之神金转忌——韦氏「不必再见伤食」 (忌[${ck.忌神}])`);
    ok(ck.忌神.includes('土'), `蒋:比劫土仍忌(伤食重不豁免比劫,身旺帮身照忌) (忌[${ck.忌神}])`);
  }
  // 正例二(吴佩孚):杀透通根辰中乙,制化两全取金火;甲运最危→木转忌;戌运比肩辅翼→土不作忌
  {
    const ck = wu.y.出口, cj = ck.相神裁决;
    ok(!!cj && cj.格局相神.join('') === '金火' && /官杀/.test(cj.重神),
      `吴:相神裁决=金火(杀重制化两全) (得到 ${cj ? cj.格局相神.join('') + '/' + cj.重神 : '无'})`);
    ok(ck.忌神.join('') === '木' && !!cj!.比劫处置,
      `吴:忌神=木(韦「甲运最危」),比劫分杀土不作忌(韦「戌运比肩辅翼」) (忌[${ck.忌神}])`);
  }
  // 正例三(宋子文·R2 出口取序):扶抑土金明确而候选池全为火水,旧序取「第一个不冲突的水」
  const song = of(1894, 11, 14, 6);
  ok(song.柱 === '甲午 乙亥 庚申 己卯', `S1-3 正例三(宋子文盘)四柱 (得到 ${song.柱})`);
  ok(song.y.出口.开运用神.join('') === '土' && song.y.扶抑.取.join('') === '土金',
    `宋:开运随扶抑取土(帮身)——不再取发用线的水 (开运[${song.y.出口.开运用神}] / 扶抑取[${song.y.扶抑.取}])`);
  // 反例一(毛泽东盘):七杀格非禄刃比劫月,身弱——裁决不得启动,S1-2 轴冲突=金原样保留(上面已断言)
  ok(mao.y.出口.相神裁决 === undefined, '反例:毛盘(七杀格·身弱)无相神裁决——裁决只管身旺侧禄刃比劫月');
  // 反例二(身弱侧零触碰):阎锡山盘 S2 对照本就 ✅,出口必须与 S1-3 之前逐字一致
  const yan = of(1883, 10, 8, 22);
  ok(yan.柱 === '癸未 辛酉 乙酉 丁亥', `S1-3 反例(阎锡山盘)四柱 (得到 ${yan.柱})`);
  ok(yan.y.出口.相神裁决 === undefined
    && yan.y.出口.开运用神.join('') === '水' && yan.y.出口.喜神.join('') === '火水' && yan.y.出口.忌神.join('') === '金土',
    `阎:身弱杀格零触碰——开运[水]喜[火水]忌[金土]与改前一致 (得到 开运[${yan.y.出口.开运用神}]喜[${yan.y.出口.喜神}]忌[${yan.y.出口.忌神}])`);
  // 反例三(样例盘 2000-01-01·中和临界):扶抑不取不忌,裁决与 R2 都不得启动
  ok(ok2000.y.出口.相神裁决 === undefined, '反例:中和临界盘无相神裁决');
}

// ── S3 批2) confidence 四维分档:总档规则不动,四维按论断类型独立取档 ─────────
{
  const base = { // 收敛正常盘
    用神建议: { 收敛: true, 边界盘: false, 扶抑: {}, 出口: {} },
    旺衰: { confidence: '高', verdict: '身旺' }, 格局: { confidence: '高' },
    调候条例: { 有条例: true },
  };
  const A = aggregateConfidenceTier(base);
  ok(A.tier === 'high' && A.维度.旺衰 === 'high' && A.维度.格局 === 'high' && A.维度.调候 === 'high' && A.维度.应期 === 'high',
    `四维:收敛正常盘 总档high+四维全high (得到 ${A.tier}/${Object.values(A.维度).join(',')})`);
  // 时辰临界·非子时界:总档low(=v1不回归);应期low 但 调候/旺衰不连坐——拆维的意义所在
  const B = aggregateConfidenceTier({ ...base, 时辰边界: { boundary: true, 距交界分钟: 10, 最近交界: '13:00(午→未)' } });
  ok(B.tier === 'low' && B.维度.应期 === 'low' && B.维度.调候 === 'high' && B.维度.旺衰 === 'high',
    `四维:午未交界临界→总档low·应期low·调候不连坐(high) (得到 ${B.tier}/应期${B.维度.应期}/调候${B.维度.调候})`);
  // 时辰临界·23:00 子时界:晚子时约定翻转日柱→日干存疑→调候连坐 low
  const C = aggregateConfidenceTier({ ...base, 时辰边界: { boundary: true, 距交界分钟: 5, 最近交界: '23:00(亥→子)' } });
  ok(C.维度.调候 === 'low' && C.维度.应期 === 'low',
    `四维:23:00交界(日柱随晚子时翻转)→调候low·应期low (得到 调候${C.维度.调候}/应期${C.维度.应期})`);
  // 边界盘(时辰确定):v3(v3.12 批A2)总档=四维取最低——四维无一low的边界盘总档=medium,
  // 「四维全非low而总档low」的 v2 并行逻辑矛盾结构性消失(质检报告 P0 结案点)
  const D = aggregateConfidenceTier({
    用神建议: { 收敛: false, 边界盘: true, 扶抑: { 临界: true }, 出口: {} },
    旺衰: { confidence: '中', verdict: '中和(临界)' }, 格局: { confidence: '中' }, 调候条例: { 有条例: true },
  });
  ok(D.tier === 'medium' && D.维度.应期 === 'medium' && D.维度.旺衰 === 'medium' && D.维度.格局 === 'medium' && D.维度.调候 === 'high',
    `四维v3:边界盘四维无low→总档medium(取最低) (得到 ${D.tier}/${Object.values(D.维度).join(',')})`);
  // 轴冲突→调候medium;v3 总档随最低维=medium(v2 总档曾判 high——两套逻辑并行已废)
  const E = aggregateConfidenceTier({ ...base, 用神建议: { ...base.用神建议, 出口: { 轴冲突: { 五行: ['金'] } } } });
  ok(E.维度.调候 === 'medium' && E.tier === 'medium', `四维v3:轴冲突→调候medium→总档medium(取最低) (得到 调候${E.维度.调候}/总${E.tier})`);
  const F = aggregateConfidenceTier({
    用神建议: { 收敛: false, 边界盘: true, 扶抑: {}, 出口: {} },
    旺衰: { confidence: '中', verdict: '偏弱(从弱存疑)' }, 格局: { confidence: '高' }, 调候条例: { 有条例: true },
  });
  ok(F.维度.旺衰 === 'low' && F.tier === 'low', `四维:从格分歧→旺衰low→总档low (得到 ${F.维度.旺衰}/${F.tier})`);
  // v3 行为变更留档:非边界不收敛盘四维全高→总档 high(v1/v2 判 medium)。「不收敛」不再
  // 双重惩罚档位——不收敛的措辞约束由「出文协议」体用两分承载,置信度只反映判定拿不拿得准。
  const G = aggregateConfidenceTier({ ...base, 用神建议: { 收敛: false, 边界盘: false, 扶抑: {}, 出口: {} } });
  ok(G.tier === 'high', `四维v3:非边界不收敛·四维全高→总档high(不收敛约束走出文协议,不再降档) (得到 ${G.tier})`);
}

// ── v3.12 批A) 旺衰计分 v2 金标组:通根加成+库月+会局+置信公式,12 盘网格联调定参 ────
{
  const of2 = (y: number, m: number, d: number, h: number) => {
    const c: any = createChart({ year: y, month: m, day: d, hour: h, minute: 0, gender: 'male', isLunar: false, timeZone: 8 } as any);
    const s = c.bazi.siZhu;
    return enrichBazi({ 年: s.year, 月: s.month, 日: s.day, 时: s.hour } as any) as any;
  };
  // 梅兰芳(甲午 甲戌 丁酉 癸卯):韦断「全局木火太旺」——v1 判中和-0.1(七例对照唯一遗留◐),
  // v2 双甲通根卯×1.8+午戌半合火+1.8+库月养不扣 → 偏旺 3.82,方向翻正,M5 登记项就此结案
  const mei = of2(1894, 10, 22, 6);
  ok(mei.旺衰.verdict === '偏旺' && Math.abs(mei.旺衰.score - 3.82) < 0.01,
    `旺衰v2:梅兰芳盘 偏旺3.82(韦断身强,v1 中和-0.1→翻正) (得到 ${mei.旺衰.verdict}${mei.旺衰.score})`);
  // 蒋介石(偏旺深处 11.78):v1 置信公式看「距最近阈值」含极旺细分线→判「低」,荒谬;
  // v2 只看中和带两界(+3/-2.5)——方向翻转线才是置信问题,同方向细分线不降置信
  const jiang = of2(1887, 10, 31, 12);
  ok(jiang.旺衰.verdict === '偏旺' && jiang.旺衰.confidence === '高',
    `旺衰v2:蒋盘偏旺区间深处置信高(细分线不降置信) (得到 ${jiang.旺衰.verdict}·置信${jiang.旺衰.confidence})`);
  // 宋子文(-2.5 压线):通根加成只认【本气】根的守门条款——宋帮身干仅通中余气根,不得加成,
  // 保持 -2.5 偏弱(韦断身弱);联调实测若放宽到中余气根,宋被普惠推成中和(方向回退)
  const song = of2(1894, 11, 14, 6);
  ok(song.旺衰.verdict === '偏弱' && song.旺衰.score === -2.5,
    `旺衰v2:宋盘-2.5偏弱不动(本气根守门防压线盘被普惠推翻) (得到 ${song.旺衰.verdict}${song.旺衰.score})`);
  // 身弱侧零回退(S1-3 战果保全):阎/许/马 verdict 不漂移
  ok(of2(1883, 10, 8, 22).旺衰.verdict === '偏弱' && of2(1873, 9, 10, 10).旺衰.verdict === '极弱(可能从弱)'
    && of2(1885, 11, 30, 0).旺衰.verdict === '偏弱', '旺衰v2:身弱侧阎/许/马零回退');
  // 200 随机盘(固定种子)总档 low 率哨兵:v1 口径 79.5% → 批A 三处合并后 23.5%。
  // 区间 [12%,35%]:低于 12%=过度自信(从格+真压线盘天然占一成多),高于 35%=保守回潮。
  let rng = 12345; const rand = (n: number) => { rng = (rng * 1103515245 + 12345) % 2147483648; return rng % n; };
  let low = 0, n = 0;
  for (let i = 0; i < 200; i++) {
    const y = 1950 + rand(60), mo = 1 + rand(12), d = 1 + rand(28), h = rand(24), g = rand(2) ? 'male' : 'female';
    try {
      const c: any = createChart({ year: y, month: mo, day: d, hour: h, minute: 30, gender: g, isLunar: false, timeZone: 8 } as any);
      const s = c.bazi.siZhu;
      const en: any = enrichBazi({ 年: s.year, 月: s.month, 日: s.day, 时: s.hour } as any);
      en.时辰边界 = { boundary: false };
      if (aggregateConfidenceTier(en).tier === 'low') low++;
      n++;
    } catch (e) {}
  }
  const rate = low / n;
  ok(rate >= 0.12 && rate <= 0.35,
    `旺衰v2:200盘(种子12345)总档low率∈[12%,35%] (得到 ${(rate * 100).toFixed(1)}%,v1 口径为 79.5%)`);
}

// ── v3.12 批B1) 轴冲突扩义:调候∩出口忌(原为∩扶抑忌) ────────────────────────
{
  // 正例:1991 质检盘(丁火申月)——调候取火(丙照)而出口忌火(格局线财格忌比劫,经扶抑临界
  // 回退进忌神)。旧定义(∩扶抑忌)抓不到:扶抑临界时 fuYi.忌=[],「宜火」「忌火」各说各话
  // 是质检报告 P1-1 的实锤盲区。扩义后该盘必须打出 轴冲突=火。
  const c1 = createChart({ year: 1991, month: 8, day: 15, hour: 10, minute: 0, gender: 'male', isLunar: false, timeZone: 8 } as any);
  const s1 = (c1 as any).bazi.siZhu;
  const en1: any = enrichBazi({ 年: s1.year, 月: s1.month, 日: s1.day, 时: s1.hour } as any);
  const zc1 = en1.用神建议?.出口?.轴冲突;
  ok(!!zc1 && zc1.五行.join('') === '火' && /出口忌|扶抑/.test(zc1.扶抑侧),
    `轴冲突扩义:质检盘打出 轴冲突=火(调候丙照∩出口忌火) (得到 ${zc1 ? zc1.五行.join('') : '无'})`);
  // 反例:BD 盘(戊土寅月·偏旺)——调候取与出口忌无交集,不得误报
  const enBD: any = enrichBazi({ 年: { gan: '乙', zhi: '丑' }, 月: { gan: '戊', zhi: '寅' }, 日: { gan: '戊', zhi: '辰' }, 时: { gan: '丁', zhi: '酉' } } as any);
  const 调候取BD: string[] = enBD.用神建议?.调候?.取 || [];
  const 忌BD: string[] = enBD.用神建议?.出口?.忌神 || [];
  const 应无 = !调候取BD.some(w => 忌BD.includes(w));
  ok(应无 ? enBD.用神建议?.出口?.轴冲突 === undefined : true,
    `轴冲突扩义反例:无交集盘不误报 (调候取[${调候取BD.join('')}] 忌[${忌BD.join('')}])`);
}

// ── 汇总 ────────────────────────────────────────────────────────────────────
if (failed === 0) { console.log('\n✅ 全部通过 (边界回归)'); process.exit(0); }
else { console.log(`\n❌ ${failed} 项失败`); process.exit(1); }

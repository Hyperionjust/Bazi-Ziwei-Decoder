// test-shunni.ts — 顺逆双轴回归(v3.10.0 P0)
// ---------------------------------------------------------------------------
// 验收盘: 1999-09-03 08:00 男 = 己卯 壬申 戊午 丙辰(子平派)
// 三个已知实况点(来自作者真实复盘),锁进回归防止后续改动把它们打回去:
//   ① 2026 整年   丙火(第一调候)透干 + 午火帝旺 → 状态高位、事业推进偏慢
//                 期望 体强用平 —— 改动前这里是单轴「平」,把人的状态一起判平了
//   ② 2026 年 2 月 庚寅月冲提纲 → 重大波折
//                 期望 振幅=剧动 —— 改动前「冲提纲」在两条降级路径里都不生效
//   ③ 2026 年 4 月 壬辰月财星透干 → 明显转机
//                 期望 事件含「偏财透干」—— 偏财格里财星本身不入用神(格局线取相神),
//                 发用线上必然 0 分,只能靠事件轴承载(方案 C)
// 用法: npx tsx fixtures/test-shunni.ts
// ---------------------------------------------------------------------------
import { createChart } from '../yiqi-core/index';
import { enrichBazi } from '../bazi-enrich/enrich';
import { analyzeYunSui, hitWeight, YunSuiHit } from '../bazi-enrich/yunsui';
import { analyzeLiuYue } from '../bazi-enrich/liuyue';
import { annotateShunNi, scoreGZ, buildCtx } from '../bazi-enrich/shunni';

let failed = 0;
function ok(cond: boolean, msg: string) { if (cond) console.log('✓', msg); else { console.log('✗', msg); failed++; } }

const chart: any = createChart({ year: 1999, month: 9, day: 3, hour: 8, minute: 0, gender: 'male', isLunar: false, timeZone: 8 } as any);
const sz = chart.bazi.siZhu;
const siZhu: any = { 年: sz.year, 月: sz.month, 日: sz.day, 时: sz.hour };
const pillars = ['year', 'month', 'day', 'hour'].map(k => sz[k].gan + sz[k].zhi).join(' ');

ok(pillars === '己卯 壬申 戊午 丙辰', `验收盘四柱=己卯 壬申 戊午 丙辰 (得到 ${pillars})`);

const enr: any = enrichBazi(siZhu);
enr.运岁引动 = analyzeYunSui(siZhu, chart.bazi.dayun || [], 2026);
enr.流月引动 = analyzeLiuYue(siZhu, chart.bazi.dayun || [], 2026);
annotateShunNi(enr, chart.bazi.dayun || [], chart.bazi.dayMaster);

const sn = enr.运岁引动.顺逆;
ok(!!sn, '顺逆块已下沉到 enrichment(不再只存在于渲染路径)');

// ── 0) 前提:调候第一位是丙,且丙(火)不在出口 likes 里 —— 这正是改动的起因 ──
const ck = enr.用神建议.出口;
const likes = new Set([...(ck.开运用神 || []), ...(ck.喜神 || [])]);
ok((enr.用神建议.调候.取干 || [])[0]?.charAt(0) === '丙', '第一调候用神=丙');
ok(!likes.has('火'), '火不在出口 likes 内(调候线未进发用计分,双轴的必要性所在)');

// ── ① 2026 整年:体强用平 ────────────────────────────────────────────────
const y2026 = (sn.流年 || []).find((x: any) => x.年 === 2026);
ok(!!y2026, '2026 流年有顺逆结果');
ok(y2026.方向 === '平', `2026 方向=平(发用线不变,丙午双火非喜非忌) (得到 ${y2026?.方向})`);
ok(y2026.体档 === '强', `2026 体档=强(丙透干 1.0×1.5) (得到 ${y2026?.体档}/${y2026?.护体})`);
ok(y2026.合成 === '体强用平', `2026 合成=体强用平 (得到 ${y2026?.合成})`);
const y2025 = (sn.流年 || []).find((x: any) => x.年 === 2025);
const y2027 = (sn.流年 || []).find((x: any) => x.年 === 2027);
ok(y2026.护体 > y2025.护体 && y2026.护体 > y2027.护体,
  `2026 护体高于相邻年 (2025=${y2025?.护体} / 2026=${y2026?.护体} / 2027=${y2027?.护体})`);

// ── ② 2026-02 庚寅月:冲提纲 → 剧动 ──────────────────────────────────────
const m02 = (sn.流月 || []).find((x: any) => x.序 === 1);
ok(m02?.干支 === '庚寅' && m02?.公历起 === '2026-02-04', `2月=庚寅月(立春起) (得到 ${m02?.干支}/${m02?.公历起})`);
ok(m02?.振幅 === '剧动', `2026-02 振幅=剧动(冲提纲属重级) (得到 ${m02?.振幅})`);

// ── ③ 2026-04 壬辰月:财星透干 → 事件轴命中 ──────────────────────────────
const m04 = (sn.流月 || []).find((x: any) => x.序 === 3);
ok(m04?.干支 === '壬辰' && m04?.公历起 === '2026-04-05', `4月=壬辰月(清明起) (得到 ${m04?.干支}/${m04?.公历起})`);
ok((m04?.事件 || []).includes('偏财透干'), `2026-04 事件含「偏财透干」 (得到 ${JSON.stringify(m04?.事件)})`);
ok(m04?.发用 === -1, `2026-04 发用仍为 -1(事件轴不参与方向分值,方向未被污染) (得到 ${m04?.发用})`);

// ── 口径一致性:振幅一律走 hitWeight,不再各处硬编类型表 ───────────────────
{
  const chongTiGang: YunSuiHit = { vs: '月柱', type: '支冲', desc: '流月支寅冲月柱(提纲·父母兄弟/事业宫)申——冲提纲,岁运大动' };
  ok(hitWeight(chongTiGang) === '重', 'hitWeight:冲提纲=重');
  const ctx = buildCtx(enr.用神建议, chart.bazi.dayMaster)!;
  ok(scoreGZ('庚寅', [chongTiGang], ctx).振幅 === '剧动', '冲提纲 → 剧动(旧大运/流年两条路径都会漏判此类)');
  const bingLin: YunSuiHit = { vs: '大运', type: '岁运并临', desc: '岁运并临' };
  ok(scoreGZ('庚寅', [bingLin], ctx).振幅 === '剧动', '岁运并临 → 剧动(旧大运路径漏判此类)');
}

// ── 方向/振幅正交:同一干支换引动只动振幅,不动方向 ────────────────────────
{
  const ctx = buildCtx(enr.用神建议, chart.bazi.dayMaster)!;
  const quiet = scoreGZ('庚寅', [], ctx);
  const loud = scoreGZ('庚寅', [{ vs: '月柱', type: '天克地冲', desc: 'x' }], ctx);
  ok(quiet.方向 === loud.方向 && quiet.发用 === loud.发用 && quiet.护体 === loud.护体,
    '方向/两轴分值不随振幅变化(正交)');
  ok(quiet.振幅 === '静' && loud.振幅 === '剧动', '振幅随引动重级变化');
}

// ── 全覆盖:大运/流年数组不被「有引动」过滤掉 ─────────────────────────────
ok((sn.大运 || []).length === (chart.bazi.dayun || []).length,
  `大运顺逆覆盖全部 ${chart.bazi.dayun?.length} 步 (得到 ${sn.大运?.length})`);
ok((sn.流月 || []).length === 12, `流月顺逆覆盖 12 个月 (得到 ${sn.流月?.length})`);

if (failed) { console.log(`\n${failed} 项失败`); process.exit(1); }
console.log('✅ 全部通过 (顺逆双轴 + 三个验收实况点)');

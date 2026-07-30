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
import { analyzeYunSui, hitWeight, gzVsChart, suiVsYun, YunSuiHit } from '../bazi-enrich/yunsui';
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

// ── 方向/振幅正交(S1-1 修订后的口径) ──────────────────────────────────────
// v3.10 的正交化把「破型重级」一并从方向里拿掉了,毛盘回测暴露:1976 岁运并临
// 振幅判剧动、方向仍判顺——把明确的破局年说成顺风。所以正交是有边界的:
//   【中性型】重级(冲提纲/交接)只是动得大 → 仍不动方向,正交成立;
//   【破型】重级(天克地冲/伏吟/岁运并临)是结构性破 → 进发用线 −1,方向该动。
{
  const ctx = buildCtx(enr.用神建议, chart.bazi.dayMaster)!;
  const quiet = scoreGZ('庚寅', [], ctx);
  const 中性 = scoreGZ('庚寅', [{ vs: '月柱', type: '支冲', desc: '流月支寅冲月柱(提纲)申——冲提纲' }], ctx);
  ok(quiet.方向 === 中性.方向 && quiet.发用 === 中性.发用 && quiet.护体 === 中性.护体,
    '中性型重级(冲提纲)不动方向与两轴分值 —— 正交仍成立');
  ok(quiet.振幅 === '静' && 中性.振幅 === '剧动', '振幅随引动重级变化');
}

// ── S1-1:破型重级进方向 ──────────────────────────────────────────────────
{
  const ctx = buildCtx(enr.用神建议, chart.bazi.dayMaster)!;
  const base = scoreGZ('庚寅', [], ctx);
  for (const t of ['天克地冲', '伏吟', '岁运并临']) {
    const s = scoreGZ('庚寅', [{ vs: '大运', type: t, desc: t } as any], ctx);
    ok(s.发用 === base.发用 - 1 && s.破型 === true,
      `${t}(破型) → 发用 ${base.发用} → ${s.发用},并标记 破型`);
  }
  // 只扣一次:两条破型不等于两倍逆
  const 双破 = scoreGZ('庚寅', [{ vs: '大运', type: '伏吟', desc: 'x' }, { vs: '年柱', type: '天克地冲', desc: 'y' }] as any, ctx);
  ok(双破.发用 === base.发用 - 1, `两条破型仍只扣一次 (得到 ${双破.发用})`);
  // 中性型重级不扣
  const 中性 = scoreGZ('庚寅', [{ vs: '月柱', type: '支冲', desc: '冲提纲' }], ctx);
  ok(中性.发用 === base.发用 && !中性.破型, '冲提纲是中性型重级,不进发用线');

  // ★ 工单点名的实况点:毛盘 1893-12-26 08:00 男,1976 丙辰 岁运并临
  //   改动前 振幅=剧动 而 方向=顺(把破局年说成顺风);现在应压到「平」。
  const mao: any = createChart({ year: 1893, month: 12, day: 26, hour: 8, minute: 0, gender: 'male', isLunar: false, timeZone: 8 } as any);
  const mz = mao.bazi.siZhu;
  ok(['year', 'month', 'day', 'hour'].map(k => mz[k].gan + mz[k].zhi).join(' ') === '癸巳 甲子 丁酉 甲辰', '毛盘四柱=癸巳 甲子 丁酉 甲辰');
  const mEnr: any = enrichBazi({ 年: mz.year, 月: mz.month, 日: mz.day, 时: mz.hour } as any);
  mEnr.运岁引动 = analyzeYunSui({ 年: mz.year, 月: mz.month, 日: mz.day, 时: mz.hour } as any, mao.bazi.dayun || [], 1976);
  annotateShunNi(mEnr, mao.bazi.dayun || [], mao.bazi.dayMaster);
  const mCtx = buildCtx(mEnr.用神建议, mao.bazi.dayMaster, mEnr.调候条例)!;
  const d76 = (mao.bazi.dayun || []).find((d: any) => 1976 >= d.startYear && 1976 <= d.endYear);
  const ln76 = (d76?.liuNian || []).find((l: any) => l.year === 1976);
  const h76 = [...gzVsChart({ gan: ln76.ganZhi.gan, zhi: ln76.ganZhi.zhi }, { 年: mz.year, 月: mz.month, 日: mz.day, 时: mz.hour } as any, '流年'),
               ...suiVsYun({ gan: ln76.ganZhi.gan, zhi: ln76.ganZhi.zhi }, { gan: d76.ganZhi.gan, zhi: d76.ganZhi.zhi })];
  const s76 = scoreGZ(ln76.ganZhi.gan + ln76.ganZhi.zhi, h76, mCtx);
  ok(h76.some((h: any) => h.type === '岁运并临'), `1976 确有岁运并临 (得到 ${h76.map((h: any) => h.type).join('/')})`);
  ok(s76.破型 === true && s76.方向 === '平' && s76.振幅 === '剧动',
    `★1976 丙辰:破型进方向 → 方向=平(改动前为「顺」)、振幅=剧动 (得到 ${s76.方向}/${s76.振幅}/发用${s76.发用})`);
}

// ── S1-4:振幅累加分档 ───────────────────────────────────────────────────
// 原口径取最重的一条,任一「中」级引动就算「动」——毛盘 90 个流年里「静」只剩 29%,
// 这根轴基本没有区分力。改累加后毛盘实测 静 29%→38%、动 42%→33%,三档接近均分。
{
  const ctx = buildCtx(enr.用神建议, chart.bazi.dayMaster)!;
  const Z = (hits: any[]) => scoreGZ('庚寅', hits, ctx).振幅;
  const 中 = { vs: '年柱', type: '支冲', desc: '支冲' };
  const 轻 = { vs: '年柱', type: '干合', desc: '干合' };
  ok(Z([]) === '静', '无引动 → 静');
  ok(Z([中]) === '静', '单条中级 → 静(原口径判「动」,正是钝感的来源)');
  ok(Z([中, 中]) === '动', '两条中级 → 动');
  ok(Z([轻, 轻, 轻]) === '静', '三条轻级 → 仍静');
  ok(Z([{ vs: '大运', type: '天克地冲', desc: 'x' }]) === '剧动', '单条重级 → 剧动(与原口径一致,不回归)');
}

// ── 全覆盖:大运/流年数组不被「有引动」过滤掉 ─────────────────────────────
ok((sn.大运 || []).length === (chart.bazi.dayun || []).length,
  `大运顺逆覆盖全部 ${chart.bazi.dayun?.length} 步 (得到 ${sn.大运?.length})`);
ok((sn.流月 || []).length === 12, `流月顺逆覆盖 12 个月 (得到 ${sn.流月?.length})`);

// ═══════════════════════════════════════════════════════════════════════════
// J2(v3.11.0 M2)· 护体线接典籍病忌 —— 顺逆双轴第一次有典籍级依据
// ---------------------------------------------------------------------------
// 改动前的实锤问题:丁日主生巳月,《穷通宝鉴》明写
//   「四月丁火乘旺…但四柱忌见癸水,癸水一见,泄庚、湿甲、伤丁,故以癸为病」
// 而该格调候取【甲庚】,于是癸卯这样的干支——地支卯是木、正对第一调候甲——
// 护体线照样给加分,癸带来的伤害在计分里完全不存在。计分与典籍相悖。
//
// J2 之后:病字【本字】透干 −1.5、坐支本气 −0.8;原局每条「忌」档条例 −0.5(封顶 −1.5)。
// 关键是【只认本字不认五行】:同段书里明说「壬水无碍」,拿五行一刀切会把壬一并误伤。
// ═══════════════════════════════════════════════════════════════════════════
{
  // 合成盘 1980-05-14 12:00 男 = 庚申 辛巳 丁亥 丙午(丁日 / 巳月)
  const c2: any = createChart({ year: 1980, month: 5, day: 14, hour: 12, minute: 0, gender: 'male', isLunar: false, timeZone: 8 } as any);
  const z2 = c2.bazi.siZhu;
  const sz2: any = { 年: z2.year, 月: z2.month, 日: z2.day, 时: z2.hour };
  ok(z2.day.gan === '丁' && z2.month.zhi === '巳', `J2 验收盘为丁日巳月 (得到 ${z2.day.gan}日${z2.month.zhi}月)`);

  const e2: any = enrichBazi(sz2);
  const tl = e2.调候条例;
  ok(tl?.有条例 === true && tl.格 === '丁/巳', `丁/巳 条例已吸收 (${tl?.格})`);
  ok((tl.病 || []).length === 1 && tl.病[0].字 === '癸',
    `丁/巳 登记了典籍明指之病「癸」 (得到 ${JSON.stringify((tl.病 || []).map((b: any) => b.字))})`);
  ok(String(tl.病[0].依据).includes('故以癸为病'),
    `病的依据照录原文「…故以癸为病」 (得到 ${String(tl.病[0].依据).slice(0, 24)}…)`);
  ok((e2.用神建议.调候.取干 || []).join('') === '甲庚',
    `丁/巳 调候取干=甲庚(所以癸年地支带木本会「照样加分」) (得到 ${(e2.用神建议.调候.取干 || []).join('')})`);

  const 有病 = buildCtx(e2.用神建议, '丁', tl)!;          // J2 口径
  const 无病 = buildCtx(e2.用神建议, '丁')!;               // J2 之前的口径(不传条例)
  const H = (gz: string, c: any) => scoreGZ(gz, [], c).护体;

  // ★ 工单点名的那一条:癸透干的年份,护体必须被扣,且要扣到掉档
  ok(H('癸卯', 有病) < H('癸卯', 无病),
    `癸卯:护体被扣 (J2前 ${H('癸卯', 无病)} → J2后 ${H('癸卯', 有病)})`);
  ok(H('癸卯', 无病) > 0 && H('癸卯', 有病) < 0,
    `癸卯:从「加分」翻成「扣分」——典籍病忌真的生效了 (${H('癸卯', 无病)} → ${H('癸卯', 有病)})`);
  ok(scoreGZ('癸卯', [], 无病).体档 === '中' && scoreGZ('癸卯', [], 有病).体档 === '弱',
    `癸卯:体档 中 → 弱`);

  // ★ 只认本字不认五行:壬同为水,但书里明说「壬水无碍」,不得连坐
  ok(H('壬寅', 有病) === H('壬寅', 无病),
    `壬寅:同属水却分文未扣——病按本字判不按五行判 (${H('壬寅', 无病)} → ${H('壬寅', 有病)})`);

  // 坐支:子的本气是癸 → 按 病坐支 −0.8 扣(比透干轻)
  ok(Math.abs((H('甲子', 无病) - H('甲子', 有病)) - 0.8) < 1e-9,
    `甲子:癸只在支中本气,扣 0.8 而非 1.5 (${H('甲子', 无病)} → ${H('甲子', 有病)})`);

  // 与病无关的干支一分不动 —— J2 不是全局降分
  ok(H('庚寅', 有病) === H('庚寅', 无病),
    `庚寅:与病字无涉,护体不变 (${H('庚寅', 有病)})`);

  // ── J2 对主验收盘零副作用 ────────────────────────────────────────────────
  // M2 时戊行未吸收,这里断言的是「未吸收 → 自然无影响」;M3 把戊行吸收了,
  // 断言必须换成真正要保的那件事:**主验收盘那三个实况点的数值不能被 J2 改动**。
  // 办法是同盘跑两遍——带条例 vs 不带条例——逐值比。这比「碰巧没吸收」强得多:
  // 就算以后某批给戊/申加了病或忌档条例,这里会立刻炸,而不是悄悄把实况点改掉。
  ok(enr.调候条例?.有条例 === true && enr.调候条例.格 === '戊/申',
    `主验收盘的格 戊/申 已吸收 (命中 ${enr.调候条例?.命中?.length}/${(enr.调候条例?.命中?.length || 0) + (enr.调候条例?.未命中 || 0)} 条)`);
  {
    const 带 = buildCtx(enr.用神建议, chart.bazi.dayMaster, enr.调候条例)!;
    const 不带 = buildCtx(enr.用神建议, chart.bazi.dayMaster)!;
    const 差 = ['丙午', '乙巳', '丁酉', '庚寅', '壬辰'].filter(gz => scoreGZ(gz, [], 带).护体 !== scoreGZ(gz, [], 不带).护体);
    ok(差.length === 0,
      `J2 未改动主验收盘的护体值(戊/申 无病、无忌档命中) — 若某批给该格加了病/忌档条例,这里会炸而不是悄悄改掉实况点 (差异 ${JSON.stringify(差)})`);
    ok(带.bingGans.length === 0 && 带.jiHits.length === 0,
      `戊/申 既无典籍病字也无忌档命中 (病 ${JSON.stringify(带.bingGans)} / 忌档 ${JSON.stringify(带.jiHits)})`);
  }
}

if (failed) { console.log(`\n${failed} 项失败`); process.exit(1); }
console.log('✅ 全部通过 (顺逆双轴 + 三个验收实况点 + J2 典籍病忌)');

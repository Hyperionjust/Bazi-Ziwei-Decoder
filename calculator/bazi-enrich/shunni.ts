// shunni.ts — 顺逆双轴计分器(v3.10.0 P0) v1
// ---------------------------------------------------------------------------
// 取代 render.ts 内联的单轴顺逆配色。三处结构性问题一并修:
//
//  ① 调候线丢失:原计分 likes = 出口.开运用神 ∪ 出口.喜神,而「出口」是
//     yongshen.ts 的裁决产物——调候五行只有恰好与扶抑/格局有交集时才渗进去,
//     调候自身的 先/次/再 优先级与天干透出信息在计分层完全消失。
//     后果:调候用神当头透干的年份被判「平」。
//     改法:拆两轴,发用线逻辑一字不动,另起护体线专算调候命中。
//
//  ② 方向与振幅混在一个标量里:吉/平/凶 同时承担「好不好」与「动不动」,
//     表达不了「大动且有利」。改为 方向(顺/平/逆) × 振幅(静/动/剧动)。
//
//  ③ 重级降级两处硬编类型表,都没复用 yunsui.hitWeight():
//       hitWeight  重 = 天克地冲 / 伏吟 / 岁运并临 / 支冲含冲提纲
//       大运路径   重 = 天克地冲 / 伏吟                    ← 漏 岁运并临、冲提纲
//       流年路径   重 = 天克地冲 / 伏吟 / 岁运并临          ← 漏 冲提纲
//     本模块一律走 hitWeight(),口径与建议节点白名单从此一致。
//
// 另按【方案 C】加一根「十神事件」标注轴:只标注不计分,方向仍由五行喜忌定。
// 用途:偏财格里财星(水)本身按子平格局法本就不入用神(格局线取的是相神),
//      所以「财星透干」这类机会信号在发用线上必然是 0 分,需要单独一根轴承载。
//
// 幕后台前分离:本模块所有字段名与计分过程均属幕后施工图,
//              不得出现在任何面向用户的文字里(SKILL.md 关键约束 13)。
// ---------------------------------------------------------------------------

import { Tiangan, Dizhi, WuXing, GAN_WUXING, ZHI_WUXING, ZHI_CANG_GAN, getShiShen } from './tables';
import { hitWeight, YunSuiHit } from './yunsui';

// ---- 计分参数(确定性,同盘可复现;改这里即改口径) ----
export const SHUNNI_PARAMS = {
  发用: { 喜: +1, 忌: -1, 说明: '干支两位各按出口喜忌记分(与 v2.3 顺逆配色口径一致,逻辑未动)' },
  护体: {
    序权: [1.0, 0.7, 0.5],          // 调候 先 / 次 / 再
    本干透出: 1.5,                  // 该位天干即调候用神本字
    同五行透出: 1.0,                // 该位天干与调候用神同五行
    地支得气: 0.8,                  // 该位地支本气五行与调候用神同五行(只取本气,不计藏干)
    说明: '调候(穷通宝鉴日干×月支定例)命中加权;仅本气,藏干不计',
  },
  // J2(v3.11.0):护体线第一次有典籍级依据 —— 命中「病/忌」要扣分,不能只加不减。
  //   实锤点:丁/巳 盘,《穷通宝鉴》明写「癸水一见,泄庚、湿甲、伤丁,故以癸为病」,
  //   而改动前癸年只要地支带木(甲是第一调候)照样给护体加分——计分与典籍相悖。
  病忌: {
    病透干: -1.5,     // 典籍明指之病字透干(锚点对齐「本干透出 +1.5」,一加一减对称)
    病坐支: -0.8,     // 该位地支【本气恰为该字】(对齐「地支得气 -」)
    忌档基线: -0.5,   // 原局每命中一条「忌」档条例的常驻扣分
    忌档下限: -1.5,   // 忌档基线的封顶(免得条例多的格被压垮)
    说明: '病字按【本字】判不按五行判——书里说癸为病时明说「壬水无碍」(甲/申),' +
          '拿五行一刀切会把壬也误伤;忌档基线是原局的常驻结构性折损,不随流年变。',
  },
  体档: { 强: 1.5, 中: 0.7, 说明: '锚点:1.5=第一调候本干透出;0.7=第二调候本干等效' },
  方向: { 顺: 1, 逆: -1, 说明: '发用≥+1 顺 / ≤−1 逆 / 其余 平' },
} as const;

export type FangXiang = '顺' | '平' | '逆';
export type ZhenFu = '静' | '动' | '剧动';
export type TiDang = '强' | '中' | '弱';

export interface ShunNi {
  发用: number;
  护体: number;
  方向: FangXiang;
  振幅: ZhenFu;
  体档: TiDang;
  合成: string;      // 二维标签,刻意不给数值(压回标量正是本次要消除的问题)
  事件: string[];    // 十神事件标注,不参与方向分值
}

export interface ShunNiCtx {
  likes: Set<string>;
  dislikes: Set<string>;
  tiaoHouGans: Tiangan[];   // 调候取干,按 先/次/再 顺序
  dayMaster: Tiangan;
  bingGans: Tiangan[];      // J2:本格典籍明指之「病」字(如 丁/巳 的癸)
  jiBaseline: number;       // J2:原局命中「忌」档条例带来的常驻护体折损(≤0)
  jiHits: string[];         // J2:命中的忌档条例名,供审计与解读层追溯
}

/** 从 enrichment.用神建议 构建计分上下文;J2 起还要 enrichment.调候条例 */
export function buildCtx(yongShen: any, dayMaster: string, tiaoLi?: any): ShunNiCtx | null {
  const ck = yongShen?.出口;
  if (!ck) return null;
  const th: Tiangan[] = (yongShen?.调候?.取干 || [])
    .map((s: string) => String(s || '').charAt(0))
    .filter((g: string) => (GAN_WUXING as any)[g]);

  // ── J2:病字与忌档基线 ────────────────────────────────────────────────
  // 未吸收的格 tiaoLi.有条例=false,两者自然为空 → 计分与 v3.10 完全一致(分批吸收期间无副作用)。
  const bingGans: Tiangan[] = ((tiaoLi?.病 || []) as any[])
    .map(b => String(b?.字 || '').charAt(0) as Tiangan)
    .filter(g => (GAN_WUXING as any)[g]);
  const jiHits: string[] = ((tiaoLi?.命中 || []) as any[])
    .filter(h => h?.档 === '忌')
    .map(h => String(h.名 || h.id));
  const P = SHUNNI_PARAMS.病忌;
  const jiBaseline = Math.max(P.忌档下限, jiHits.length * P.忌档基线);

  return {
    likes: new Set([...(ck.开运用神 || []), ...(ck.喜神 || [])]),
    dislikes: new Set(ck.忌神 || []),
    tiaoHouGans: th,
    dayMaster: dayMaster as Tiangan,
    bingGans, jiBaseline, jiHits,
  };
}

function faYong(gan: Tiangan, zhi: Dizhi, ctx: ShunNiCtx): number {
  let s = 0;
  for (const wx of [GAN_WUXING[gan], ZHI_WUXING[zhi]] as WuXing[]) {
    if (ctx.likes.has(wx)) s += SHUNNI_PARAMS.发用.喜;
    else if (ctx.dislikes.has(wx)) s += SHUNNI_PARAMS.发用.忌;
  }
  return s;
}

function huTi(gan: Tiangan, zhi: Dizhi, ctx: ShunNiCtx): number {
  const P = SHUNNI_PARAMS.护体;
  let s = 0;
  ctx.tiaoHouGans.slice(0, 3).forEach((tg, i) => {
    const w = P.序权[i] ?? 0.5;
    const twx = GAN_WUXING[tg];
    if (gan === tg) s += w * P.本干透出;
    else if (GAN_WUXING[gan] === twx) s += w * P.同五行透出;
    if (ZHI_WUXING[zhi] === twx) s += w * P.地支得气;
  });
  // J2:典籍明指之「病」字来了要扣 —— 只认本字,不认五行。
  //   书里说癸为病时往往同段明说「壬水无碍」(甲/申「壬水无碍,且能合丁」),
  //   拿五行一刀切会把壬一并误伤,那就不是典籍的意思了。
  const B = SHUNNI_PARAMS.病忌;
  for (const bg of ctx.bingGans) {
    if (gan === bg) s += B.病透干;
    const benQi = (ZHI_CANG_GAN[zhi] || []).find(c => c.role === '本气');
    if (benQi?.gan === bg) s += B.病坐支;
  }
  // 忌档基线:原局本身命中的「忌」档条例是常驻结构性折损,不随流年变
  s += ctx.jiBaseline;
  return Math.round(s * 100) / 100;
}

/** 十神事件标注(方案 C):只标注,不参与方向分值 */
function shiShenEvents(gan: Tiangan, zhi: Dizhi, dm: Tiangan): string[] {
  const out: string[] = [];
  out.push(`${getShiShen(dm, gan)}透干`);
  const benQi = (ZHI_CANG_GAN[zhi] || []).find(c => c.role === '本气');
  if (benQi) out.push(`${getShiShen(dm, benQi.gan)}坐支`);
  return out;
}

function zhenFu(hits: YunSuiHit[]): ZhenFu {
  let w: '重' | '中' | '轻' = '轻';
  for (const h of hits || []) {
    const hw = hitWeight(h);
    if (hw === '重') { w = '重'; break; }
    if (hw === '中') w = '中';
  }
  return w === '重' ? '剧动' : w === '中' ? '动' : '静';
}

/** 单个干支的双轴评分 */
export function scoreGZ(ganZhi: string, hits: YunSuiHit[], ctx: ShunNiCtx): ShunNi {
  const gan = ganZhi.charAt(0) as Tiangan;
  const zhi = ganZhi.charAt(1) as Dizhi;
  const fy = faYong(gan, zhi, ctx);
  const ht = huTi(gan, zhi, ctx);
  const 方向: FangXiang = fy >= SHUNNI_PARAMS.方向.顺 ? '顺' : fy <= SHUNNI_PARAMS.方向.逆 ? '逆' : '平';
  const 体档: TiDang = ht >= SHUNNI_PARAMS.体档.强 ? '强' : ht >= SHUNNI_PARAMS.体档.中 ? '中' : '弱';
  return {
    发用: fy, 护体: ht, 方向, 振幅: zhenFu(hits), 体档,
    合成: `体${体档}用${方向}`,
    事件: shiShenEvents(gan, zhi, ctx.dayMaster),
  };
}

const 说明 =
  '顺逆双轴=发用线(出口喜忌:干支两位各 +喜/−忌)与护体线(调候命中:先1.0/次0.7/再0.5,' +
  '本干透出×1.5、同五行透干×1.0、地支本气得气×0.8;J2 起再减典籍病忌:病字透干−1.5/坐支本气−0.8(只认本字)、' +
  '原局每条忌档条例−0.5 封顶−1.5)分开计,不合成标量;' +
  '方向(顺/平/逆)只由发用线定、振幅(静/动/剧动)只由引动重级定(统一走 hitWeight),' +
  '「事件」为十神标注(如财星透干),不参与方向分值,供解读层作机会/压力信号。' +
  '——本块为幕后施工图,字段名与计分过程一律不得向用户展示。';

/**
 * 把顺逆写进 enrichment(就地标注 + 全覆盖数组)。
 * 为什么要两处:运岁引动.大运引动/流年 都被上游按「有引动」过滤过,不是全集;
 * 而海报要给每一步大运、每一个流年上色,所以另出 顺逆.大运/流年 全覆盖数组。
 * 两者由同一次 scoreGZ 计算,不存在第二套口径。
 */
export function annotateShunNi(enr: any, dayun: any[], dayMaster: string): void {
  const ctx = buildCtx(enr?.用神建议, dayMaster, enr?.调候条例);
  if (!ctx) return;
  const ys = enr?.运岁引动;
  if (!ys) return;

  // ---- 大运:全部步(不只有引动的那些) ----
  const hitsByStep: Record<number, YunSuiHit[]> = {};
  for (const d of (ys.大运引动 || [])) hitsByStep[d.步] = d.hits || [];
  const 大运: any[] = [];
  (dayun || []).forEach((d: any, i: number) => {
    const gz = `${d.ganZhi.gan}${d.ganZhi.zhi}`;
    const sn = scoreGZ(gz, hitsByStep[i + 1] || [], ctx);
    大运.push({ 步: i + 1, 干支: gz, 起止年: `${d.startYear}-${d.endYear}`, ...sn });
    const inPlace = (ys.大运引动 || []).find((x: any) => x.步 === i + 1);
    if (inPlace) inPlace.顺逆 = sn;
  });

  // ---- 当前大运流年:全部年 ----
  const 流年: any[] = [];
  const cur = (dayun || []).find((d: any) => ys.当前大运流年 && String(ys.当前大运流年.大运 || '').startsWith(`${d.ganZhi.gan}${d.ganZhi.zhi}`));
  if (cur) {
    const hitsByYear: Record<number, YunSuiHit[]> = {};
    for (const y of (ys.当前大运流年.流年 || [])) hitsByYear[y.年] = [...(y.vs原局 || []), ...(y.vs大运 || [])];
    for (const ln of (cur.liuNian || [])) {
      const gz = `${ln.ganZhi.gan}${ln.ganZhi.zhi}`;
      const sn = scoreGZ(gz, hitsByYear[ln.year] || [], ctx);
      流年.push({ 年: ln.year, 干支: gz, ...sn });
      const inPlace = (ys.当前大运流年.流年 || []).find((x: any) => x.年 === ln.year);
      if (inPlace) inPlace.顺逆 = sn;
    }
  }

  // ---- 流月(仅 --currentYear 时存在) ----
  const 流月: any[] = [];
  for (const m of (enr?.流月引动?.月 || [])) {
    const sn = scoreGZ(m.干支, [...(m.vs原局 || []), ...(m.vs大运 || [])], ctx);
    m.顺逆 = sn;
    流月.push({ 序: m.序, 干支: m.干支, 公历起: m.公历起, 公历止: m.公历止, ...sn });
  }

  // J2 的输入摆到台面上:护体为什么被扣,得能一眼追到是哪个病字、哪几条忌档条例
  const 典籍病忌 = (ctx.bingGans.length || ctx.jiHits.length)
    ? {
        病字: ctx.bingGans,
        病扣分: `透干${SHUNNI_PARAMS.病忌.病透干} / 坐支本气${SHUNNI_PARAMS.病忌.病坐支}(只认本字不认五行)`,
        忌档条例: ctx.jiHits,
        忌档基线: ctx.jiBaseline,
        依据: '典籍明指之病(tiaohou.json 条例块的 病 字段)与本盘命中的忌档条例;护体线自此有典籍级依据,不再只加不减',
      }
    : undefined;
  ys.顺逆 = { 说明, 参数: SHUNNI_PARAMS, ...(典籍病忌 ? { 典籍病忌 } : {}), 大运, 流年, ...(流月.length ? { 流月 } : {}) };
}

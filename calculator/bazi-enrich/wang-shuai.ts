// 旺衰判定 v2 — 得令(月令) + 长生修正 + 得地(余三支) + 得势(余三干·通根加成) + 会局
// ---------------------------------------------------------------------------
// v3.12 批A(v2,梅兰芳例结案):v1 把梅盘(甲午 甲戌 丁酉 癸卯,韦千里断「全局木火太旺」)
// 判成 中和 -0.1——两处结构性低估:①透干帮身却不看通根(双甲正印通根卯只各得 +0.7 平权分);
// ②地支会局完全不入分(午戌半合火局正是韦断「火太旺」的实体)。
// v2 四处改法,参数由 12 盘金标网(7 韦例+毛盘+3 随包样例+1991 质检盘)网格联调所得,
// 12/12 全中;任何一处系数改动都必须重跑金标网(见 test-boundary「旺衰v2金标」断言组):
//   1. 得势通根加成 ×1.8 —— 帮身干(比劫/印)在任一地支有【本气】同五行根才加成。
//      只认本气根是宋子文例的教训:中余气也加成会把 -2.5 压线盘普惠推过界(宋误翻中和)。
//   2. 库月胎养不扣 —— 月支藏干含日主同五行(如丁生戌月,戌藏丁)时,长生位胎/养不再 -1
//      (与 v3.5「墓库有根不作衰论」同理,补齐胎养一档)。
//   3. 会局入分 —— 三合/三会/半合/半会 之局五行=日主(全额)或印(七折):半局 +1.8×w,
//      全局 +1.8×1.6×w。复用 detectZhiRelations 检测器,不自造判定。
//   4. 极旺阈 9.5→12 —— 通根与会局加成整体抬高了旺侧分布(蒋 11.78/1988 盘 11.46),
//      不抬阈则普通身旺盘误报「可能从强」;12 由金标网上界(蒋+0.22 余量)定。
// 置信度公式 v2:只看【中和带两界】(+3/-2.5)的距离——方向翻转线才是置信问题;
// 逼近极旺/极弱细分线不再降置信(v1 把偏旺区间深处 8 分的蒋盘判「低」,荒谬),
// 从格之辨的存疑由 verdict「(可能从强/从弱)」字样单独承载(confidence.ts 按此打维度)。
// ---------------------------------------------------------------------------

import { Tiangan, Dizhi, GAN_WUXING, ZHI_CANG_GAN, getShiShen, getChangSheng, ShiShen } from './tables';
import { detectZhiRelations } from './zhi-relations';

type Pillar = '年'|'月'|'日'|'时';

export type WangShuaiVerdict =
  | '极旺(可能从强)'
  | '偏旺'
  | '中和'
  | '偏弱'
  | '极弱(可能从弱)';

export type WangShuaiResult = {
  score: number;
  verdict: WangShuaiVerdict;
  confidence: '高'|'中'|'低';
  breakdown: {
    得令: number;
    长生: number;
    得地: number;
    得势: number;
    会局: number;
    details: string[];
  };
};

// 月令(月支本气)对日干的关系打分
function scoreMonthOrder(dayMaster: Tiangan, monthZhi: Dizhi): {score: number, desc: string} {
  const cangGan = ZHI_CANG_GAN[monthZhi];
  const benqi = cangGan[0].gan;
  const ss = getShiShen(dayMaster, benqi);
  // 余气是否含同行 / 印
  const yuqi = cangGan.slice(1);
  let extra = 0;
  let extraDesc: string[] = [];
  for (const cg of yuqi) {
    const ssY = getShiShen(dayMaster, cg.gan);
    if (ssY === '比肩' || ssY === '劫财') { extra += 1; extraDesc.push(`月余气${cg.gan}比劫+1`); }
    else if (ssY === '正印' || ssY === '偏印') { extra += 0.7; extraDesc.push(`月余气${cg.gan}印+0.7`); }
  }
  let base = 0;
  let baseDesc = '';
  switch (ss) {
    case '比肩': case '劫财':
      base = 5; baseDesc = `月支本气${benqi}=${ss}(建禄/月刃) +5`; break;
    case '正印': case '偏印':
      base = 3; baseDesc = `月支本气${benqi}=${ss} +3`; break;
    case '食神': case '伤官':
      base = -3; baseDesc = `月支本气${benqi}=${ss} -3`; break;
    case '正官': case '七杀':
      base = -4; baseDesc = `月支本气${benqi}=${ss} -4`; break;
    case '偏财': case '正财':
      base = -5; baseDesc = `月支本气${benqi}=${ss} -5`; break;
  }
  return {
    score: base + extra,
    desc: [baseDesc, ...extraDesc].join('; ')
  };
}

// 日干在月支的长生位修正
function scoreChangSheng(dayMaster: Tiangan, monthZhi: Dizhi): {score: number, desc: string} {
  const cs = getChangSheng(dayMaster, monthZhi);
  let s = 0;
  // v2: 月支藏干含日主同五行 → 库中有根(如丁生戌月,戌藏丁)
  const hasSelfRoot = ZHI_CANG_GAN[monthZhi].some(c => GAN_WUXING[c.gan] === GAN_WUXING[dayMaster]);
  let note = '';
  if (cs === '长生' || cs === '帝旺') s = 2;
  else if (cs === '临官' || cs === '冠带') s = 1;
  else if (cs === '沐浴' || cs === '衰') s = 0;
  else if (cs === '病' || cs === '死') s = -1;
  // v3.5 修复:墓库有根不作衰论(原与绝/胎/养同判 -3,且与得地支对库支余气比劫的正分自相矛盾)
  else if (cs === '墓') s = 0;
  else if (cs === '绝') s = -3;
  else { // 胎/养 —— v2:库中有同五行根者不扣(v3.5 墓库同理,补齐胎养档)
    if (hasSelfRoot) { s = 0; note = '·库中有根不扣(v2)'; }
    else s = -1;
  }
  return {score: s, desc: `日主${dayMaster}在月支${monthZhi}为${cs} (${s >= 0 ? '+' : ''}${s})${note}`};
}

// 得地: 年/日/时三支查同行/印的根
function scoreGround(dayMaster: Tiangan, siZhu: Record<Pillar, {gan: Tiangan, zhi: Dizhi}>): {score: number, desc: string[]} {
  const desc: string[] = [];
  let total = 0;
  for (const p of ['年','日','时'] as Pillar[]) {
    const zhi = siZhu[p].zhi;
    const cangGan = ZHI_CANG_GAN[zhi];
    for (const cg of cangGan) {
      const ss = getShiShen(dayMaster, cg.gan);
      if (ss === '比肩' || ss === '劫财') {
        const v = cg.role === '本气' ? 2 : cg.role === '中气' ? 0.8 : 0.5;
        total += v;
        desc.push(`${p}支${zhi}藏${cg.gan}(${ss}, ${cg.role}) +${v}`);
      } else if (ss === '正印' || ss === '偏印') {
        const v = cg.role === '本气' ? 1 : cg.role === '中气' ? 0.5 : 0.3;
        total += v;
        desc.push(`${p}支${zhi}藏${cg.gan}(${ss}, ${cg.role}) +${v}`);
      }
    }
  }
  return {score: total, desc};
}

// 得势: 年/月/时干 —— v2:帮身干(比劫/印)在任一地支有【本气】同五行根 → ×1.8
const STEM_ROOT_FACTOR = 1.8;
function scoreStems(dayMaster: Tiangan, siZhu: Record<Pillar, {gan: Tiangan, zhi: Dizhi}>): {score: number, desc: string[]} {
  const desc: string[] = [];
  let total = 0;
  const zhis = (['年','月','日','时'] as Pillar[]).map(p => siZhu[p].zhi);
  for (const p of ['年','月','时'] as Pillar[]) {
    const gan = siZhu[p].gan;
    const ss = getShiShen(dayMaster, gan);
    let v = 0;
    if (ss === '比肩' || ss === '劫财') v = 1;
    else if (ss === '正印' || ss === '偏印') v = 0.7;
    else if (ss === '食神' || ss === '伤官') v = -0.5;
    else if (ss === '正财' || ss === '偏财') v = -1;
    else if (ss === '正官' || ss === '七杀') v = -1.5;
    let rootNote = '';
    if (v > 0) {
      const rooted = zhis.some(z => GAN_WUXING[ZHI_CANG_GAN[z][0].gan] === GAN_WUXING[gan]);
      if (rooted) { v = +(v * STEM_ROOT_FACTOR).toFixed(2); rootNote = `·通本气根×${STEM_ROOT_FACTOR}`; }
    }
    total += v;
    desc.push(`${p}干${gan}(${ss}) ${v >= 0 ? '+' : ''}${v}${rootNote}`);
  }
  return {score: total, desc};
}

// 会局(v2 新增): 三合/三会/半合/半会 之局五行=日主(全额)或印(七折) → 帮身会局入分
const HUJU_HALF = 1.8;        // 半合/半会
const HUJU_FULL_MULT = 1.6;   // 三合/三会 = HUJU_HALF × 1.6
const SHENG_ME: Record<string, string> = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' };
function scoreHuJu(dayMaster: Tiangan, siZhu: Record<Pillar, {gan: Tiangan, zhi: Dizhi}>): {score: number, desc: string[]} {
  const desc: string[] = [];
  let total = 0;
  const dmWx = GAN_WUXING[dayMaster];
  const yinWx = SHENG_ME[dmWx];
  const rels = detectZhiRelations({ 年: siZhu.年.zhi, 月: siZhu.月.zhi, 日: siZhu.日.zhi, 时: siZhu.时.zhi } as any);
  for (const r of rels) {
    if (r.type !== '三合' && r.type !== '三会' && r.type !== '半合' && r.type !== '半会') continue;
    const m = ((r as any).detail || '').match(/([木火土金水])[局方]/);
    if (!m) continue;
    const wx = m[1];
    if (wx !== dmWx && wx !== yinWx) continue;   // 只计帮身局(同行/印);克泄耗局不在旺衰会局项内扣(避免与得令重复计罚)
    const w = wx === dmWx ? 1 : 0.7;
    const full = r.type === '三合' || r.type === '三会';
    const v = +(HUJU_HALF * (full ? HUJU_FULL_MULT : 1) * w).toFixed(2);
    total += v;
    desc.push(`${r.type}${r.zhi.join('')}(${wx}${wx === dmWx ? '=日主同行' : '=印'}) +${v}`);
  }
  return {score: total, desc};
}

export function judgeWangShuai(siZhu: Record<Pillar, {gan: Tiangan, zhi: Dizhi}>): WangShuaiResult {
  const dm = siZhu.日.gan;
  const monthZhi = siZhu.月.zhi;
  const month = scoreMonthOrder(dm, monthZhi);
  const cs = scoreChangSheng(dm, monthZhi);
  const ground = scoreGround(dm, siZhu);
  const stems = scoreStems(dm, siZhu);
  const huju = scoreHuJu(dm, siZhu);
  const score = +(month.score + cs.score + ground.score + stems.score + huju.score).toFixed(2);

  // 阈值不对称: 月令对负向影响更直接,偏弱区门槛略宽
  // v3.5: 极旺门槛 8→9.5——得令(+5)+帝旺(+2)+一根即达 8,普通偏旺盘曾误报「可能从强」
  // v2(v3.12): 9.5→12——通根/会局加成整体抬高旺侧分布(蒋 11.78),阈值随金标网上界同步抬
  let verdict: WangShuaiVerdict;
  if (score >= 12) verdict = '极旺(可能从强)';
  else if (score >= 3) verdict = '偏旺';
  else if (score > -2.5) verdict = '中和';
  else if (score > -8) verdict = '偏弱';
  else verdict = '极弱(可能从弱)';

  // 置信度 v2: 只看中和带两界(+3/-2.5)——方向翻转线才是置信问题;
  // 逼近极旺/极弱细分线不降置信(同方向内细分),从格存疑由 verdict 字样单独承载
  const dist = Math.min(Math.abs(score - 3), Math.abs(score - (-2.5)));
  let confidence: '高'|'中'|'低';
  if (dist > 2) confidence = '高';
  else if (dist > 0.8) confidence = '中';
  else confidence = '低';

  return {
    score,
    verdict,
    confidence,
    breakdown: {
      得令: +month.score.toFixed(2),
      长生: cs.score,
      得地: +ground.score.toFixed(2),
      得势: +stems.score.toFixed(2),
      会局: +huju.score.toFixed(2),
      details: [month.desc, cs.desc, ...ground.desc, ...stems.desc, ...huju.desc]
    }
  };
}

// yongshen.ts — 用神候选裁决(算法层) v1
// ---------------------------------------------------------------------------
// 治「open 边界盘用神取法不可复现」:扶抑/调候/格局三线各按定例确定性计算,
// 给出共识与收敛/边界标记。LLM 只做转述与白话化,不做现场取舍——
// 与「排盘必须走算法层」铁律一致,把用神纳入算法层管辖。
// ---------------------------------------------------------------------------

import { Tiangan, WuXing, GAN_WUXING } from './tables';
import { WangShuaiResult } from './wang-shuai';
import { GeJuResult } from './ge-ju';

const SHENG: Record<WuXing, WuXing> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }; // 我生
const KE: Record<WuXing, WuXing> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };   // 我克
const inv = (m: Record<WuXing, WuXing>) => Object.fromEntries(Object.entries(m).map(([a, b]) => [b, a])) as Record<WuXing, WuXing>;
const SHENG_WO = inv(SHENG); // 生我(印)
const KE_WO = inv(KE);       // 克我(官杀)

export interface YongShenAdvice {
  扶抑: { 取: WuXing[]; 忌: WuXing[]; 依据: string; 临界: boolean };
  调候: { 取干: string[]; 取: WuXing[]; 依据: string };
  格局: { 格: string; 取: WuXing[]; 依据: string; 置信度: string };
  共识用神: WuXing[];
  收敛: boolean;
  边界盘: boolean;
  出文协议: string;
  // v2.3 单值出口(海报开运格/喜忌格由此确定性生成,LLM 不再取舍)
  出口: {
    开运用神: WuXing[]; 喜神: WuXing[]; 忌神: WuXing[]; 调候提示: string;
    吉方: string[]; 吉色: string[]; 吉数: string[]; divergence: string; 缺补说明: string;
  };
}

const WX_FANG: Record<WuXing, string> = { 木: '东', 火: '南', 土: '中·西南', 金: '西', 水: '北' };
const WX_SE: Record<WuXing, string> = { 木: '青绿', 火: '赤红', 土: '黄褐', 金: '白金', 水: '蓝黑' };
const WX_SHU: Record<WuXing, string> = { 木: '3·8', 火: '2·7', 土: '5·10', 金: '4·9', 水: '1·6' };

// 格局用神定例(顺用生护/逆用制化,子平通则),以对日主的五行关系表达
// 泄=我生(食伤) 耗=我克(财) 制=克我(官杀) 印=生我 比=同我
const GEJU_RULE: Record<string, { rel: Array<'泄'|'耗'|'制'|'印'|'比'>; why: string }> = {
  正官格: { rel: ['耗', '印'], why: '官格顺用:财生官、印护身,忌伤官见官' },
  七杀格: { rel: ['泄', '印'], why: '杀格逆用:食神制杀或印化杀' },
  正财格: { rel: ['泄', '制'], why: '财格顺用:食伤生财、官杀护财,忌比劫夺财' },
  偏财格: { rel: ['泄', '制'], why: '财格顺用:食伤生财、官杀护财,忌比劫夺财' },
  正印格: { rel: ['制', '比'], why: '印格顺用:官杀生印、比劫得印之生,忌财坏印' },
  偏印格: { rel: ['制', '比'], why: '印格顺用:官杀生印,忌财坏印(枭神喜食制处另论)' },
  食神格: { rel: ['耗'], why: '食神格顺用:食神生财,忌偏印夺食' },
  伤官格: { rel: ['印', '耗'], why: '伤官逆用:配印制伤或伤官生财' },
  比肩格: { rel: ['制', '泄'], why: '禄刃比劫:官杀制身、食伤泄秀' },
  劫财格: { rel: ['制', '泄'], why: '禄刃比劫:官杀制身、食伤泄秀' },
  羊刃格: { rel: ['制', '泄'], why: '羊刃逆用:官杀制刃为上,食伤泄秀次之' },
  建禄格: { rel: ['制', '泄'], why: '建禄:官杀制身、食伤泄秀,忌再帮身' },
};

function relToWx(dmWx: WuXing, rel: '泄'|'耗'|'制'|'印'|'比'): WuXing {
  switch (rel) {
    case '泄': return SHENG[dmWx];
    case '耗': return KE[dmWx];
    case '制': return KE_WO[dmWx];
    case '印': return SHENG_WO[dmWx];
    case '比': return dmWx;
  }
}

export function adviseYongShen(dayMaster: Tiangan, ws: WangShuaiResult, tiaoHouGans: string[], geju: GeJuResult, wuxingCount?: Record<string, number>): YongShenAdvice {
  const dmWx = GAN_WUXING[dayMaster];
  const xie = SHENG[dmWx], hao = KE[dmWx], zhi = KE_WO[dmWx], yin = SHENG_WO[dmWx];

  // ---- 扶抑线(按旺衰分) ----
  const linJie = Math.abs(ws.score) <= 2 || ws.verdict === '中和';
  let fuYi: YongShenAdvice['扶抑'];
  if (ws.verdict === '极旺(可能从强)' || ws.verdict === '偏旺' || (!linJie && ws.score > 0)) {
    fuYi = { 取: [xie, hao, zhi], 忌: [yin, dmWx], 依据: `身强(score=${ws.score}):宜泄(${xie})耗(${hao})制(${zhi}),忌印比再帮身`, 临界: linJie };
  } else if (ws.verdict === '极弱(可能从弱)' || ws.verdict === '偏弱' || (!linJie && ws.score < 0)) {
    fuYi = { 取: [yin, dmWx], 忌: [zhi, hao], 依据: `身弱(score=${ws.score}):宜印(${yin})比(${dmWx})生扶,忌官杀财再克耗`, 临界: linJie };
  } else {
    fuYi = { 取: [], 忌: [], 依据: `中和临界(score=${ws.score}):扶抑线不单独取用,随格局与调候`, 临界: true };
  }

  // ---- 调候线(穷通宝鉴定例) ----
  const thGans = (tiaoHouGans || []).map(s => (s || '').charAt(0)).filter(g => (GAN_WUXING as any)[g]);
  const thWx = [...new Set(thGans.map(g => GAN_WUXING[g as Tiangan]))];
  const tiaoHou = { 取干: tiaoHouGans || [], 取: thWx, 依据: `穷通宝鉴120格定例:${dayMaster}日主本月先${(tiaoHouGans || []).join('后')}` };

  // ---- 格局线 ----
  const rule = GEJU_RULE[geju.primary];
  const gjWx = rule ? [...new Set(rule.rel.map(r => relToWx(dmWx, r)))] : [];
  const gejuLine = { 格: geju.primary, 取: gjWx, 依据: rule ? rule.why : `${geju.primary}无定例映射,以格局成败救应论`, 置信度: geju.confidence };

  // ---- 收敛判定 ----
  const sets: WuXing[][] = [fuYi.取, thWx, gjWx].filter(a => a.length > 0);
  let consensus: WuXing[] = sets.length ? [...sets[0]] : [];
  for (const s of sets.slice(1)) consensus = consensus.filter(x => s.includes(x));
  const 收敛 = sets.length >= 2 && consensus.length > 0;
  const 边界盘 = linJie || ws.confidence !== '高' || geju.confidence === '低';

  const 出文协议 = 收敛 && !边界盘
    ? `三线收敛,共识用神=${consensus.join('、')};可径以共识立论,依据合并转述。`
    : `边界盘/三线不收敛——【体用两分,禁止单选】:护体线=调候${thWx.join('、')}(${(tiaoHouGans || []).join('')})${fuYi.取.length ? `与扶抑${fuYi.取.join('、')}` : ''},发用线=格局${gjWx.join('、') || '(依成败救应)'};两线并陈,显式标注「⚖各派分歧」与置信度(旺衰:${ws.confidence}/格局:${geju.confidence}),不得只报其一。`;

  // ---- v2.3 单值出口 ----
  // 开运用神:共识优先;无共识时从调候→格局候选池里优先选不与扶抑忌冲突者(v2.3.1)
  const pool: WuXing[] = [...thWx, ...gjWx];
  const pick = pool.find(w => !fuYi.忌.includes(w));
  const kaiYun: WuXing[] = consensus.length ? consensus : (pick ? [pick] : (pool.length ? [pool[0]] : [dmWx]));
  const xiShen: WuXing[] = gjWx.length ? gjWx : thWx;
  // 忌神:扶抑忌为主,临界回退比劫;任何情况下与开运/喜神做冲突过滤(v2.3.1 修喜忌同现)
  const jiRaw: WuXing[] = fuYi.忌.length ? fuYi.忌 : [dmWx];
  const jiShen: WuXing[] = jiRaw.filter(w => !kaiYun.includes(w) && !xiShen.includes(w));
  const anchors = [...new Set([...kaiYun, ...xiShen])].slice(0, 3);
  const divergence = (边界盘 || !收敛)
    ? `⚖调候线取${thWx.join('、') || '-'}/格局线取${gjWx.join('、') || '-'}·旺衰置信度${ws.confidence}`
    : '';
  // v2.3.1 缺补说明:五行为0的元素与用忌关系的确定性解释(治"缺金为何不补金"困惑)
  let queBu = '';
  if (wuxingCount) {
    const missing = (['木', '火', '土', '金', '水'] as WuXing[]).filter(w => !wuxingCount[w]);
    const parts: string[] = [];
    for (const w of missing) {
      if (kaiYun.includes(w) || xiShen.includes(w)) parts.push(`缺${w}而${w}正是所需——补${w}最对症`);
      else if (jiShen.includes(w)) parts.push(`缺${w}且${w}为忌——缺反成清,无须刻意补`);
      else parts.push(`缺${w}但${w}非本盘用忌关键——「缺啥补啥」不适用,以用神为准`);
    }
    queBu = parts.join(';');
  }
  const 出口 = {
    开运用神: kaiYun, 喜神: xiShen, 忌神: jiShen,
    调候提示: (tiaoHouGans || []).length ? `先${(tiaoHouGans || []).join('后')}` : '-',
    吉方: anchors.map(w => WX_FANG[w]), 吉色: anchors.map(w => WX_SE[w]), 吉数: anchors.map(w => WX_SHU[w]),
    divergence, 缺补说明: queBu,
  };

  return { 扶抑: fuYi, 调候: tiaoHou, 格局: gejuLine, 共识用神: consensus, 收敛, 边界盘, 出文协议, 出口 };
}

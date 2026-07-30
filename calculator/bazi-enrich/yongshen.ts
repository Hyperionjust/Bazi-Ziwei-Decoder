// yongshen.ts — 用神候选裁决(算法层) v1
// ---------------------------------------------------------------------------
// 治「open 边界盘用神取法不可复现」:扶抑/调候/格局三线各按定例确定性计算,
// 给出共识与收敛/边界标记。LLM 只做转述与白话化,不做现场取舍——
// 与「排盘必须走算法层」铁律一致,把用神纳入算法层管辖。
// ---------------------------------------------------------------------------

import { Tiangan, Dizhi, WuXing, GAN_WUXING, ZHI_CANG_GAN, getShiShen, ShiShen } from './tables';
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
    // S1-2:调候所取 ∩ 扶抑所忌。有交集才有此字段——同一个五行在两条线上唱反调,
    //      解读层必须合并成一句讲,不许当两件事各说一遍(那会写出自相矛盾的文案)。
    //      S1-3 起:已被「相神裁决」救回的五行不再列入(冲突已有裁决结论,不再是悬案)。
    轴冲突?: { 五行: WuXing[]; 调候侧: string; 扶抑侧: string; 出文要求: string; 说明: string };
    // S1-3(v3.11.0):「出口」拆〔格局相神/扶抑忌〕。身旺侧禄刃比劫月+重神透干的盘,
    //   格局所需之相神(印)恰在扶抑忌清单里,改动前被一刀切压死——韦千里命例对照
    //   (fixtures/calibration/classics/)的两例实质分歧全是这个形状:蒋介石「妙有火印制伤…
    //   运喜逢印,不必再见伤食」而算法忌火取金(方向相反);吴佩孚「杀重贵乎制化,乏火印化杀
    //   为病」而火被扶抑忌压掉。现在裁决权归格局线,相神救出忌神清单,重神五行转忌,全程可追溯。
    相神裁决?: {
      格局相神: WuXing[]; 重神: string; 改法: string;
      自扶抑忌救回: WuXing[]; 所制之神: { 五行: WuXing; 处置: string };
      比劫处置?: string; 依据: string; 出文要求: string;
    };
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

export function adviseYongShen(dayMaster: Tiangan, ws: WangShuaiResult, tiaoHouGans: string[], geju: GeJuResult, wuxingCount?: Record<string, number>, siZhu?: Record<'年'|'月'|'日'|'时', { gan: Tiangan; zhi: Dizhi }>): YongShenAdvice {
  const dmWx = GAN_WUXING[dayMaster];
  const xie = SHENG[dmWx], hao = KE[dmWx], zhi = KE_WO[dmWx], yin = SHENG_WO[dmWx];

  // ---- 扶抑线(按旺衰分) ----
  const linJie = Math.abs(ws.score) <= 2 || ws.verdict === '中和';
  let fuYi: YongShenAdvice['扶抑'];
  const congQiang = ws.verdict === '极旺(可能从强)';
  const congRuo = ws.verdict === '极弱(可能从弱)';
  const cqNote = congQiang ? `;⚖若作从强格论则反取顺势(用印比${yin}、${dmWx},忌克泄),扶抑与从格为重大分歧,解读须并陈` : '';
  const crNote = congRuo ? ';⚖若作从弱格论则反取顺势(顺财官食伤,忌印比帮身),扶抑与从格为重大分歧,解读须并陈' : '';
  if (congQiang || ws.verdict === '偏旺' || (!linJie && ws.score > 0)) {
    fuYi = { 取: [xie, hao, zhi], 忌: [yin, dmWx], 依据: `身强(score=${ws.score}):宜泄(${xie})耗(${hao})制(${zhi}),忌印比再帮身${cqNote}`, 临界: linJie };
  } else if (congRuo || ws.verdict === '偏弱' || (!linJie && ws.score < 0)) {
    fuYi = { 取: [yin, dmWx], 忌: [zhi, hao], 依据: `身弱(score=${ws.score}):宜印(${yin})比(${dmWx})生扶,忌官杀财再克耗${crNote}`, 临界: linJie };
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

  // ---- S1-3(v3.11.0):格局相神裁决(身旺侧·禄刃比劫月+重神透干) ----
  // 韦千里《批命104例》七例对照集(fixtures/calibration/classics/)定的边界:
  //   身弱侧(阎锡山/许世英/马占山,杀格印化/从格之辨)算法已对,一律不动;
  //   要动的只是身旺侧的裁决权——月令为比劫禄刃时 GEJU_RULE 只取[制,泄],印在扶抑忌里
  //   永远翻不了身,而韦氏在伤官重/杀重的盘上恰恰以印为相神。
  // 重神判据(确定性,同盘可复现):伤食或官杀在年/月/时天干透≥2,或透≥1且月支藏干见同类
  //   ——蒋介石 庚伤官双透+戌藏辛;吴佩孚 甲杀透+辰藏乙。两类皆重取透干多者,并列官杀优先(克身急于泄身)。
  // 重神修正按既有 GEJU_RULE 走,不新造取法:伤食重→伤官格定例[印,耗]之印(佩印制伤,耗财坏印故不取);
  //   官杀重→七杀格定例[泄,印](食伤制杀+印化杀,制化两全)。
  const shenWang = congQiang || ws.verdict === '偏旺' || (!linJie && ws.score > 0);
  const LU_REN = new Set(['比肩格', '劫财格', '建禄格', '羊刃格', '月刃格']);
  let gjEff = gjWx;                                   // 生效的格局线取(裁决后)
  let gejuWhy = rule ? rule.why : `${geju.primary}无定例映射,以格局成败救应论`;
  let caiJue: { 格局相神: WuXing[]; 重神: string; 改法: string; 自扶抑忌救回: WuXing[]; 所制之神: { 五行: WuXing; 处置: string }; 比劫处置?: string; 依据: string; 出文要求: string } | undefined;
  if (shenWang && LU_REN.has(geju.primary) && siZhu) {
    const others: Tiangan[] = [siZhu.年.gan, siZhu.月.gan, siZhu.时.gan];
    const XIE_SS: ShiShen[] = ['食神', '伤官'], KE_SS: ShiShen[] = ['正官', '七杀'];
    const tou = (cats: ShiShen[]) => others.filter(g => cats.includes(getShiShen(dayMaster, g))).length;
    const gen = (cats: ShiShen[]) => (ZHI_CANG_GAN[siZhu.月.zhi] || []).some(c => cats.includes(getShiShen(dayMaster, c.gan)));
    const heavy = (cats: ShiShen[]) => tou(cats) >= 2 || (tou(cats) >= 1 && gen(cats));
    const kind = heavy(XIE_SS) && heavy(KE_SS) ? (tou(XIE_SS) > tou(KE_SS) ? '伤食' : '官杀')
      : heavy(XIE_SS) ? '伤食' : heavy(KE_SS) ? '官杀' : null;
    if (kind === '伤食') {
      gjEff = [yin];
      caiJue = {
        格局相神: [yin],
        重神: `伤食透${tou(XIE_SS)}干${gen(XIE_SS) ? '且通根月令' : ''}(${xie})`,
        改法: '佩印制伤(伤官逆用,印为相神;财坏印故不取耗)',
        自扶抑忌救回: [yin].filter(w => fuYi.忌.includes(w)),
        所制之神: { 五行: xie, 处置: `伤食已重,再见为过——${xie}转入忌神(典籍对照:蒋介石例「运喜逢印,不必再见伤食」)` },
        依据: `S1-3 格局相神裁决:月令${geju.primary}而伤食重,格局线改按伤官格定例取印;身旺扶抑虽忌印,裁决权在格局线(韦千里命例对照集)`,
        出文要求: `【相神与扶抑之忌同为${yin}时,必须写成一件事】:${yin}对本盘是「身旺本不喜印,但伤食太重必须佩印」的取舍结论,行文须点出这层理由;严禁再把${yin}当忌神写,也严禁只说宜${yin}而不说为什么身旺仍取印。`,
      };
    } else if (kind === '官杀') {
      gjEff = [xie, yin];
      caiJue = {
        格局相神: [xie, yin],
        重神: `官杀透${tou(KE_SS)}干${gen(KE_SS) ? '且通根月令' : ''}(${zhi})`,
        改法: '食伤制杀＋印化杀(杀重贵乎制化,制化两全)',
        自扶抑忌救回: [xie, yin].filter(w => fuYi.忌.includes(w)),
        所制之神: { 五行: zhi, 处置: `官杀已重,再见为过——${zhi}转入忌神(典籍对照:吴佩孚例「甲运最危」)` },
        比劫处置: `杀重则比劫分杀为辅,${dmWx}不作忌论(典籍对照:吴佩孚例「戌运比肩辅翼,蔗境安康」)`,
        依据: `S1-3 格局相神裁决:月令${geju.primary}而官杀重,格局线改按七杀格定例取[${xie}、${yin}];身旺扶抑虽忌印,裁决权在格局线(韦千里命例对照集)`,
        出文要求: `【相神与扶抑之忌同为${yin}时,必须写成一件事】:${yin}对本盘是「身旺本不喜印,但杀重必须化」的取舍结论,行文须点出这层理由;严禁再把${yin}当忌神写,也严禁只说宜${yin}而不说为什么身旺仍取印。`,
      };
    }
    if (caiJue) gejuWhy += `;S1-3 相神裁决:${caiJue.重神},${caiJue.改法}`;
  }
  const gejuLine = { 格: geju.primary, 取: gjEff, 依据: gejuWhy, 置信度: geju.confidence };

  // ---- 收敛判定 ----
  const sets: WuXing[][] = [fuYi.取, thWx, gjEff].filter(a => a.length > 0);
  let consensus: WuXing[] = sets.length ? [...sets[0]] : [];
  for (const s of sets.slice(1)) consensus = consensus.filter(x => s.includes(x));
  const 收敛 = sets.length >= 2 && consensus.length > 0;
  const 边界盘 = linJie || ws.confidence !== '高' || geju.confidence === '低' || congQiang || congRuo;

  const 出文协议 = (收敛 && !边界盘
    ? `三线收敛,共识用神=${consensus.join('、')};可径以共识立论,依据合并转述。`
    : `边界盘/三线不收敛——【体用两分,禁止单选】:护体线=调候${thWx.join('、')}(${(tiaoHouGans || []).join('')})${fuYi.取.length ? `与扶抑${fuYi.取.join('、')}` : ''},发用线=格局${gjEff.join('、') || '(依成败救应)'};两线并陈,显式标注「⚖各派分歧」与置信度(旺衰:${ws.confidence}/格局:${geju.confidence}),不得只报其一。`)
    + (caiJue ? `;S1-3:本盘有「相神裁决」块,${caiJue.格局相神.join('、')}的取舍必须按其出文要求合并叙述。` : '');

  // ---- v2.3 单值出口 ----
  // 开运用神取序(S1-3 修订):相神裁决 > 共识 > 池∩扶抑取 > 扶抑取首位(非临界) > 池内不与扶抑忌冲突者 > 池首 > 日主。
  //   旧序「共识 > 池内不冲突者 > 池首」在宋子文例上翻车:扶抑明取土金(帮身)而候选池全是火水,
  //   出口取了「第一个不冲突的水」——护体线与韦氏一致、出口却相左。扶抑非临界时其结论必须能进出口。
  const pool: WuXing[] = [...thWx, ...gjEff];
  const pickA = pool.find(w => fuYi.取.includes(w));
  const pickB = pool.find(w => !fuYi.忌.includes(w));
  const kaiYun: WuXing[] = caiJue ? [...caiJue.格局相神]
    : consensus.length ? consensus
    : pickA ? [pickA]
    : (!linJie && fuYi.取.length) ? [fuYi.取[0]]
    : pickB ? [pickB]
    : (pool.length ? [pool[0]] : [dmWx]);
  const xiShen: WuXing[] = gjEff.length ? gjEff : thWx;
  // 忌神:扶抑忌为主,临界回退比劫;任何情况下与开运/喜神做冲突过滤(v2.3.1 修喜忌同现)
  // S1-3:相神已入开运/喜神,自然被过滤出忌神(拆〔格局相神/扶抑忌〕的实体);
  //      重神五行转忌(再见为过);官杀重时比劫分杀,不作忌论。
  const jiRaw: WuXing[] = fuYi.忌.length ? fuYi.忌 : [dmWx];
  let jiShen: WuXing[] = jiRaw.filter(w => !kaiYun.includes(w) && !xiShen.includes(w));
  if (caiJue) {
    if (caiJue.比劫处置) jiShen = jiShen.filter(w => w !== dmWx);
    const suoZhi = caiJue.所制之神.五行;
    if (!kaiYun.includes(suoZhi) && !xiShen.includes(suoZhi) && !jiShen.includes(suoZhi)) jiShen.push(suoZhi);
  }
  const anchors = [...new Set([...kaiYun, ...xiShen])].slice(0, 3);
  const divergence = ((边界盘 || !收敛)
    ? `⚖调候线取${thWx.join('、') || '-'}/格局线取${gjEff.join('、') || '-'}·旺衰置信度${ws.confidence}`
    : '') + (caiJue ? `${(边界盘 || !收敛) ? '·' : '⚖'}S1-3相神裁决(${caiJue.改法})` : '');
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
  // ---- S1-2(v3.11.0):轴冲突显式标记 ----
  // 公开命例回测暴露(毛泽东盘;吴佩孚盘同现火冲突——多案例见 test-boundary):该盘调候取甲庚而扶抑忌金,于是庚金年【调候说该来、扶抑说别来】。
  //   改动前两轴各说各的、谁也不提对方,解读层只能读成两个独立信号,
  //   写出来就是「今年宜进取」和「今年宜守」并列出现,自相矛盾还看不出为什么。
  //   现在把交集算出来摆在明处,并给解读层一条硬约束:这类五行必须【合并成一句】叙述,
  //   讲清「同一个字在两条线上分别扮演什么」,不许当成两件事各说一遍。
  // S1-3:已被相神裁决救回的五行不再列入轴冲突——冲突已有裁决结论(见 相神裁决.出文要求),不再是悬案
  const 冲突五行 = [...new Set(thWx)].filter(w => fuYi.忌.includes(w) && !(caiJue?.自扶抑忌救回 || []).includes(w));
  const 轴冲突 = 冲突五行.length ? {
    五行: 冲突五行,
    调候侧: `调候取${thWx.join('、')}(${(tiaoHouGans || []).join('')})——${冲突五行.join('、')}是护体所需`,
    扶抑侧: `扶抑忌${fuYi.忌.join('、')}——同一个${冲突五行.join('、')}又是发用所忌`,
    出文要求: `【必须合并叙述,不得两处各说一遍】:${冲突五行.join('、')}在本盘身兼两职——` +
      `调候上它是解寒/解燥的那味药,扶抑上它又加重日主的负担。写成一句「${冲突五行.join('、')}对你是双面的:…」,` +
      `讲清什么情境下它帮你、什么情境下它拖你;严禁在同一篇里既写「宜${冲突五行.join('、')}」又写「忌${冲突五行.join('、')}」而不点破二者是同一件事。`,
    说明: '轴冲突=调候线所取 ∩ 扶抑线所忌。这是确定性事实(两轴各自的结论直接取交集),不是判断。',
  } : undefined;

  const 出口 = {
    开运用神: kaiYun, 喜神: xiShen, 忌神: jiShen,
    调候提示: (tiaoHouGans || []).length ? `先${(tiaoHouGans || []).join('后')}` : '-',
    吉方: anchors.map(w => WX_FANG[w]), 吉色: anchors.map(w => WX_SE[w]), 吉数: anchors.map(w => WX_SHU[w]),
    divergence, 缺补说明: queBu,
    ...(轴冲突 ? { 轴冲突 } : {}),
    ...(caiJue ? { 相神裁决: caiJue } : {}),
  };

  return { 扶抑: fuYi, 调候: tiaoHou, 格局: gejuLine, 共识用神: consensus, 收敛, 边界盘, 出文协议, 出口 };
}

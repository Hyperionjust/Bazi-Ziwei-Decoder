// bawei.ts — 荣格八维能量结构(算法层) v1
// ---------------------------------------------------------------------------
// 十神→八维功能映射(主0.7/次0.3),强度=透干×2+月令本气×1.5+藏干(本气1/中气0.6/余气0.3),
// 日主阴阳微调内外向;按荣格功能栈规则(主导+辅助:内外相反、判断感知相反)推「最像类型」。
// 铁律:这是先天能量结构到 MBTI 语言的映射参考,非测评结果;措辞永远「最像」,不说「你是」。
// ---------------------------------------------------------------------------

import { Tiangan, Dizhi, ZHI_CANG_GAN, GAN_YINYANG, GAN_WUXING, getShiShen, ShiShen } from './tables';

type Pillar = '年'|'月'|'日'|'时';
interface GZ { gan: Tiangan; zhi: Dizhi; }
type Fn = 'Te'|'Ti'|'Fe'|'Fi'|'Se'|'Si'|'Ne'|'Ni';

// 十神→八维映射矩阵(主0.7/次0.3)【用户审定 v2.8】
const MAP: Record<ShiShen, [Fn, Fn]> = {
  比肩: ['Fi', 'Si'], 劫财: ['Te', 'Se'], // 劫财主竞争性资源调度与执行推进(Te),行动冲劲为次象(Se)【用户修订 v3.1.1】
  食神: ['Si', 'Fi'], 伤官: ['Ne', 'Fe'],
  正财: ['Te', 'Si'], 偏财: ['Se', 'Ne'],
  正官: ['Fe', 'Te'], 七杀: ['Te', 'Se'],
  正印: ['Si', 'Ni'], 偏印: ['Ni', 'Ti'],
};
const FN_DESC: Record<Fn, string> = {
  Te: '外向思维·组织执行', Ti: '内向思维·原理推演', Fe: '外向情感·关系和谐', Fi: '内向情感·价值坚守',
  Se: '外向感觉·当下行动', Si: '内向感觉·经验沉淀', Ne: '外向直觉·发散联想', Ni: '内向直觉·收敛洞察',
};
const EXTRAV: Fn[] = ['Te', 'Fe', 'Se', 'Ne'];
const PERCEIVING: Fn[] = ['Se', 'Si', 'Ne', 'Ni'];
// 主导+辅助→类型
const TYPE: Record<string, string> = {
  'Ni+Te': 'INTJ', 'Ni+Fe': 'INFJ', 'Ne+Ti': 'ENTP', 'Ne+Fi': 'ENFP',
  'Si+Te': 'ISTJ', 'Si+Fe': 'ISFJ', 'Se+Ti': 'ESTP', 'Se+Fi': 'ESFP',
  'Te+Ni': 'ENTJ', 'Te+Si': 'ESTJ', 'Fe+Ni': 'ENFJ', 'Fe+Si': 'ESFJ',
  'Ti+Ne': 'INTP', 'Ti+Se': 'ISTP', 'Fi+Ne': 'INFP', 'Fi+Se': 'ISFP',
};

export interface BaWeiResult {
  八维: Array<{ 功能: Fn; 说明: string; 得分: number; 百分比: number }>;
  主导: Fn; 辅助: Fn;
  最像类型: string; 备选类型: string; 备选2: string;
  置信: '高'|'中'|'低';
  依据: string;
  声明: string;
}

// v3 rubric 上下文(全部可选;缺省时 R1-R3 自然为零,v3 退化等同 v2 分数)
export interface BaWeiOptions {
  rubric?: 'v2'|'v3'|'v4';   // 默认 v4;v2/v3 = 旧行为逐位保持(回退开关)
  shenshaHits?: any[];       // 原局神煞命中(算法层),用于 R1/R2
  rare?: any[];              // 罕象块,用于 R2 德秀满盘
  taiYuan?: string;          // 胎元干支,用于 R3
  mingGong?: string;         // 命宫干支,用于 R3
  jiShen?: string[];         // 忌神五行(用神算法层出口),v4 R6 忌神折向用
  wangShuai?: string;        // 旺衰 verdict(wang-shuai 算法层),v4 R7 身弱E轴修正用
}

export function judgeBaWei(siZhu: Record<Pillar, GZ>, gender?: string, opts?: BaWeiOptions): BaWeiResult {
  const rubric = opts?.rubric === 'v2' ? 'v2' : opts?.rubric === 'v3' ? 'v3' : 'v4';
  const dm = siZhu.日.gan;
  const score: Record<Fn, number> = { Te: 0, Ti: 0, Fe: 0, Fi: 0, Se: 0, Si: 0, Ne: 0, Ni: 0 };
  // R6 忌神折向(v4·用户定):官杀为忌=被克身而非掌权——能量导向承压内化,不计外向掌控。
  //   正官(忌)→[Fi,Ni](规范压身→内在标准与忍耐) 七杀(忌)→[Ni,Fi](压力→内心消化寻意义)
  //   仅官杀折向【禁扩】:食伤财印各有喜忌但象义双向,无"被克承受方"的明确单向性,不得类推。
  const JI_REDIRECT: Partial<Record<ShiShen, [Fn, Fn]>> = { 正官: ['Fi', 'Ni'], 七杀: ['Ni', 'Fi'] };
  const jiSet = new Set(opts?.jiShen || []);
  let r6w = 0;
  const pairOf = (ss: ShiShen, gan: Tiangan): [Fn, Fn] => {
    if (rubric === 'v4' && JI_REDIRECT[ss] && jiSet.has(GAN_WUXING[gan])) return JI_REDIRECT[ss]!;
    return MAP[ss];
  };
  const add = (ss: ShiShen, w: number, gan: Tiangan) => {
    const pr = pairOf(ss, gan);
    if (pr !== MAP[ss]) r6w += w;
    score[pr[0]] += w * 0.7; score[pr[1]] += w * 0.3;
  };

  const srcNotes: string[] = [];
  for (const p of ['年', '月', '时'] as Pillar[]) {
    const ss = getShiShen(dm, siZhu[p].gan);
    add(ss, 2, siZhu[p].gan); srcNotes.push(`${p}干${ss}`);
  }
  for (const p of ['年', '月', '日', '时'] as Pillar[]) {
    const cg = ZHI_CANG_GAN[siZhu[p].zhi];
    cg.forEach((c, i) => {
      const ss = getShiShen(dm, c.gan);
      const w = (p === '月' && i === 0) ? 1.5 : (i === 0 ? 1 : i === 1 ? 0.6 : 0.3);
      add(ss, w, c.gan);
    });
  }
  // 日主阴阳微调:阳干+5%外向功能,阴干+5%内向功能
  const isYang = GAN_YINYANG[dm] === '阳';
  for (const f of Object.keys(score) as Fn[]) {
    if (EXTRAV.includes(f) === isYang) score[f] *= 1.05;
  }

  // ================= v3/v4 rubric:R1-R7(可审计,v2 时跳过) =================
  const audit: string[] = [];
  if (rubric === 'v4' && r6w > 0) audit.push(`R6忌神折向:官杀(忌)共${(Math.round(r6w*100)/100)}权重→承压内化(正官→Fi/Ni,七杀→Ni/Fi)`);
  if (rubric !== 'v2') {
    const hits = opts?.shenshaHits || [];
    const hit = (id: string) => hits.find((h: any) => h.id === id && !h.needs_review);
    // v3.2 计数制(用户定):同一神煞按命中柱数给总分——1柱+0.15 / 2柱+0.20 / 3柱+0.30 / 4柱+0.40
    const SCHED = [0, 0.15, 0.20, 0.30, 0.40];
    const cnt = (h: any) => Math.min(Math.max(1, (h.pillars || []).length), 4);
    // R1 驿马→Ne【归维铁律:取"求变求新、对别处可能性心痒"之象,归 Ne;
    //   不取"说走就走"的行动象——行动力已由帝旺/羊刃经比劫 Se/Te 路径体现,再计即双计,禁止改回】
    //   v3.2: 逐柱定额改计数制(原日柱0.30加重并入计数曲线)
    const ym = hit('yima');
    if (ym) {
      const n = cnt(ym), v = SCHED[n];
      score.Ne += v; audit.push(`R1驿马×${n} Ne+${v.toFixed(2)}(求变求新之象归Ne,非Se行动象)`);
    }
    // R2 文气修正→N 族(文气主抽象文思,不预设发散/收敛,Ne/Ni 同加;单维封顶+0.60;待核不计)
    //   v3.2: 每项按计数制给分;德秀满盘罕象额外加分取消(4柱德秀经计数制已达+0.40,再加即双计)
    //   v3.2.1(用户定): 单维封顶默认 0.60;若有任一 R2 神煞四柱全见(×4),封顶提至 0.80
    const R2_IDS: [string, string][] = [['wenchang_guiren', '文昌贵人'], ['xuetang_ciguan', '学堂词馆'], ['dexiu_guiren', '德秀贵人']];
    const r2Cap = R2_IDS.some(([id]) => { const h = hit(id); return !!h && cnt(h) === 4; }) ? 0.80 : 0.60;
    let r2Ne = 0, r2Ni = 0;
    const r2add = (name: string, v: number) => {
      const dNe = Math.min(v, r2Cap - r2Ne), dNi = Math.min(v, r2Cap - r2Ni);
      if (dNe > 0) { score.Ne += dNe; r2Ne += dNe; }
      if (dNi > 0) { score.Ni += dNi; r2Ni += dNi; }
      audit.push(`R2${name} Ne+${Math.max(dNe,0).toFixed(2)}/Ni+${Math.max(dNi,0).toFixed(2)}`);
    };
    for (const [id, nm] of R2_IDS) {
      const h = hit(id);
      if (h) r2add(`${nm}×${cnt(h)}`, SCHED[cnt(h)]);
    }
    // R4 性情类神煞→单维(v3.2 新增,计数制同上):
    //   华盖→Ni(孤高内省、玄思独处之象) 将星→Te(统御决断、掌局之象) 桃花(咸池)→Fe(人际魅力、共情悦人之象)
    //   明确排除【禁止改回】:羊刃/帝旺(比劫本气已入 Te/Se,再计即双计);天乙贵人(得助之际遇象,非性情象);
    //   孤辰寡宿(六亲境遇象,非认知偏好);MODERN 层全部(婚恋应期类,与八维无涉)
    //   v4: 华盖为"内向直觉/独处深想"的标志性符号,分量重于驿马桃花——专用曲线 1柱+0.30/2柱+0.40/3柱+0.50/4柱+0.60(用户定)
    const SCHED_HG = [0, 0.30, 0.40, 0.50, 0.60];
    for (const [id, nm, fn] of [['huagai', '华盖', 'Ni'], ['jiangxing', '将星', 'Te'], ['taohua_xianchi', '桃花', 'Fe']] as [string, string, Fn][]) {
      const h = hit(id);
      if (h) {
        const n = cnt(h), v = (id === 'huagai' && rubric === 'v4') ? SCHED_HG[n] : SCHED[n];
        score[fn] += v; audit.push(`R4${nm}×${n} ${fn}+${v.toFixed(2)}`);
      }
    }
    // R5 格局复合修正(v4·用户定):压制/引导关系本身独立计分,不等于参与十神各算一遍。
    //   仅限透干可确定性检测的经典组合【禁扩至藏干推演】:
    //   伤官佩印(才华被印收束→Ni+0.20,Fi+0.10) 杀印相生(压力经印转化为洞察→Ni+0.20) 食神制杀(以术驭刚的分寸→Ti+0.20)
    if (rubric === 'v4') {
      const tou = new Set<ShiShen>((['年', '月', '时'] as Pillar[]).map(pp => getShiShen(dm, siZhu[pp].gan)));
      const hasYin = tou.has('正印') || tou.has('偏印');
      const combos: [string, boolean, Partial<Record<Fn, number>>][] = [
        ['伤官佩印', tou.has('伤官') && hasYin, { Ni: 0.20, Fi: 0.10 }],
        ['杀印相生', tou.has('七杀') && hasYin, { Ni: 0.20 }],
        ['食神制杀', tou.has('食神') && tou.has('七杀'), { Ti: 0.20 }],
      ];
      for (const [nm, on, bonus] of combos) if (on) {
        const parts: string[] = [];
        for (const [f, v] of Object.entries(bonus) as [Fn, number][]) { score[f] += v; parts.push(`${f}+${v.toFixed(2)}`); }
        audit.push(`R5${nm}(${parts.join(',')})`);
      }
    }
    // R7 身弱E轴负修正(v4·用户定):身弱=整体被外部推着走,外向表达强度全轴打折——
    //   偏弱×0.88 / 极弱×0.80,作用于 Te/Fe/Se/Ne 终值(含各 R 加分后)
    if (rubric === 'v4' && (opts?.wangShuai || '').includes('弱')) {
      const k = (opts!.wangShuai as string).includes('极弱') ? 0.80 : 0.88;
      for (const f of EXTRAV) score[f] *= k;
      audit.push(`R7身弱E轴×${k}(${opts!.wangShuai})`);
    }
    // R3 胎元/命宫低权重虚柱(现行映射表照用,整柱×系数;不新造逻辑,不参与其他模块)
    for (const [gz, coef, nm] of [[opts?.taiYuan, 0.25, '胎元'], [opts?.mingGong, 0.30, '命宫']] as [string|undefined, number, string][]) {
      if (!gz || gz.length !== 2) continue;
      const g = gz[0] as Tiangan, z = gz[1] as Dizhi;
      if (!(GAN_YINYANG as any)[g] || !ZHI_CANG_GAN[z]) continue;
      const diff: Record<Fn, number> = { Te: 0, Ti: 0, Fe: 0, Fi: 0, Se: 0, Si: 0, Ne: 0, Ni: 0 };
      const addD = (ss: ShiShen, w: number) => { const [a, b] = MAP[ss]; diff[a] += w * 0.7; diff[b] += w * 0.3; };
      addD(getShiShen(dm, g), 2);
      ZHI_CANG_GAN[z].forEach((c, i) => addD(getShiShen(dm, c.gan), i === 0 ? 1 : i === 1 ? 0.6 : 0.3));
      const parts: string[] = [];
      for (const f of Object.keys(diff) as Fn[]) if (diff[f] > 0) { score[f] += diff[f] * coef; parts.push(`${f}+${(diff[f] * coef).toFixed(2)}`); }
      audit.push(`R3${nm}${gz}×${coef}(${parts.join(',')})`);
    }
  }

  const total = Object.values(score).reduce((a, b) => a + b, 0) || 1;
  const sorted = (Object.keys(score) as Fn[]).sort((a, b) => score[b] - score[a]);
  const dom = sorted[0];
  const auxPool = sorted.filter(f => EXTRAV.includes(f) !== EXTRAV.includes(dom) && PERCEIVING.includes(f) !== PERCEIVING.includes(dom));
  const aux = auxPool[0];
  const type = TYPE[`${dom}+${aux}`] || 'XXXX';
  // 备选:辅助换成次优 或 主导换次席重推,取分差更小者
  const aux2 = auxPool[1];
  const altA = aux2 ? TYPE[`${dom}+${aux2}`] : '';
  const dom2 = sorted[1];
  const aux2Pool = sorted.filter(f => EXTRAV.includes(f) !== EXTRAV.includes(dom2) && PERCEIVING.includes(f) !== PERCEIVING.includes(dom2));
  const altB = aux2Pool[0] ? TYPE[`${dom2}+${aux2Pool[0]}`] : '';
  const gapDom = score[dom] - score[dom2];
  const gapAux = aux2 ? score[aux] - score[aux2] : 99;
  const 备选类型 = (gapDom < gapAux ? altB : altA) || altA || altB || type;
  // 备选2:另一条替换路径;去重且≠最像/备选1,兜底取第三辅助
  const cand2Pool = [gapDom < gapAux ? altA : altB, auxPool[2] ? TYPE[`${dom}+${auxPool[2]}`] : ''].filter(Boolean);
  const 备选2 = cand2Pool.find(x => x && x !== type && x !== 备选类型) || '—';
  const relGap = Math.min(gapDom, gapAux) / (total / 8);
  const 置信 = relGap >= 0.5 ? '高' : relGap >= 0.2 ? '中' : '低';

  let 置信F: '高'|'中'|'低' = 置信;
  let extra = '';
  if (rubric !== 'v2') {
    const prevR = rubric === 'v4' ? 'v3' : 'v2';
    const prevRes = judgeBaWei(siZhu, gender, { ...(opts || {}), rubric: prevR as any });
    if (prevRes.最像类型 !== type) {
      置信F = 置信 === '高' ? '中' : '低';
      extra = `;⚠${rubric} 新增项导致排序变化(${prevR}=${prevRes.最像类型}→${rubric}=${type}),置信度已降一档,来源:${audit.join('、') || '无'}`;
    }
  }
  const baseYiJu = `主导${dom}(${FN_DESC[dom]})+辅助${aux}(${FN_DESC[aux]});强度源:${srcNotes.join('、')}及各支藏干;日主${dm}(${isYang ? '阳' : '阴'}干)`;
  const v3YiJu = rubric !== 'v2' && audit.length ? `;${rubric}加分:${audit.join('、')}` : '';
  const baseDecl = '先天能量结构到 MBTI 语言的映射参考,非测评结果;实测类型受环境塑造可不同,差异本身可解读。措辞用「最像」,不得说「你是X型」。';
  const v3Decl = rubric === 'v4' ? '本分映射采用 v4 rubric(忌神折向/格局复合/身弱E轴/计数制神煞/虚柱),仍为参考非测评。' : rubric === 'v3' ? '本分映射采用 v3 rubric(计数制神煞修正:驿马归Ne/文气/华盖将星桃花,胎元命宫低权重虚柱),仍为参考非测评。' : '';
  return {
    八维: sorted.map(f => ({ 功能: f, 说明: FN_DESC[f], 得分: Math.round(score[f] * 100) / 100, 百分比: Math.round(score[f] / total * 100) })),
    主导: dom, 辅助: aux,
    最像类型: type, 备选类型, 备选2,
    置信: rubric !== 'v2' ? 置信F : 置信,
    依据: baseYiJu + v3YiJu + extra,
    声明: baseDecl + v3Decl,
  };
}

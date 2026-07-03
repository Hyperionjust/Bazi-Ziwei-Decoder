// interactions.ts — 合冲刑害作用裁决引擎(按流派规则集) v1
// ---------------------------------------------------------------------------
// 架构:检测层(zhi-relations/gan-relations)流派中立;本引擎按 lineages.json 的
// interaction_policy 对已检出关系裁决【生效/减力/被解/被绊/存疑】并给出依据。
// 排盘数据不变,变的只是"作用是否成立"的判定口径——分歧规则在 open 派标注。
// ---------------------------------------------------------------------------

import { Tiangan, Dizhi, GAN_WUXING, ZHI_WUXING, ZHI_CANG_GAN, shengKe } from './tables';
import { detectZhiRelations, ZhiRelation } from './zhi-relations';
import { detectGanRelations, GanRelation } from './gan-relations';

type Pillar = '年'|'月'|'日'|'时';
export interface SiZhu { [k: string]: { gan: Tiangan; zhi: Dizhi }; }

export interface InteractionPolicy {
  id?: string;
  he_jie_chong: boolean;                    // 合可解冲/贪合忘冲(参战支另有合→冲减力或解)
  chong_po_he: 'no'|'yes'|'strong_only';    // 冲可破合(strong_only=冲方当令才破)
  juju_jie_chongxing: boolean;              // 三合三会成局之支不再单独论刑冲
  chongku_wei_kai: boolean;                 // 辰戌/丑未库冲作"开库"论(非单纯凶)
  chuan_weight: 'normal'|'heavy';           // 穿(害)权重
  divergence_notes?: boolean;               // 标注派系分歧(open)
  note?: string;                            // 该派口径一句话
}

export interface AdjudicatedRelation {
  kind: '地支'|'天干';
  type: string;
  members: string[];       // 干或支
  pillars: string[];
  distance: '紧贴'|'隔柱'|'遥隔'|'-';
  status: '生效'|'减力'|'被解'|'被绊'|'合而化'|'合而不化(绊)'|'成局'|'半局'|'虚拱';
  cause: string;           // 判定依据
  divergence?: string;     // 派系分歧(仅 open)
  detail?: string;
}

const PILLAR_IDX: Record<Pillar, number> = { 年: 0, 月: 1, 日: 2, 时: 3 };
const HE_HUA: Record<string, string> = { 甲己: '土', 乙庚: '金', 丙辛: '水', 丁壬: '木', 戊癸: '火' };
const KU_CHONG = new Set(['辰戌', '丑未', '戌辰', '未丑']); // 库冲(朋冲)

function dist(pillars: string[]): AdjudicatedRelation['distance'] {
  if (pillars.length < 2) return '-';
  const idx = pillars.map(p => PILLAR_IDX[p as Pillar]).sort((a, b) => a - b);
  const span = idx[idx.length - 1] - idx[0];
  return span <= 1 ? '紧贴' : span === 2 ? '隔柱' : '遥隔';
}

// 干合化神当令/得气:月支本气(或藏干)五行 == 合化五行,且盘中化神有透干或有根
function heHuaJudge(a: Tiangan, b: Tiangan, siZhu: SiZhu, adjacent: boolean): { hua: boolean; why: string } {
  const key = HE_HUA[a + b] !== undefined ? a + b : b + a;
  const huaWx = HE_HUA[key];
  if (!huaWx) return { hua: false, why: '非五合' };
  if (!adjacent) return { hua: false, why: '二干不紧贴,合意虚,不化' };
  const monthZhi = siZhu['月'].zhi;
  const benQi = ZHI_CANG_GAN[monthZhi][0].gan;
  const dangLing = GAN_WUXING[benQi] === huaWx;
  const cangDeQi = ZHI_CANG_GAN[monthZhi].some(c => GAN_WUXING[c.gan] === huaWx);
  const touGan = (['年', '月', '日', '时'] as Pillar[]).some(p => GAN_WUXING[siZhu[p].gan] === huaWx);
  const youGen = (['年', '月', '日', '时'] as Pillar[]).some(p => ZHI_CANG_GAN[siZhu[p].zhi].some(c => GAN_WUXING[c.gan] === huaWx));
  if (dangLing && (touGan || youGen)) return { hua: true, why: `化神${huaWx}当令(月支${monthZhi}本气)且有引` };
  if (cangDeQi && touGan) return { hua: false, why: `化神${huaWx}得月气而未当令,化意不足(从严不作化论)` };
  return { hua: false, why: `化神${huaWx}失令,合而不化` };
}

export function adjudicateInteractions(
  siZhu: SiZhu,
  policy: InteractionPolicy,
  zhiRels?: ZhiRelation[],
  ganRels?: GanRelation[]
): { policy_note: string; items: AdjudicatedRelation[] } {
  const zr = zhiRels || detectZhiRelations({ 年: siZhu['年'].zhi, 月: siZhu['月'].zhi, 日: siZhu['日'].zhi, 时: siZhu['时'].zhi } as any);
  const gr = ganRels || detectGanRelations({ 年: siZhu['年'].gan, 月: siZhu['月'].gan, 日: siZhu['日'].gan, 时: siZhu['时'].gan } as any);
  const out: AdjudicatedRelation[] = [];
  const div = (s: string) => (policy.divergence_notes ? s : undefined);
  const monthZhi = siZhu['月'].zhi;

  // 成局之支集合(三合/三会全)
  const juZhi = new Set<string>();
  for (const r of zr) if (r.type === '三合' || r.type === '三会') r.zhi.forEach(z => juZhi.add(z));
  // 参与六合/半合的支(用于合解冲)
  const heZhi = new Set<string>();
  for (const r of zr) if (r.type === '六合' || r.type === '半合') r.zhi.forEach(z => heZhi.add(z));
  // 被冲的支(用于冲破合)
  const chongPairs = zr.filter(r => r.type === '六冲');

  // ---- 天干 ----
  for (const r of gr) {
    if (r.type === '天干合') {
      const adjacent = dist(r.pillars) === '紧贴';
      const zheng = (r.detail || '').includes('争合');
      if (zheng) {
        out.push({ kind: '天干', type: '天干合', members: r.gans, pillars: r.pillars, distance: dist(r.pillars),
          status: '合而不化(绊)', cause: '争合(妒合),合力分散,不作化论', detail: r.detail });
        continue;
      }
      const j = heHuaJudge(r.gans[0], r.gans[1], siZhu, adjacent);
      out.push({ kind: '天干', type: '天干合', members: r.gans, pillars: r.pillars, distance: dist(r.pillars),
        status: j.hua ? '合而化' : '合而不化(绊)', cause: j.why,
        divergence: div('化之宽严各派不一:此按「化神当令+有引」从严;滴天髓派论化尤严(真化假化),盲派多不论化只论合绊') });
    } else if (r.type === '天干相克') {
      out.push({ kind: '天干', type: '天干相克', members: r.gans, pillars: r.pillars, distance: dist(r.pillars),
        status: dist(r.pillars) === '紧贴' ? '生效' : '减力',
        cause: dist(r.pillars) === '紧贴' ? '紧贴相克有力' : '隔位相克力减(滴天髓:天战犹自可)' });
    }
  }

  // ---- 地支 ----
  for (const r of zr) {
    const d0 = dist(r.pillars);
    switch (r.type) {
      case '六冲': {
        const [a, b] = r.zhi;
        const isKu = KU_CHONG.has(a + b);
        // 成局解冲
        if (policy.juju_jie_chongxing && (juZhi.has(a) || juZhi.has(b))) {
          out.push({ kind: '地支', type: '六冲', members: r.zhi, pillars: r.pillars, distance: d0,
            status: '被解', cause: `${juZhi.has(a) ? a : b}入三合/三会成局,会局解冲`,
            divergence: div('盲派不概以成局解冲,看局与冲何者力大、冲是否正是做功') });
          break;
        }
        // 合解冲(贪合忘冲)
        const heSideA = policy.he_jie_chong && heZhi.has(a);
        const heSideB = policy.he_jie_chong && heZhi.has(b);
        if (heSideA || heSideB) {
          out.push({ kind: '地支', type: '六冲', members: r.zhi, pillars: r.pillars, distance: d0,
            status: heSideA && heSideB ? '被解' : '减力',
            cause: `${heSideA ? a : ''}${heSideA && heSideB ? '与' : ''}${heSideB ? b : ''}另有合(贪合忘冲)${heSideA && heSideB ? ',两头被绊冲解' : ',冲力减半'}`,
            divergence: div('贪合忘冲为通则;盲派看位置与力量,近合方绊、遥合不绊') });
          break;
        }
        // 库冲
        if (isKu) {
          out.push({ kind: '地支', type: '六冲', members: r.zhi, pillars: r.pillars, distance: d0,
            status: '生效',
            cause: policy.chongku_wei_kai
              ? '库冲(朋冲)作开库论:墓库之物冲出可用,非单纯凶(需旺神引出)'
              : '库冲(朋冲):动摇库中之物,吉凶随格局喜忌定',
            divergence: div('滴天髓「库宜开」/盲派「冲墓为开」视库冲为用;子平格局派以喜忌论,冲动喜用之库则凶') });
          break;
        }
        out.push({ kind: '地支', type: '六冲', members: r.zhi, pillars: r.pillars, distance: d0,
          status: d0 === '遥隔' ? '减力' : '生效',
          cause: d0 === '遥隔' ? '年时遥冲,力减' : `${d0}相冲有力${r.zhi.includes(monthZhi) ? '·冲及提纲(月令),动摇格基' : ''}` });
        break;
      }
      case '六合': case '半合': {
        // 冲破合
        const broken = chongPairs.find(cp => cp.zhi.some(z => r.zhi.includes(z)));
        if (broken && policy.chong_po_he !== 'no') {
          const chongDe = policy.chong_po_he === 'yes' ||
            (policy.chong_po_he === 'strong_only' && broken.zhi.includes(monthZhi));
          if (chongDe) {
            out.push({ kind: '地支', type: r.type, members: r.zhi, pillars: r.pillars, distance: d0,
              status: '被解', cause: `所合之支逢${policy.chong_po_he === 'strong_only' ? '当令之' : ''}冲,合被冲破`, detail: r.detail,
              divergence: div('冲破合与贪合忘冲互为反面,各派以位置/力量裁,此按本派规则集') });
            break;
          }
        }
        out.push({ kind: '地支', type: r.type, members: r.zhi, pillars: r.pillars, distance: d0,
          status: r.type === '半合' ? '半局' : '生效',
          cause: r.type === '半合' ? (r.detail || '半合含旺神,半局有效') : `六合(${d0}),合绊/合近`, detail: r.detail });
        break;
      }
      case '三合': case '三会':
        out.push({ kind: '地支', type: r.type, members: r.zhi, pillars: r.pillars, distance: d0,
          status: '成局',
          cause: `${r.detail}${r.zhi.includes(monthZhi) ? '·得月令,局有力' : '·未得月令,局力待运引'}`, detail: r.detail });
        break;
      case '拱合': case '拱会':
        out.push({ kind: '地支', type: r.type, members: r.zhi, pillars: r.pillars, distance: d0,
          status: '虚拱', cause: `${r.detail};虚神待运岁填实`, detail: r.detail });
        break;
      case '相刑': case '自刑': {
        if (policy.juju_jie_chongxing && r.zhi.some(z => juZhi.has(z))) {
          out.push({ kind: '地支', type: r.type, members: r.zhi, pillars: r.pillars, distance: d0,
            status: '被解', cause: '刑支入三合/三会成局,会局解刑', detail: r.detail });
          break;
        }
        const quan = (r.detail || '').includes('全') || r.type === '自刑' || (r.detail || '').includes('无礼');
        out.push({ kind: '地支', type: r.type, members: r.zhi, pillars: r.pillars, distance: d0,
          status: quan ? '生效' : '减力',
          cause: quan ? `${r.detail || '自刑'}` : `${r.detail},三刑缺一,刑意轻,待运岁凑全`, detail: r.detail });
        break;
      }
      case '六害':
        out.push({ kind: '地支', type: '六害', members: r.zhi, pillars: r.pillars, distance: d0,
          status: '生效',
          cause: policy.chuan_weight === 'heavy'
            ? '穿(害):本派视为重破坏关系(掀翻/损伤宫位六亲)'
            : '六害:损伤所害宫位,力次于冲',
          divergence: div('害之轻重分歧大:子平系视为小煞,盲派/段氏作「穿」为大凶器') });
        break;
      case '相破':
        out.push({ kind: '地支', type: '相破', members: r.zhi, pillars: r.pillars, distance: d0,
          status: '减力', cause: `相破:损而不毁,力最轻${r.detail ? ';' + r.detail : ''}`, detail: r.detail,
          divergence: div('破多数派仅作参考;古法破主损耗暗损') });
        break;
      case '暗合':
        out.push({ kind: '地支', type: '暗合', members: r.zhi, pillars: r.pillars, distance: d0,
          status: '生效', cause: `藏干暗合(${r.detail}):暗中牵系`, detail: r.detail });
        break;
    }
  }

  return { policy_note: policy.note || '', items: out };
}

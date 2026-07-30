// confidence.ts — 全局置信度聚合(P0-C) v3:总档 = 四维取最低(v3.12 批A2,作者拍板)
// ---------------------------------------------------------------------------
// v1(单一 tier)→v2(总档不动+四维分档,v3.11 S3)→v3(本版):总档改为【四维取最低】。
// v2 的遗留矛盾:总档沿用 v1 规则(时辰临界/边界盘→low),与四维两套逻辑并行,
// 出现「四维全非 low 而总档 low」的盘(1991 质检盘实锤)——锚点保守声明名不副实。
// v3 起总档=min(旺衰,格局,调候,应期),结构自洽:存在 low 维 ⇔ 总档 low,
// 锚点保守声明的触发条件因此自动等价于「有某类论断真的拿不准」。
// 配套口径(同批):yongshen.ts 边界盘定义删「旺衰置信=中」触发;wang-shuai.ts 置信
// 公式只看中和带两界。三处合并后 200 随机盘(固定种子)总档 low 率 79.5%→23.5%,
// 韦例 7 盘 6 low→2 low(仅宋压线/许从格,该保守的保守),分布断言锁在 test-boundary。
//
// 四维分档规则(确定性,同盘可复现):
//   旺衰: low=从格分歧 或 旺衰置信'低';medium=旺衰置信'中' 或 扶抑临界;high=其余
//   格局: 直接映射 格局.confidence 低→low / 中→medium / 高→high
//   调候: low=时辰临界且交界为 23:00(晚子时约定翻转日柱→日干存疑→调候格随之存疑);
//         medium=轴冲突存在(调候∩扶抑对冲,须合并叙述) 或 该格条例未吸收;high=其余
//         (非 23:00 的时辰临界只动时柱,日干×月支不变,调候不连坐——这正是拆维的意义)
//   应期: low=时辰临界(起运岁数由出生时刻推得,时柱存疑→大运排布与应期全链存疑);
//         medium=边界盘(喜忌方向摇摆→应期吉凶存疑;年份窗口本身仍可用);high=其余
// ---------------------------------------------------------------------------

export type ConfidenceTier = 'high' | 'medium' | 'low';

export interface ConfidenceDimensions {
  旺衰: ConfidenceTier;
  格局: ConfidenceTier;
  调候: ConfidenceTier;
  应期: ConfidenceTier;
}

export interface ConfidenceResult {
  tier: ConfidenceTier;
  维度: ConfidenceDimensions;
  维度依据: Record<keyof ConfidenceDimensions, string>;
  依据: string[];
  说明: string;
}

const RANK: Record<ConfidenceTier, number> = { low: 0, medium: 1, high: 2 };

export function aggregateConfidenceTier(enrichment: any): ConfidenceResult {
  const ya = enrichment?.用神建议;
  const sb = enrichment?.时辰边界;
  const ws = enrichment?.旺衰;
  const gj = enrichment?.格局;

  // ---- 四维分档 ----
  const congGe = /从强|从弱/.test(ws?.verdict || '');
  let d旺衰: ConfidenceTier, r旺衰: string;
  if (congGe || ws?.confidence === '低') {
    d旺衰 = 'low'; r旺衰 = congGe ? '从格之辨(正格/从格两读,强弱结论本身存疑)' : '旺衰判定置信低(中和带压线)';
  } else if (ws?.confidence === '中' || ya?.扶抑?.临界) {
    d旺衰 = 'medium'; r旺衰 = ya?.扶抑?.临界 ? '旺衰计分临界(强弱倾向可用,程度存疑)' : '旺衰判定置信中';
  } else { d旺衰 = 'high'; r旺衰 = '旺衰判定置信足'; }

  let d格局: ConfidenceTier, r格局: string;
  if (gj?.confidence === '低') { d格局 = 'low'; r格局 = '格局判定置信低(取格模糊/杂气难辨)'; }
  else if (gj?.confidence === '中') { d格局 = 'medium'; r格局 = '格局判定置信中'; }
  else { d格局 = 'high'; r格局 = '格局判定置信足'; }

  const crossZi = sb?.boundary === true && String(sb?.最近交界 || '').startsWith('23:00');
  const 轴冲突 = ya?.出口?.轴冲突;
  const 无条例 = enrichment?.调候条例?.有条例 === false;
  let d调候: ConfidenceTier, r调候: string;
  if (crossZi) {
    d调候 = 'low'; r调候 = '时辰临界在 23:00 交界,晚子时约定将翻转日柱——日干存疑,调候格(日干×月支)随之存疑';
  } else if (轴冲突 || 无条例) {
    d调候 = 'medium'; r调候 = 轴冲突 ? '轴冲突(调候∩扶抑对冲,结论须合并叙述)' : '该格典籍条例未吸收,仅有取干骨架';
  } else { d调候 = 'high'; r调候 = '日干月支确定,调候定例直查'; }

  let d应期: ConfidenceTier, r应期: string;
  if (sb?.boundary === true) {
    d应期 = 'low'; r应期 = '时辰临界——起运岁数由出生时刻推得,时柱存疑则大运排布与应期全链存疑';
  } else if (ya?.边界盘 === true) {
    d应期 = 'medium'; r应期 = '边界盘——喜忌方向摇摆,应期年份窗口可用但吉凶定性存疑';
  } else { d应期 = 'high'; r应期 = '时辰确定且用神方向稳,引动年份与吉凶定性均可用'; }

  const 维度: ConfidenceDimensions = { 旺衰: d旺衰, 格局: d格局, 调候: d调候, 应期: d应期 };
  const 维度依据 = { 旺衰: r旺衰, 格局: r格局, 调候: r调候, 应期: r应期 };

  // ---- 总档 = 四维取最低(v3) ----
  const KEYS = ['旺衰', '格局', '调候', '应期'] as const;
  let tier: ConfidenceTier = 'high';
  for (const k of KEYS) if (RANK[维度[k]] < RANK[tier]) tier = 维度[k];
  const 依据 = KEYS.filter(k => 维度[k] === tier).map(k => `${k}维=${tier}(${维度依据[k]})`);
  if (tier === 'high') { 依据.length = 0; 依据.push('四维置信俱足'); }

  return {
    tier,
    维度,
    维度依据,
    依据,
    说明: '总档=四维{旺衰,格局,调候,应期}取最低(v3.12);low 档时该维所辖预测性论断须多用条件句、应期给区间不给单年、禁用高确定措辞,并在锚点白话声明保守口径(总档 low 时声明一次);其余维度按各自档位定措辞,不连坐(旺衰→性格强弱/精力,格局→层次结构/事业路径,调候→季节体感/寒燥调理,应期→年份窗口),见 bazi-prompt「置信度传播」;此机制字段不得向用户展示。',
  };
}

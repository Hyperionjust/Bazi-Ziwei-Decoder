// confidence.ts — 全局置信度聚合(P0-C) v2:总档 + 四维分档(S3 批2)
// ---------------------------------------------------------------------------
// v1 问题: 单一 confidence_tier 一刀切——时辰临界盘的调候论断(日干×月支,多数时候
// 不受时柱影响)与应期论断(起运推算全链依赖出生时刻)被同一个 low 连坐;反过来
// 边界盘的应期年份窗口(合冲刑害检测与用神无关)也被压成保守口径。
// v2 拆四维{旺衰,格局,调候,应期},各维独立取档,bazi-prompt「置信度传播」按论断
// 类型取对应维度定措辞。总档 tier 聚合规则与 v1 完全一致(向下兼容,勿动)。
//
// 总档聚合规则(确定性,同盘可复现,=v1):
//   low    = 时辰边界.boundary === true          (时辰本身存疑 → 全链存疑)
//          或 用神建议.边界盘 === true            (旺衰临界 / 旺衰或格局低置信 / 从格分歧,
//                                                  见 yongshen.ts 边界盘定义)
//   high   = 非 low,且 用神建议.收敛 === true     (扶抑/调候/格局三线有共识用神)
//   medium = 其余                                  (非边界但三线不收敛)
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

export function aggregateConfidenceTier(enrichment: any): ConfidenceResult {
  const ya = enrichment?.用神建议;
  const sb = enrichment?.时辰边界;
  const ws = enrichment?.旺衰;
  const gj = enrichment?.格局;
  const reasons: string[] = [];

  if (sb?.boundary === true) reasons.push(`时辰临界(距交界${Math.abs(sb.距交界分钟 ?? 0)}分钟,时柱存疑)`);
  if (ya?.边界盘 === true) {
    const sub: string[] = [];
    if (ya?.扶抑?.临界) sub.push('旺衰临界');
    if (ws && ws.confidence !== '高') sub.push(`旺衰置信${ws.confidence}`);
    if (gj && gj.confidence === '低') sub.push('格局置信低');
    if (/从强|从弱/.test(ws?.verdict || '')) sub.push('从格分歧');
    reasons.push(`边界盘(${sub.join('/') || '用神三线判定临界'})`);
  }

  let tier: ConfidenceTier;
  if (reasons.length) tier = 'low';
  else if (ya?.收敛 === true) { tier = 'high'; reasons.push('三线用神收敛且各判定置信足'); }
  else { tier = 'medium'; reasons.push('非边界盘但用神三线不收敛'); }

  // ---- 四维分档(S3 批2) ----
  const congGe = /从强|从弱/.test(ws?.verdict || '');
  let d旺衰: ConfidenceTier, r旺衰: string;
  if (congGe || ws?.confidence === '低') {
    d旺衰 = 'low'; r旺衰 = congGe ? '从格之辨(正格/从格两读,强弱结论本身存疑)' : '旺衰判定置信低';
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

  return {
    tier,
    维度: { 旺衰: d旺衰, 格局: d格局, 调候: d调候, 应期: d应期 },
    维度依据: { 旺衰: r旺衰, 格局: r格局, 调候: r调候, 应期: r应期 },
    依据: reasons,
    说明: '总档 low 时全部预测性章节(事业/财运/婚恋/大运流年)须多用条件句、应期给区间不给单年、禁用高确定措辞,并在锚点白话声明保守口径;四维供按论断类型细分取档(旺衰→性格强弱/精力,格局→层次结构/事业路径,调候→季节体感/寒燥调理,应期→年份窗口),取到的维度低于总档按维度从严、高于总档可按维度放宽单类论断的措辞(锚点声明仍按总档出),见 bazi-prompt「置信度传播」;此机制字段不得向用户展示。',
  };
}

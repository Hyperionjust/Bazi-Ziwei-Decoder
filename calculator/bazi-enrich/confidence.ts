// confidence.ts — 全局置信度聚合(P0-C) v1
// ---------------------------------------------------------------------------
// 问题: 此前只在用神/旺衰原地标「置信度低」,但边界盘的事业/财运/大运章节仍可满口
// 高确定性断语。本模块把既有的 收敛/边界盘/旺衰临界/时辰临界 判定聚合为单一
// confidence_tier(high/medium/low),向下游全部预测性章节传播(见 bazi-prompt
// 「置信度传播」强制节;longform 体检器按此拦高确定断语)。
//
// 聚合规则(确定性,同盘可复现):
//   low    = 时辰边界.boundary === true          (时辰本身存疑 → 全链存疑)
//          或 用神建议.边界盘 === true            (旺衰临界 / 旺衰或格局低置信 / 从格分歧,
//                                                  见 yongshen.ts 边界盘定义)
//   high   = 非 low,且 用神建议.收敛 === true     (扶抑/调候/格局三线有共识用神)
//   medium = 其余                                  (非边界但三线不收敛)
// ---------------------------------------------------------------------------

export type ConfidenceTier = 'high' | 'medium' | 'low';

export interface ConfidenceResult {
  tier: ConfidenceTier;
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

  return {
    tier,
    依据: reasons,
    说明: 'low 档时全部预测性章节(事业/财运/婚恋/大运流年)须多用条件句、应期给区间不给单年、禁用高确定措辞,并在锚点白话声明保守口径(见 bazi-prompt「置信度传播」);此机制字段不得向用户展示。',
  };
}

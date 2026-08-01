// 旺衰 v3 调整层 — F0 v6 冻结公式：重复耗方支群势 + 普通六冲折月令支持
// 证据与参数见 fixtures/calibration/audits/v6.config.json / v6.report.md。

import { Tiangan, Dizhi, ZHI_CANG_GAN, getShiShen, ShiShen } from './tables';
import { AdjudicatedRelation, interactionRelationId } from './interactions';

export type Pillar = '年'|'月'|'日'|'时';
export type OppositionGroup = '泄'|'耗'|'克';

export type WangShuaiAuditItem = {
  id: string;
  bucket: '耗方群势'|'冲根修正';
  raw: number;
  effective: number;
  sourcePillars: Pillar[];
  sourceBranches: Dizhi[];
  relationIds: string[];
  discount: number;
  detail: string;
};

export type WangShuaiV3Adjustments = {
  耗方群势: number;
  冲根修正: number;
  details: string[];
  audit: WangShuaiAuditItem[];
};

const REPEAT_SCALE = 0.4;
const ECHO_SCALE = 1.75;
const ACTIVE_MONTH_CLASH_DISCOUNT = 0.5;
const REDUCED_MONTH_CLASH_DISCOUNT = 0;
const RESIDUAL_PILLARS: Pillar[] = ['年', '日', '时'];
const VISIBLE_STEM_PILLARS: Pillar[] = ['年', '月', '时'];

function round2(value: number): number {
  return +value.toFixed(2);
}

function oppositionGroup(role: ShiShen): OppositionGroup | null {
  if (role === '食神' || role === '伤官') return '泄';
  if (role === '正财' || role === '偏财') return '耗';
  if (role === '正官' || role === '七杀') return '克';
  return null;
}

function layerWeight(role: string): number {
  return role === '本气' ? 2 : role === '中气' ? 0.8 : 0.5;
}

function oppositionWeight(group: OppositionGroup): number {
  return group === '泄' ? 0.5 : group === '耗' ? 1 : 1.5;
}

function scoreOppositionGroups(
  dayMaster: Tiangan,
  siZhu: Record<Pillar, {gan: Tiangan; zhi: Dizhi}>,
): Pick<WangShuaiV3Adjustments, '耗方群势'|'details'|'audit'> {
  const visibleStems = VISIBLE_STEM_PILLARS.map(pillar => ({
    pillar, gan: siZhu[pillar].gan,
    group: oppositionGroup(getShiShen(dayMaster, siZhu[pillar].gan)),
  })).filter((item): item is { pillar: Pillar; gan: Tiangan; group: OppositionGroup } => item.group !== null);
  const visibleGroups = new Set(visibleStems.map(item => item.group));
  const gateText = visibleStems.map(item => `${item.pillar}${item.gan}(${item.group})`).join('/');
  if (!visibleGroups.size) return { 耗方群势: 0, details: [], audit: [] };

  const occurrences = new Map<Dizhi, Pillar[]>();
  for (const pillar of RESIDUAL_PILLARS) {
    const branch = siZhu[pillar].zhi;
    const pillars = occurrences.get(branch) || [];
    pillars.push(pillar);
    occurrences.set(branch, pillars);
  }

  let score = 0;
  const details: string[] = [];
  const audit: WangShuaiAuditItem[] = [];
  for (const [branch, pillars] of occurrences) {
    if (pillars.length < 2) continue;
    const mainGroup = oppositionGroup(getShiShen(dayMaster, ZHI_CANG_GAN[branch][0].gan));
    if (!mainGroup) continue;

    let raw = 0;
    for (let occurrence = 0; occurrence < pillars.length; occurrence++) {
      for (const hidden of ZHI_CANG_GAN[branch]) {
        const group = oppositionGroup(getShiShen(dayMaster, hidden.gan));
        if (group) raw += layerWeight(hidden.role) * oppositionWeight(group);
      }
    }
    const echo = visibleGroups.has(mainGroup);
    const echoText = visibleStems.filter(item => item.group === mainGroup).map(item => `${item.pillar}${item.gan}(${item.group})`).join('/');
    const scale = echo ? ECHO_SCALE : REPEAT_SCALE;
    const effective = -round2(raw * scale);
    score += effective;
    const sourceBranches = pillars.map(() => branch);
    const detail = `耗方群势 ${pillars.map(pillar => `${pillar}${branch}`).join('/')}：门控=${gateText}；${echo ? `同类透干=${echoText}` : '本气无同类透干'}；原始${round2(raw)} × 倍率${scale} = ${effective}`;
    details.push(detail);
    audit.push({
      id: `耗方群势:${pillars.map(pillar => `${pillar}${branch}`).join('-')}`,
      bucket: '耗方群势',
      raw: round2(raw),
      effective,
      sourcePillars: pillars.slice(),
      sourceBranches,
      relationIds: [],
      discount: scale,
      detail,
    });
  }
  return { 耗方群势: round2(score), details, audit };
}

function isStorageClash(relation: AdjudicatedRelation): boolean {
  const pair = new Set(relation.members);
  return (pair.has('辰') && pair.has('戌')) || (pair.has('丑') && pair.has('未'));
}

function relationBranches(relation: AdjudicatedRelation): Dizhi[] {
  return relation.pillars.map((_, index) => relation.members[index] as Dizhi)
    .filter((branch): branch is Dizhi => !!branch);
}

function scoreMonthClashes(
  siZhu: Record<Pillar, {gan: Tiangan; zhi: Dizhi}>,
  monthOrder: number,
  changSheng: number,
  interactions: AdjudicatedRelation[],
): Pick<WangShuaiV3Adjustments, '冲根修正'|'details'|'audit'> {
  const positiveSupport = Math.max(0, monthOrder) + Math.max(0, changSheng);
  const unique = new Map<string, AdjudicatedRelation>();
  for (const relation of interactions || []) {
    if (relation.kind !== '地支' || relation.type !== '六冲') continue;
    const id = interactionRelationId(relation, siZhu);
    if (!unique.has(id)) unique.set(id, relation);
  }

  const eligible = [...unique.entries()]
    .filter(([, relation]) => relation.pillars.includes('月') && !isStorageClash(relation))
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  let usedRate = 0;
  let score = 0;
  const details: string[] = [];
  const audit: WangShuaiAuditItem[] = [];
  for (const [relationId, relation] of eligible) {
    const configuredRate = relation.status === '生效' ? ACTIVE_MONTH_CLASH_DISCOUNT
      : relation.status === '减力' ? REDUCED_MONTH_CLASH_DISCOUNT : 0;
    const appliedRate = Math.max(0, Math.min(configuredRate, 1 - usedRate));
    usedRate += appliedRate;
    const effective = -round2(positiveSupport * appliedRate);
    score += effective;
    const sourcePillars = relation.pillars.filter((pillar): pillar is Pillar =>
      pillar === '年' || pillar === '月' || pillar === '日' || pillar === '时');
    const detail = `冲根修正 ${relationId}（${relation.status}）：月令正向支持${round2(positiveSupport)} × ${round2(appliedRate)} = ${effective}`;
    details.push(detail);
    audit.push({
      id: `冲根修正:${relationId}`,
      bucket: '冲根修正',
      raw: round2(positiveSupport),
      effective,
      sourcePillars,
      sourceBranches: relationBranches(relation),
      relationIds: [relationId],
      discount: round2(appliedRate),
      detail,
    });
  }
  return { 冲根修正: round2(score), details, audit };
}

export function scoreWangShuaiV3Adjustments(
  dayMaster: Tiangan,
  siZhu: Record<Pillar, {gan: Tiangan; zhi: Dizhi}>,
  monthOrder: number,
  changSheng: number,
  interactions: AdjudicatedRelation[],
): WangShuaiV3Adjustments {
  const group = scoreOppositionGroups(dayMaster, siZhu);
  const clash = scoreMonthClashes(siZhu, monthOrder, changSheng, interactions);
  return {
    耗方群势: group.耗方群势,
    冲根修正: clash.冲根修正,
    details: [...group.details, ...clash.details],
    audit: [...group.audit, ...clash.audit],
  };
}

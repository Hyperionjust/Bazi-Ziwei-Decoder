// v3.13 F0 旺衰公式只读审计器。
// 只读典籍命例、source gold、v3.12 快照和预声明配置；不修改生产算法、不写文件、不联网。
// 用法：tsx fixtures/calibration/run-wangshuai-audit.ts [--format=summary|json|snapshot]

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { createChart } from '../../yiqi-core/index';
import { enrichBazi } from '../../bazi-enrich/enrich';
import { AdjudicatedRelation, assertInteractionPolicy, InteractionPolicy } from '../../bazi-enrich/interactions';
import {
  Dizhi, GAN_WUXING, getShiShen, Tiangan, ZHI_CANG_GAN,
} from '../../bazi-enrich/tables';
import { detectZhiRelations } from '../../bazi-enrich/zhi-relations';

type Pillar = '年' | '月' | '日' | '时';
type SiZhu = Record<Pillar, { gan: Tiangan; zhi: Dizhi }>;
type Direction = '强' | '弱' | '中和' | '不适用';
type GuardClass = 'ok' | 'partial' | 'target' | 'cross_axis';

type GoldCase = {
  id: string;
  source_case: string;
  pillars: string;
  axis: '扶抑' | '调候' | '混合';
  direction: Direction;
  evidence: string[];
  interpretation_note?: string;
};

type SnapshotCase = {
  id: string;
  source_case: string;
  guard_class: GuardClass;
  guard_direction: Direction;
  score: number;
  verdict: string;
  confidence: string;
  breakdown: Record<string, unknown>;
};

type Params = {
  linear_scale: number;
  synergy_scale: number;
  active_discount: number;
  reduced_discount: number;
};

type FeatureSet = {
  linear_units: number;
  synergy_units: number;
  repeat_base_units: number;
  same_class_echo_units: number;
  support_by_pillar: Record<Pillar, number>;
  active_support: number;
  reduced_support: number;
  root_support_pillars: Record<Pillar, { support: number; active_count: number; reduced_count: number }>;
  stem_root_bonus_components: Array<{ source_stem_pillar: Pillar; amount: number; root_pillars: Pillar[] }>;
  adjudicated_six_clashes: Array<Record<string, unknown>>;
};

type RecordRow = {
  id: string;
  source_case: string;
  pillars: string;
  gold: { axis: string; direction: Direction; evidence: string[] };
  guard_class: GuardClass;
  guard_direction: Direction;
  baseline: any;
  climate: any;
  outlet: any;
  features: FeatureSet;
};

type Candidate = {
  params: Params;
  parameter_count: number;
  target_hits: number;
  ok_regressions: number;
  partial_opposites: number;
  partial_worsened: number;
  non_target_abs_drift: number;
  causal_failures: string[];
  release_eligible: boolean;
  results: Array<{
    id: string; score: number; verdict: string; direction: Direction; delta: number;
    linear_delta: number; synergy_delta: number; group_delta: number; root_delta: number;
  }>;
};

const here = __dirname;
const auditDir = path.join(here, 'audits');
const goldPath = path.join(here, 'source-gold.v1.json');
const snapshotPath = path.join(here, 'regression', 'v3.12.snapshot.json');
const lineagesPath = path.join(here, '..', '..', 'lineages.json');

function readJson(file: string): any {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function hashFile(file: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function loadAuditConfig(file: string): any {
  const raw = readJson(file);
  if (!raw.extends) return raw;
  const parentPath = path.join(path.dirname(file), raw.extends);
  const parentHash = hashFile(parentPath);
  if (parentHash !== raw.parent_sha256) throw new Error(`审计父配置漂移: ${parentHash} != ${raw.parent_sha256}`);
  const parent = loadAuditConfig(parentPath);
  return {
    ...parent,
    ...raw,
    fixed_formula: { ...parent.fixed_formula, ...raw.fixed_formula },
    grid: { ...parent.grid, ...raw.grid },
    release_gates: { ...parent.release_gates, ...raw.release_gates },
    sensitivity: { ...parent.sensitivity, ...raw.sensitivity },
  };
}

function parseArgs(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) out[match[1]] = match[2];
  }
  return out;
}

function range(min: number, max: number, step: number): number[] {
  const out: number[] = [];
  for (let value = min; value <= max + step / 100; value += step) out.push(+value.toFixed(8));
  return out;
}

function verdict(score: number): string {
  if (score >= 12) return '极旺(可能从强)';
  if (score >= 3) return '偏旺';
  if (score > -2.5) return '中和';
  if (score > -8) return '偏弱';
  return '极弱(可能从弱)';
}

function directionOf(score: number): Direction {
  if (score >= 3) return '强';
  if (score <= -2.5) return '弱';
  return '中和';
}

function sameSide(actual: Direction, expected: Direction): boolean {
  return expected === '不适用' || actual === expected;
}

function opposite(actual: Direction, expected: Direction): boolean {
  return (actual === '强' && expected === '弱') || (actual === '弱' && expected === '强');
}

function pillarsOf(chart: any): SiZhu {
  const source = chart.bazi.siZhu;
  return { 年: source.year, 月: source.month, 日: source.day, 时: source.hour } as SiZhu;
}

function pillarsText(siZhu: SiZhu): string {
  return (['年', '月', '日', '时'] as Pillar[]).map(p => `${siZhu[p].gan}${siZhu[p].zhi}`).join(' ');
}

function roleGroup(role: string): '泄' | '耗' | '克' | null {
  if (role === '食神' || role === '伤官') return '泄';
  if (role === '正财' || role === '偏财') return '耗';
  if (role === '正官' || role === '七杀') return '克';
  return null;
}

function layerWeight(role: string): number {
  return role === '本气' ? 2 : role === '中气' ? 0.8 : 0.5;
}

function oppositionWeight(group: '泄' | '耗' | '克'): number {
  return group === '泄' ? 0.5 : group === '耗' ? 1 : 1.5;
}

function positiveHiddenContribution(dayMaster: Tiangan, zhi: Dizhi): number {
  let total = 0;
  for (const hidden of ZHI_CANG_GAN[zhi]) {
    const role = getShiShen(dayMaster, hidden.gan);
    if (role === '比肩' || role === '劫财') total += layerWeight(hidden.role);
    else if (role === '正印' || role === '偏印') {
      total += hidden.role === '本气' ? 1 : hidden.role === '中气' ? 0.5 : 0.3;
    }
  }
  return total;
}

function monthPositiveContribution(dayMaster: Tiangan, monthZhi: Dizhi, breakdown: any): number {
  const hidden = ZHI_CANG_GAN[monthZhi];
  const mainRole = getShiShen(dayMaster, hidden[0].gan);
  let total = mainRole === '比肩' || mainRole === '劫财' ? 5
    : mainRole === '正印' || mainRole === '偏印' ? 3 : 0;
  for (const item of hidden.slice(1)) {
    const role = getShiShen(dayMaster, item.gan);
    if (role === '比肩' || role === '劫财') total += 1;
    else if (role === '正印' || role === '偏印') total += 0.7;
  }
  total += Math.max(0, Number(breakdown.长生 || 0));
  return total;
}

function hujuSupportByPillar(dayMaster: Tiangan, siZhu: SiZhu): Record<Pillar, number> {
  const out: Record<Pillar, number> = { 年: 0, 月: 0, 日: 0, 时: 0 };
  const dmWuxing = GAN_WUXING[dayMaster];
  const producesMe: Record<string, string> = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' };
  const yinWuxing = producesMe[dmWuxing];
  const rels = detectZhiRelations({ 年: siZhu.年.zhi, 月: siZhu.月.zhi, 日: siZhu.日.zhi, 时: siZhu.时.zhi });
  for (const rel of rels) {
    if (!['三合', '三会', '半合', '半会'].includes(rel.type)) continue;
    const match = (rel.detail || '').match(/([木火土金水])[局方]/);
    if (!match || (match[1] !== dmWuxing && match[1] !== yinWuxing)) continue;
    const weight = match[1] === dmWuxing ? 1 : 0.7;
    const amount = 1.8 * (rel.type === '三合' || rel.type === '三会' ? 1.6 : 1) * weight;
    const share = amount / rel.pillars.length;
    for (const pillar of rel.pillars) out[pillar as Pillar] += share;
  }
  return out;
}

function stemRootBonusByPillar(dayMaster: Tiangan, siZhu: SiZhu): Record<Pillar, number> {
  const out: Record<Pillar, number> = { 年: 0, 月: 0, 日: 0, 时: 0 };
  for (const stemPillar of ['年', '月', '时'] as Pillar[]) {
    const stem = siZhu[stemPillar].gan;
    const role = getShiShen(dayMaster, stem);
    const base = role === '比肩' || role === '劫财' ? 1 : role === '正印' || role === '偏印' ? 0.7 : 0;
    if (!base) continue;
    const roots = (['年', '月', '日', '时'] as Pillar[]).filter(p =>
      GAN_WUXING[ZHI_CANG_GAN[siZhu[p].zhi][0].gan] === GAN_WUXING[stem]);
    if (!roots.length) continue;
    const share = (base * (1.8 - 1)) / roots.length;
    for (const root of roots) out[root] += share;
  }
  return out;
}

function stemRootBonusComponents(dayMaster: Tiangan, siZhu: SiZhu): FeatureSet['stem_root_bonus_components'] {
  const out: FeatureSet['stem_root_bonus_components'] = [];
  for (const stemPillar of ['年', '月', '时'] as Pillar[]) {
    const stem = siZhu[stemPillar].gan;
    const role = getShiShen(dayMaster, stem);
    const base = role === '比肩' || role === '劫财' ? 1 : role === '正印' || role === '偏印' ? 0.7 : 0;
    if (!base) continue;
    const roots = (['年', '月', '日', '时'] as Pillar[]).filter(p =>
      GAN_WUXING[ZHI_CANG_GAN[siZhu[p].zhi][0].gan] === GAN_WUXING[stem]);
    if (roots.length) out.push({ source_stem_pillar: stemPillar, amount: +(base * 0.8).toFixed(4), root_pillars: roots });
  }
  return out;
}

function features(siZhu: SiZhu, enrichment: any, interactions: AdjudicatedRelation[], formulaRevision: string): FeatureSet {
  const dayMaster = siZhu.日.gan;
  let linearUnitsV1 = 0;
  for (const pillar of ['年', '日', '时'] as Pillar[]) {
    for (const hidden of ZHI_CANG_GAN[siZhu[pillar].zhi]) {
      const group = roleGroup(getShiShen(dayMaster, hidden.gan));
      if (group) linearUnitsV1 += layerWeight(hidden.role) * oppositionWeight(group);
    }
  }

  const branchGroups = (['年', '月', '日', '时'] as Pillar[])
    .map(p => roleGroup(getShiShen(dayMaster, ZHI_CANG_GAN[siZhu[p].zhi][0].gan)))
    .filter((v): v is '泄' | '耗' | '克' => !!v);
  const stemGroups = new Set((['年', '月', '时'] as Pillar[])
    .map(p => roleGroup(getShiShen(dayMaster, siZhu[p].gan)))
    .filter((v): v is '泄' | '耗' | '克' => !!v));
  const branchGroupSet = new Set(branchGroups);
  const hasEcho = [...branchGroupSet].some(group => stemGroups.has(group));
  const synergyUnitsV1 = Math.max(0, branchGroups.length - 1) + (branchGroups.length >= 2 && hasEcho ? 0.5 : 0);

  // v2 明示修订（v1 结果留档后新增）：群势只看余三支；同类本气至少两支，且克泄耗侧至少一干透出。
  // 线性贡献也只取触发群势的支，避免把每个孤立耗方支普遍重复扣分。
  const residual = (['年', '日', '时'] as Pillar[]).map(pillar => ({
    pillar,
    group: roleGroup(getShiShen(dayMaster, ZHI_CANG_GAN[siZhu[pillar].zhi][0].gan)),
  }));
  const counts: Record<'泄' | '耗' | '克', number> = { 泄: 0, 耗: 0, 克: 0 };
  for (const item of residual) if (item.group) counts[item.group]++;
  const hasOpposingStem = stemGroups.size > 0;
  const eligibleGroups = new Set((['泄', '耗', '克'] as const).filter(group => counts[group] >= 2 && hasOpposingStem));
  let linearUnitsV2 = 0;
  for (const item of residual) {
    if (!item.group || !eligibleGroups.has(item.group)) continue;
    for (const hidden of ZHI_CANG_GAN[siZhu[item.pillar].zhi]) {
      const hiddenGroup = roleGroup(getShiShen(dayMaster, hidden.gan));
      if (hiddenGroup) linearUnitsV2 += layerWeight(hidden.role) * oppositionWeight(hiddenGroup);
    }
  }
  let repeatBaseUnits = 0;
  let sameClassEchoUnits = 0;
  for (const group of eligibleGroups) {
    repeatBaseUnits += counts[group] - 1;
    if (stemGroups.has(group)) sameClassEchoUnits += 0.5;
  }
  const synergyUnitsV2 = repeatBaseUnits + sameClassEchoUnits;
  // v4：只把余三支中完全相同、且本气在克泄耗侧的重复支视为群；同类透干是独立 echo 倍率。
  const zhiCounts = new Map<Dizhi, number>();
  for (const pillar of ['年', '日', '时'] as Pillar[]) zhiCounts.set(siZhu[pillar].zhi, (zhiCounts.get(siZhu[pillar].zhi) || 0) + 1);
  const repeatedOpposingZhi = new Set([...zhiCounts.entries()].filter(([zhi, count]) =>
    count >= 2 && roleGroup(getShiShen(dayMaster, ZHI_CANG_GAN[zhi][0].gan)) !== null).map(([zhi]) => zhi));
  const useV6 = formulaRevision === 'v6-exact-repeat-stem-gated';
  const scoreableRepeatedOpposingZhi = useV6 && !hasOpposingStem ? new Set<Dizhi>() : repeatedOpposingZhi;
  let repeatBaseUnitsV4 = 0;
  let sameClassEchoUnitsV4 = 0;
  let noEchoUnitsV5 = 0;
  let echoUnitsV5 = 0;
  for (const zhi of scoreableRepeatedOpposingZhi) {
    let branchUnits = 0;
    const occurrences = (['年', '日', '时'] as Pillar[]).filter(pillar => siZhu[pillar].zhi === zhi).length;
    for (const hidden of ZHI_CANG_GAN[zhi]) {
      const group = roleGroup(getShiShen(dayMaster, hidden.gan));
      if (group) branchUnits += layerWeight(hidden.role) * oppositionWeight(group) * occurrences;
    }
    repeatBaseUnitsV4 += branchUnits;
    const mainGroup = roleGroup(getShiShen(dayMaster, ZHI_CANG_GAN[zhi][0].gan));
    if (mainGroup && stemGroups.has(mainGroup)) {
      sameClassEchoUnitsV4 += branchUnits;
      echoUnitsV5 += branchUnits;
    } else noEchoUnitsV5 += branchUnits;
  }
  const useV5 = formulaRevision === 'v5-exclusive-repeat-echo';
  const useV4 = formulaRevision === 'v4-exact-repeat-counted-root';
  const useExclusiveRepeatEcho = useV5 || useV6;
  const useNarrowMonthRoot = useV4 || useExclusiveRepeatEcho;
  const useV2 = formulaRevision === 'v2-gated-residual-groups' || formulaRevision === 'v3-counted-root-causal-gates';
  const linearUnits = useExclusiveRepeatEcho ? noEchoUnitsV5 : useV4 ? repeatBaseUnitsV4 : useV2 ? linearUnitsV2 : linearUnitsV1;
  const synergyUnits = useExclusiveRepeatEcho ? echoUnitsV5 : useV4 ? sameClassEchoUnitsV4 : useV2 ? synergyUnitsV2 : synergyUnitsV1;

  const baseSupport: Record<Pillar, number> = {
    年: positiveHiddenContribution(dayMaster, siZhu.年.zhi),
    月: monthPositiveContribution(dayMaster, siZhu.月.zhi, enrichment.旺衰.breakdown),
    日: positiveHiddenContribution(dayMaster, siZhu.日.zhi),
    时: positiveHiddenContribution(dayMaster, siZhu.时.zhi),
  };
  const huju = hujuSupportByPillar(dayMaster, siZhu);
  const stemRoots = stemRootBonusByPillar(dayMaster, siZhu);
  const stemRootComponents = stemRootBonusComponents(dayMaster, siZhu);
  const support: Record<Pillar, number> = { ...baseSupport };
  for (const pillar of ['年', '月', '日', '时'] as Pillar[]) {
    baseSupport[pillar] += huju[pillar];
    support[pillar] = baseSupport[pillar] + stemRoots[pillar];
  }

  const rates: Record<Pillar, { active: number; reduced: number }> = {
    年: { active: 0, reduced: 0 }, 月: { active: 0, reduced: 0 },
    日: { active: 0, reduced: 0 }, 时: { active: 0, reduced: 0 },
  };
  const ratesV4: Record<Pillar, { active: number; reduced: number }> = {
    年: { active: 0, reduced: 0 }, 月: { active: 0, reduced: 0 },
    日: { active: 0, reduced: 0 }, 时: { active: 0, reduced: 0 },
  };
  const clashes = interactions.filter(item => item.kind === '地支' && item.type === '六冲');
  for (const clash of clashes) {
    if (clash.status !== '生效' && clash.status !== '减力') continue;
    const pair = new Set(clash.members);
    const isStorageClash = (pair.has('辰') && pair.has('戌')) || (pair.has('丑') && pair.has('未'));
    for (const pillar of clash.pillars) {
      const key = pillar as Pillar;
      if (clash.status === '生效') rates[key].active += 1;
      else rates[key].reduced += 1;
    }
    // v4 最小证据边界：非库冲且冲及月柱时，只把次数归到月支；其余柱根气不折。
    if (!isStorageClash && clash.pillars.includes('月')) {
      if (clash.status === '生效') ratesV4.月.active += 1;
      else ratesV4.月.reduced += 1;
    }
  }
  let activeSupport = 0;
  let reducedSupport = 0;
  for (const pillar of ['年', '月', '日', '时'] as Pillar[]) {
    const activeShare = Math.min(1, rates[pillar].active);
    const reducedShare = Math.min(1 - activeShare, rates[pillar].reduced);
    activeSupport += support[pillar] * activeShare;
    reducedSupport += support[pillar] * reducedShare;
  }
  return {
    linear_units: +linearUnits.toFixed(4),
    synergy_units: +synergyUnits.toFixed(4),
    repeat_base_units: +(useExclusiveRepeatEcho ? noEchoUnitsV5 : useV4 ? repeatBaseUnitsV4 : useV2 ? repeatBaseUnits : Math.max(0, branchGroups.length - 1)).toFixed(4),
    same_class_echo_units: +(useExclusiveRepeatEcho ? echoUnitsV5 : useV4 ? sameClassEchoUnitsV4 : useV2 ? sameClassEchoUnits : (branchGroups.length >= 2 && hasEcho ? 0.5 : 0)).toFixed(4),
    support_by_pillar: Object.fromEntries(Object.entries(support).map(([k, v]) => [k, +v.toFixed(4)])) as Record<Pillar, number>,
    active_support: +activeSupport.toFixed(4),
    reduced_support: +reducedSupport.toFixed(4),
    root_support_pillars: Object.fromEntries((['年', '月', '日', '时'] as Pillar[]).map(pillar => [pillar, {
      support: +(useNarrowMonthRoot
        ? (pillar === '月' ? Math.max(0, Number(enrichment.旺衰.breakdown.得令)) + Math.max(0, Number(enrichment.旺衰.breakdown.长生)) : 0)
        : support[pillar]).toFixed(4),
      active_count: (useNarrowMonthRoot ? ratesV4 : rates)[pillar].active,
      reduced_count: (useNarrowMonthRoot ? ratesV4 : rates)[pillar].reduced,
    }])) as FeatureSet['root_support_pillars'],
    stem_root_bonus_components: stemRootComponents,
    adjudicated_six_clashes: clashes.map(item => ({
      members: item.members, pillars: item.pillars, distance: item.distance, status: item.status, cause: item.cause,
      score_eligible_v4: item.pillars.includes('月')
        && !((item.members.includes('辰') && item.members.includes('戌')) || (item.members.includes('丑') && item.members.includes('未'))),
    })),
  };
}

function candidateScore(row: RecordRow, params: Params, formulaRevision: string): {
  score: number; delta: number; linear_delta: number; synergy_delta: number; group_delta: number; root_delta: number;
} {
  const linearDelta = -(row.features.linear_units * params.linear_scale);
  const synergyDelta = -(row.features.synergy_units * params.synergy_scale);
  let rootMagnitude: number;
  if (formulaRevision === 'v3-counted-root-causal-gates' || formulaRevision === 'v4-exact-repeat-counted-root' || formulaRevision === 'v5-exclusive-repeat-echo' || formulaRevision === 'v6-exact-repeat-stem-gated') {
    const ratesByPillar: Record<Pillar, number> = {} as Record<Pillar, number>;
    rootMagnitude = (['年', '月', '日', '时'] as Pillar[]).reduce((sum, pillar) => {
      const item = row.features.root_support_pillars[pillar];
      const rate = Math.min(1, item.active_count * params.active_discount + item.reduced_count * params.reduced_discount);
      ratesByPillar[pillar] = rate;
      return sum + item.support * rate;
    }, 0);
    // v4 不折得地、会局或任何天干通根加成；只折冲及月柱的正向得令+长生。
  } else {
    // v1/v2 留档口径：先把冲次数压成布尔，再乘折损率。v3 已明示修复，旧结果仍可重放。
    rootMagnitude = row.features.active_support * params.active_discount
      + row.features.reduced_support * params.reduced_discount;
  }
  const rootDelta = -rootMagnitude;
  const delta = linearDelta + synergyDelta + rootDelta;
  return {
    score: +(row.baseline.score + delta).toFixed(2),
    delta: +delta.toFixed(2),
    linear_delta: +linearDelta.toFixed(2),
    synergy_delta: +synergyDelta.toFixed(2),
    group_delta: +(linearDelta + synergyDelta).toFixed(2),
    root_delta: +rootDelta.toFixed(2),
  };
}

function worsenedPartial(before: number, after: number, expected: Direction): boolean {
  if (expected === '弱') return after > before;
  if (expected === '强') return after < before;
  return Math.abs(after) > Math.abs(before);
}

function evaluate(rows: RecordRow[], params: Params, formulaRevision: string, excludedId?: string): Candidate {
  const results = rows.map(row => {
    const next = candidateScore(row, params, formulaRevision);
    return { id: row.id, ...next, verdict: verdict(next.score), direction: directionOf(next.score) };
  });
  let targetHits = 0;
  let okRegressions = 0;
  let partialOpposites = 0;
  let partialWorsened = 0;
  let nonTargetAbsDrift = 0;
  for (const row of rows) {
    if (row.id === excludedId) continue;
    const result = results.find(item => item.id === row.id)!;
    if (row.guard_class === 'target' && result.direction === '弱') targetHits++;
    if (row.guard_class === 'ok' && !sameSide(result.direction, row.guard_direction)) okRegressions++;
    if (row.guard_class === 'partial') {
      if (opposite(result.direction, row.guard_direction)) partialOpposites++;
      if (worsenedPartial(row.baseline.score, result.score, row.guard_direction)) partialWorsened++;
    }
    if (row.guard_class !== 'target') nonTargetAbsDrift += Math.abs(result.score - row.baseline.score);
  }
  const targetDenominator = rows.filter(row => row.guard_class === 'target' && row.id !== excludedId).length;
  const parameterCount = Object.values(params).filter(value => value !== 0).length;
  const causalFailures: string[] = [];
  if (formulaRevision === 'v3-counted-root-causal-gates' || formulaRevision === 'v4-exact-repeat-counted-root' || formulaRevision === 'v5-exclusive-repeat-echo' || formulaRevision === 'v6-exact-repeat-stem-gated') {
    for (const id of ['韦千里·顾维钧', '韦千里·周信芳']) {
      if (id === excludedId) continue;
      const result = results.find(item => item.id === id)!;
      if (!(result.group_delta < 0)) causalFailures.push(`${id}:耗方群势修正未入账`);
    }
    const ruanId = '韦千里·阮玲玉';
    if (ruanId !== excludedId) {
      const row = rows.find(item => item.id === ruanId)!;
      const result = results.find(item => item.id === ruanId)!;
      const monthActiveClashes = row.features.adjudicated_six_clashes.filter((item: any) =>
        item.status === '生效' && item.score_eligible_v4 !== false && Array.isArray(item.pillars) && item.pillars.includes('月')).length;
      if ((formulaRevision === 'v4-exact-repeat-counted-root' || formulaRevision === 'v5-exclusive-repeat-echo') && !(result.group_delta < 0)) causalFailures.push(`${ruanId}:重复支群势修正未入账`);
      if (formulaRevision === 'v6-exact-repeat-stem-gated' && !(result.group_delta < 0)) causalFailures.push(`${ruanId}:repeat-group-delta-missing`);
      if (!(result.root_delta < 0)) causalFailures.push(`${ruanId}:冲根修正未入账`);
      if (monthActiveClashes < 2) causalFailures.push(`${ruanId}:月支生效六冲仅${monthActiveClashes}条`);
    }
  }
  return {
    params,
    parameter_count: parameterCount,
    target_hits: targetHits,
    ok_regressions: okRegressions,
    partial_opposites: partialOpposites,
    partial_worsened: partialWorsened,
    non_target_abs_drift: +nonTargetAbsDrift.toFixed(2),
    causal_failures: causalFailures,
    release_eligible: targetHits === targetDenominator && okRegressions === 0 && partialOpposites === 0 && causalFailures.length === 0,
    results,
  };
}

function paramTuple(candidate: Candidate): number[] {
  const p = candidate.params;
  return [p.linear_scale, p.synergy_scale, p.active_discount, p.reduced_discount];
}

function compareLex(a: Candidate, b: Candidate): number {
  const aa = paramTuple(a); const bb = paramTuple(b);
  for (let i = 0; i < aa.length; i++) if (aa[i] !== bb[i]) return aa[i] - bb[i];
  return 0;
}

function releaseCompare(a: Candidate, b: Candidate): number {
  return a.partial_worsened - b.partial_worsened
    || a.parameter_count - b.parameter_count
    || a.non_target_abs_drift - b.non_target_abs_drift
    || compareLex(a, b);
}

function diagnosticCompare(a: Candidate, b: Candidate): number {
  return b.target_hits - a.target_hits
    || a.ok_regressions - b.ok_regressions
    || a.partial_opposites - b.partial_opposites
    || a.causal_failures.length - b.causal_failures.length
    || a.partial_worsened - b.partial_worsened
    || a.parameter_count - b.parameter_count
    || a.non_target_abs_drift - b.non_target_abs_drift
    || compareLex(a, b);
}

function select(candidates: Candidate[]): { selected: Candidate; release: boolean } {
  const eligible = candidates.filter(item => item.release_eligible).sort(releaseCompare);
  if (eligible.length) return { selected: eligible[0], release: true };
  return { selected: [...candidates].sort(diagnosticCompare)[0], release: false };
}

function makeGrid(config: any): Params[] {
  const g = config.grid;
  const values = (key: string) => range(g[key].min, g[key].max, g[key].step);
  const out: Params[] = [];
  for (const linear_scale of values('linear_scale'))
    for (const synergy_scale of values('synergy_scale'))
      for (const active_discount of values('active_discount'))
        for (const reduced_discount of values('reduced_discount'))
          out.push({ linear_scale, synergy_scale, active_discount, reduced_discount });
  return out;
}

function sameParams(a: Params, b: Params): boolean {
  return (Object.keys(a) as Array<keyof Params>).every(key => a[key] === b[key]);
}

function adjacentCandidates(selected: Candidate, all: Candidate[], config: any): Candidate[] {
  const keys = Object.keys(selected.params) as Array<keyof Params>;
  const out: Candidate[] = [];
  for (const key of keys) {
    const step = config.grid[key].step;
    for (const sign of [-1, 1]) {
      const params = { ...selected.params, [key]: +(selected.params[key] + sign * step).toFixed(8) };
      if (params[key] < config.grid[key].min || params[key] > config.grid[key].max) continue;
      const found = all.find(item => sameParams(item.params, params));
      if (found) out.push(found);
    }
  }
  return out;
}

function assertSourceGold(gold: any): GoldCase[] {
  if (!Array.isArray(gold.cases) || gold.cases.length !== 22) throw new Error(`source gold 应为 22 例，实际 ${gold.cases?.length}`);
  const ids = new Set<string>();
  const axes = new Set(['扶抑', '调候', '混合']);
  const directions = new Set(['强', '弱', '中和', '不适用']);
  for (const item of gold.cases as GoldCase[]) {
    if (ids.has(item.id)) throw new Error(`source gold 重复 id: ${item.id}`);
    ids.add(item.id);
    if (!axes.has(item.axis) || !directions.has(item.direction)) throw new Error(`source gold 轴/方向非法: ${item.id}`);
    const source = readJson(path.join(here, item.source_case));
    if (source.id !== item.id) throw new Error(`source gold id 与命例不符: ${item.id}`);
    if (source.classic?.原文四柱 !== item.pillars) throw new Error(`source gold 四柱与命例不符: ${item.id}`);
    const excerpt = source.classic?.断语摘录 || '';
    for (const evidence of item.evidence) if (!excerpt.includes(evidence)) throw new Error(`evidence 不是连续原文: ${item.id} / ${evidence}`);
  }
  const forbidden = /"(?:score|verdict|algorithm|算法(?:层)?输出)"\s*:/i;
  if (forbidden.test(fs.readFileSync(goldPath, 'utf8'))) throw new Error('source gold 混入算法输出字段');
  return gold.cases;
}

function loadRows(goldCases: GoldCase[], snapshot: any | null, openPolicy: InteractionPolicy, formulaRevision: string): RecordRow[] {
  const snapshotMap = new Map<string, SnapshotCase>((snapshot?.cases || []).map((item: SnapshotCase) => [item.id, item]));
  return goldCases.map(gold => {
    const source = readJson(path.join(here, gold.source_case));
    const chart = createChart({ ...source.birth, isLunar: !!source.birth.isLunar, timeZone: source.birth.timeZone ?? 8 } as any);
    const siZhu = pillarsOf(chart);
    const actualPillars = pillarsText(siZhu);
    if (actualPillars !== gold.pillars) throw new Error(`排盘未复现书载四柱: ${gold.id} ${actualPillars} != ${gold.pillars}`);
    const enrichment: any = enrichBazi(siZhu, { interactionPolicy: openPolicy });
    const snap = snapshotMap.get(gold.id);
    if (!snap) throw new Error(`v3.12 快照缺例，当前生产算法不得反向重建旧基线: ${gold.id}`);
    const baseline = {
      score: snap.score,
      verdict: snap.verdict,
      confidence: snap.confidence,
      breakdown: { ...snap.breakdown, details: [] },
    };
    return {
      id: gold.id,
      source_case: gold.source_case,
      pillars: gold.pillars,
      gold: { axis: gold.axis, direction: gold.direction, evidence: gold.evidence },
      guard_class: snap?.guard_class || 'cross_axis',
      guard_direction: snap?.guard_direction || '不适用',
      baseline,
      climate: {
        调候取干: enrichment.调候用神,
        格: enrichment.调候条例?.格,
        命中: (enrichment.调候条例?.命中 || []).map((hit: any) => ({ id: hit.id, 名: hit.显示名 || hit.名, 档: hit.档, 意象: hit.意象 })),
        档位计: enrichment.调候条例?.档位计,
        病: enrichment.调候条例?.病,
      },
      outlet: enrichment.用神建议?.出口,
      features: features(siZhu, enrichment, enrichment.作用关系.items, formulaRevision),
    };
  });
}

function assertSnapshot(rows: RecordRow[], snapshot: any): void {
  if (!Array.isArray(snapshot.cases) || snapshot.cases.length !== 22) throw new Error(`v3.12 快照应为 22 例，实际 ${snapshot.cases?.length}`);
  for (const row of rows) {
    const saved = snapshot.cases.find((item: SnapshotCase) => item.id === row.id);
    if (!saved) throw new Error(`v3.12 快照缺例: ${row.id}`);
    const now = JSON.stringify({ score: row.baseline.score, verdict: row.baseline.verdict, confidence: row.baseline.confidence, breakdown: compactBreakdown(row.baseline.breakdown) });
    const then = JSON.stringify({ score: saved.score, verdict: saved.verdict, confidence: saved.confidence, breakdown: saved.breakdown });
    if (now !== then) throw new Error(`v3.12 快照漂移: ${row.id}`);
  }
}

function compactBreakdown(breakdown: any): Record<string, number> {
  return {
    得令: Number(breakdown.得令),
    长生: Number(breakdown.长生),
    得地: Number(breakdown.得地),
    得势: Number(breakdown.得势),
    会局: Number(breakdown.会局),
  };
}

function snapshotPayload(rows: RecordRow[], configHash: string, goldHash: string): any {
  const guards: Record<string, { guard_class: GuardClass; guard_direction: Direction }> = {
    '韦千里·阎锡山': { guard_class: 'ok', guard_direction: '弱' },
    '韦千里·马占山': { guard_class: 'ok', guard_direction: '弱' },
    '韦千里·许世英': { guard_class: 'ok', guard_direction: '弱' },
    '韦千里·吴佩孚': { guard_class: 'ok', guard_direction: '强' },
    '韦千里·梅兰芳': { guard_class: 'ok', guard_direction: '强' },
    '韦千里·宋子文': { guard_class: 'ok', guard_direction: '弱' },
    '韦千里·蒋介石': { guard_class: 'ok', guard_direction: '强' },
    '韦千里·蒋邦彦': { guard_class: 'ok', guard_direction: '弱' },
    '韦千里·李国杰': { guard_class: 'ok', guard_direction: '强' },
    '韦千里·某军人': { guard_class: 'ok', guard_direction: '弱' },
    '韦千里·冼冠生': { guard_class: 'ok', guard_direction: '弱' },
    '韦千里·杨宇霆': { guard_class: 'ok', guard_direction: '弱' },
    '韦千里·虞洽卿': { guard_class: 'ok', guard_direction: '弱' },
    '韦千里·镇江金君': { guard_class: 'ok', guard_direction: '弱' },
    '韦千里·商震': { guard_class: 'partial', guard_direction: '弱' },
    '韦千里·孙传芳': { guard_class: 'partial', guard_direction: '强' },
    '韦千里·杨杏佛': { guard_class: 'partial', guard_direction: '强' },
    '韦千里·袁克文': { guard_class: 'partial', guard_direction: '强' },
    '韦千里·顾维钧': { guard_class: 'target', guard_direction: '弱' },
    '韦千里·阮玲玉': { guard_class: 'target', guard_direction: '弱' },
    '韦千里·郑正秋': { guard_class: 'cross_axis', guard_direction: '不适用' },
    '韦千里·周信芳': { guard_class: 'target', guard_direction: '弱' },
  };
  return {
    schema_version: 1,
    snapshot_id: 'v3.12.0-classics-22',
    captured_at: '2026-08-01',
    purpose: '算法回归快照；与 source-gold.v1.json 物理分离，不作为典籍语义金标。',
    source_gold_sha256: goldHash,
    audit_config_sha256: configHash,
    cases: rows.map(row => ({
      id: row.id,
      source_case: row.source_case,
      ...guards[row.id],
      score: row.baseline.score,
      verdict: row.baseline.verdict,
      confidence: row.baseline.confidence,
      breakdown: compactBreakdown(row.baseline.breakdown),
    })),
  };
}

function main(): void {
  const args = parseArgs();
  const format = args.format || 'summary';
  const auditVersion = args.audit || 'v1';
  if (auditVersion !== 'v6') {
  if (!/^v[12345]$/.test(auditVersion)) throw new Error(`未知 audit 版本: ${auditVersion}`);
  }
  const configPath = path.join(auditDir, `${auditVersion}.config.json`);
  const config = loadAuditConfig(configPath);
  const gold = readJson(goldPath);
  const goldCases = assertSourceGold(gold);
  const lineages = readJson(lineagesPath);
  const openPolicy = assertInteractionPolicy(lineages?.lineages?.open?.interaction_policy, 'lineages.open.interaction_policy');
  const configHash = hashFile(configPath);
  const goldHash = hashFile(goldPath);
  const snapshot = fs.existsSync(snapshotPath) ? readJson(snapshotPath) : null;
  const formulaRevision = config.formula_revision || 'v1-ungated';
  let rows = loadRows(goldCases, snapshot, openPolicy, formulaRevision);

  if (format === 'snapshot') {
    process.stdout.write(JSON.stringify(snapshotPayload(rows, configHash, goldHash), null, 2) + '\n');
    return;
  }
  if (!snapshot) throw new Error('缺 v3.12 回归快照；先用 --format=snapshot 输出并经人工复核后，以 apply_patch 建档');
  assertSnapshot(rows, snapshot);
  const snapshotMap = new Map<string, SnapshotCase>(snapshot.cases.map((item: SnapshotCase) => [item.id, item]));
  rows = rows.map(row => ({ ...row, guard_class: snapshotMap.get(row.id)!.guard_class, guard_direction: snapshotMap.get(row.id)!.guard_direction }));

  const params = makeGrid(config);
  const candidates = params.map(item => evaluate(rows, item, formulaRevision));
  const chosen = select(candidates);
  const adjacent = adjacentCandidates(chosen.selected, candidates, config);
  const leaveOneOut = rows.map(row => {
    const selection = select(params.map(item => evaluate(rows, item, formulaRevision, row.id)));
    const held = selection.selected.results.find(item => item.id === row.id)!;
    const heldPass = row.guard_class === 'target' ? held.direction === '弱'
      : row.guard_class === 'ok' ? sameSide(held.direction, row.guard_direction)
      : row.guard_class === 'partial' ? !opposite(held.direction, row.guard_direction) : true;
    return {
      held_out: row.id,
      selected_params: selection.selected.params,
      changed: !sameParams(selection.selected.params, chosen.selected.params),
      held_out_result: held,
      held_out_pass: heldPass,
      release_eligible_on_training_subset: selection.release,
    };
  });
  const payload = {
    audit_id: config.audit_id,
    config_sha256: configHash,
    source_gold_sha256: goldHash,
    snapshot_sha256: hashFile(snapshotPath),
    source_gold_validation: '22/22 evidence 为命例摘录连续片段；未含算法输出字段',
    snapshot_validation: '22/22 当前生产输出逐字段匹配 v3.12 快照',
    grid_size: candidates.length,
    release_eligible_count: candidates.filter(item => item.release_eligible).length,
    selection_kind: chosen.release ? 'release_candidate' : 'diagnostic_only_no_release_candidate',
    selected: chosen.selected,
    adjacent: {
      count: adjacent.length,
      release_eligible_count: adjacent.filter(item => item.release_eligible).length,
      all: adjacent.map(item => ({ params: item.params, release_eligible: item.release_eligible, target_hits: item.target_hits, ok_regressions: item.ok_regressions, partial_opposites: item.partial_opposites, causal_failures: item.causal_failures })),
    },
    leave_one_out: {
      changed_count: leaveOneOut.filter(item => item.changed).length,
      held_out_fail_count: leaveOneOut.filter(item => !item.held_out_pass).length,
      cases: leaveOneOut,
    },
    records: rows,
  };

  if (format === 'json') {
    process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
    return;
  }
  console.log(`# ${payload.audit_id}`);
  console.log(`config_sha256=${configHash}`);
  console.log(`source_gold_sha256=${goldHash}`);
  console.log(`snapshot_sha256=${payload.snapshot_sha256}`);
  console.log(`grid=${payload.grid_size} release_eligible=${payload.release_eligible_count} selection=${payload.selection_kind}`);
  console.log(`selected=${JSON.stringify(chosen.selected.params)} targets=${chosen.selected.target_hits}/3 ok_regressions=${chosen.selected.ok_regressions}/14 partial_opposites=${chosen.selected.partial_opposites}/4 partial_worsened=${chosen.selected.partial_worsened}/4 causal_failures=${chosen.selected.causal_failures.length} non_target_abs_drift=${chosen.selected.non_target_abs_drift}`);
  console.log(`adjacent=${adjacent.length} adjacent_release_eligible=${adjacent.filter(item => item.release_eligible).length}`);
  console.log(`leave_one_out_changed=${payload.leave_one_out.changed_count}/22 held_out_fail=${payload.leave_one_out.held_out_fail_count}/22`);
  console.log('');
  console.log('| 例 | 金标轴/方向 | 守门类 | v3.12 扶抑 | 调候命中 | 候选扶抑 | Δ |');
  console.log('|---|---|---|---|---|---|---:|');
  for (const row of rows) {
    const result = chosen.selected.results.find(item => item.id === row.id)!;
    const hits = row.climate.命中.map((item: any) => item.名 || item.id).join('、') || '无';
    console.log(`| ${row.id.replace('韦千里·', '')} | ${row.gold.axis}/${row.gold.direction} | ${row.guard_class} | ${row.baseline.verdict} ${row.baseline.score} | ${hits} | ${result.verdict} ${result.score} | ${result.delta} |`);
  }
}

main();

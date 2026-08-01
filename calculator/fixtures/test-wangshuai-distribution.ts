// 旺衰 v3 5000 盘分布门。种子、采样域与门槛在首次运行前冻结于 distribution/v3.13.config.json。
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { createChart } from '../yiqi-core/index';
import { aggregateConfidenceTier } from '../bazi-enrich/confidence';
import { WangShuaiResult, WangShuaiVerdict } from '../bazi-enrich/wang-shuai';
import { GAN_WUXING } from '../bazi-enrich/tables';
import { evalTiaoLi } from '../bazi-enrich/tiaohou-tiaoli';
import { adviseYongShen } from '../bazi-enrich/yongshen';
import { enrichOpen } from './support/open-policy';

const distributionDir = path.join(__dirname, 'calibration', 'distribution');
const configPath = path.join(distributionDir, 'v3.13.config.json');
const configText = fs.readFileSync(configPath, 'utf-8');
const config = JSON.parse(configText);
const frozenBaseline = JSON.parse(fs.readFileSync(path.join(distributionDir, 'v3.12.baseline.json'), 'utf-8'));
const configHash = crypto.createHash('sha256').update(configText).digest('hex');
if (frozenBaseline.config_sha256 !== configHash) throw new Error(`分布基线 config hash 不匹配: ${frozenBaseline.config_sha256} != ${configHash}`);

const verdicts: WangShuaiVerdict[] = ['极旺(可能从强)', '偏旺', '中和', '偏弱', '极弱(可能从弱)'];
const elements = ['木', '火', '土', '金', '水'];
const tiers = ['high', 'medium', 'low'];

type Counts = Record<string, number>;
function zero(keys: string[]): Counts { return Object.fromEntries(keys.map(key => [key, 0])); }
function rngFor(seed: number): (n: number) => number {
  let state = seed >>> 0;
  return (n: number) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state % n;
  };
}

function legacyV2(current: WangShuaiResult): WangShuaiResult {
  const b = current.breakdown;
  const score = +(b.得令 + b.长生 + b.得地 + b.得势 + b.会局).toFixed(2);
  let verdict: WangShuaiVerdict;
  if (score >= 12) verdict = '极旺(可能从强)';
  else if (score >= 3) verdict = '偏旺';
  else if (score > -2.5) verdict = '中和';
  else if (score > -8) verdict = '偏弱';
  else verdict = '极弱(可能从弱)';
  const dist = Math.min(Math.abs(score - 3), Math.abs(score + 2.5));
  const confidence: WangShuaiResult['confidence'] = dist > 2 ? '高' : dist > 0.8 ? '中' : '低';
  return {
    score,
    verdict,
    confidence,
    breakdown: {
      得令: b.得令,
      长生: b.长生,
      得地: b.得地,
      得势: b.得势,
      会局: b.会局,
      耗方群势: 0,
      冲根修正: 0,
      audit: [],
      details: b.details.filter(text => !text.startsWith('耗方群势') && !text.startsWith('冲根修正')),
    },
  };
}

const sourceGold = JSON.parse(fs.readFileSync(path.join(__dirname, 'calibration', 'source-gold.v1.json'), 'utf-8'));
const v312Snapshot = JSON.parse(fs.readFileSync(path.join(__dirname, 'calibration', 'regression', 'v3.12.snapshot.json'), 'utf-8'));
for (const item of sourceGold.cases as any[]) {
  const source = JSON.parse(fs.readFileSync(path.join(__dirname, 'calibration', item.source_case), 'utf-8'));
  const chart: any = createChart({ ...source.birth, isLunar: !!source.birth.isLunar, timeZone: source.birth.timeZone ?? 8 } as any);
  const raw = chart.bazi.siZhu;
  const siZhu: any = { 年: raw.year, 月: raw.month, 日: raw.day, 时: raw.hour };
  const baseline = legacyV2(enrichOpen(siZhu).旺衰);
  const saved = v312Snapshot.cases.find((row: any) => row.id === item.id);
  if (!saved || baseline.score !== saved.score || baseline.verdict !== saved.verdict || baseline.confidence !== saved.confidence) {
    throw new Error(`legacyV2 未复现 v3.12 快照: ${item.id}`);
  }
}

const baselineVerdicts = zero(verdicts);
const currentVerdicts = zero(verdicts);
const baselineConfidence = zero(tiers);
const currentConfidence = zero(tiers);
const byElement: Record<string, { total: number; baseline: Counts; current: Counts }> = Object.fromEntries(
  elements.map(element => [element, { total: 0, baseline: zero(verdicts), current: zero(verdicts) }]),
);
let count = 0;

for (const seed of config.seeds as number[]) {
  const rand = rngFor(seed);
  for (let index = 0; index < config.samples_per_seed; index++) {
    const chart: any = createChart({
      year: config.domain.year[0] + rand(config.domain.year[1] - config.domain.year[0] + 1),
      month: config.domain.month[0] + rand(config.domain.month[1] - config.domain.month[0] + 1),
      day: config.domain.day[0] + rand(config.domain.day[1] - config.domain.day[0] + 1),
      hour: config.domain.hour[0] + rand(config.domain.hour[1] - config.domain.hour[0] + 1),
      minute: config.domain.minute,
      gender: rand(2) ? 'male' : 'female',
      isLunar: config.domain.isLunar,
      timeZone: config.domain.timeZone,
    } as any);
    const raw = chart.bazi.siZhu;
    const siZhu: any = { 年: raw.year, 月: raw.month, 日: raw.day, 时: raw.hour };
    const enrichment: any = enrichOpen(siZhu);
    const current = enrichment.旺衰;
    const baseline = legacyV2(current);
    const baselineBody = /旺/.test(baseline.verdict) ? '强' : /弱/.test(baseline.verdict) ? '弱' : '中和';
    const baselineTiaoLi = evalTiaoLi(siZhu, siZhu.日.gan, baselineBody);
    const wxForYs: Record<string, number> =
      enrichment.五行统计.withCangGan || enrichment.五行统计.surface || enrichment.五行统计;
    const baselineYongShen = adviseYongShen(
      siZhu.日.gan, baseline, enrichment.调候用神, enrichment.格局, wxForYs, siZhu,
    );
    enrichment.时辰边界 = { boundary: false };
    const currentTier = aggregateConfidenceTier(enrichment).tier;
    const baselineTier = aggregateConfidenceTier({
      ...enrichment, 旺衰: baseline, 调候条例: baselineTiaoLi, 用神建议: baselineYongShen,
    }).tier;
    const element = GAN_WUXING[siZhu.日.gan];

    baselineVerdicts[baseline.verdict]++;
    currentVerdicts[current.verdict]++;
    baselineConfidence[baselineTier]++;
    currentConfidence[currentTier]++;
    byElement[element].total++;
    byElement[element].baseline[baseline.verdict]++;
    byElement[element].current[current.verdict]++;
    count++;
  }
}

const computedDaymasterBaseline = Object.fromEntries(elements.map(element => [element, {
  total: byElement[element].total,
  verdicts: byElement[element].baseline,
}]));
const computedBaseline = {
  count, verdicts: baselineVerdicts, confidence: baselineConfidence, daymaster_elements: computedDaymasterBaseline,
};
const expectedBaseline = {
  count: frozenBaseline.count,
  verdicts: frozenBaseline.verdicts,
  confidence: frozenBaseline.confidence,
  daymaster_elements: frozenBaseline.daymaster_elements,
};
if (JSON.stringify(computedBaseline) !== JSON.stringify(expectedBaseline)) throw new Error('v3.12 冻结分布基线漂移');

let maxDrift = 0;
const driftByElement: Record<string, Counts> = {};
for (const element of elements) {
  const stats = byElement[element];
  driftByElement[element] = {};
  for (const verdict of verdicts) {
    const frozenStats = frozenBaseline.daymaster_elements[element];
    const baselineRate = frozenStats.verdicts[verdict] / frozenStats.total;
    const currentRate = stats.current[verdict] / stats.total;
    const drift = Math.abs(currentRate - baselineRate) * 100;
    driftByElement[element][verdict] = +drift.toFixed(2);
    maxDrift = Math.max(maxDrift, drift);
  }
}

const lowRate = currentConfidence.low / count;
const report = {
  audit_id: config.audit_id,
  seeds: config.seeds,
  samples_per_seed: config.samples_per_seed,
  count,
  baseline_verdicts: frozenBaseline.verdicts,
  current_verdicts: currentVerdicts,
  baseline_confidence: frozenBaseline.confidence,
  current_confidence: currentConfidence,
  current_low_rate: +lowRate.toFixed(4),
  daymaster_elements: byElement,
  drift_percentage_points: driftByElement,
  max_drift_percentage_points: +maxDrift.toFixed(2),
};
console.log(JSON.stringify(report, null, 2));

const errors: string[] = [];
if (count !== config.gates.exact_sample_count) errors.push(`样本数 ${count} != ${config.gates.exact_sample_count}`);
if (lowRate < config.gates.current_total_low_rate[0] || lowRate > config.gates.current_total_low_rate[1]) {
  errors.push(`总档 low 率 ${(lowRate * 100).toFixed(2)}% 不在门限`);
}
if (maxDrift > config.gates.max_daymaster_element_single_verdict_drift_percentage_points) {
  errors.push(`日主五行单档最大漂移 ${maxDrift.toFixed(2)}pp 超限`);
}
if (errors.length) {
  console.error(`\n❌ 5000盘分布门失败：${errors.join('；')}`);
  process.exit(1);
}
console.log('\n✅ 5000盘分布门全部通过');

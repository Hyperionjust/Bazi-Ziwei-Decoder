// 旺衰 v3 专项回归：F0 v6 生产等价、F1/F2 因果边界、F3 双轴。
import * as fs from 'fs';
import * as path from 'path';
import { createChart } from '../yiqi-core/index';
import { enrichBazi } from '../bazi-enrich/enrich';
import { judgeWangShuai } from '../bazi-enrich/wang-shuai';
import { scoreWangShuaiV3Adjustments } from '../bazi-enrich/wang-shuai-v3';
import { AdjudicatedRelation } from '../bazi-enrich/interactions';
import { adjudicateOpen, enrichOpen, OPEN_INTERACTION_POLICY } from './support/open-policy';

let failed = 0;
function ok(condition: boolean, message: string): void {
  if (condition) console.log('✓', message);
  else { console.log('✗', message); failed++; }
}
function near(actual: number, expected: number, message: string): void {
  ok(Math.abs(actual - expected) < 1e-9, `${message}（得到 ${actual}，期望 ${expected}）`);
}
function direction(verdict: string): '强'|'弱'|'中和' {
  if (/旺/.test(verdict)) return '强';
  if (/弱/.test(verdict)) return '弱';
  return '中和';
}
function siZhuOf(chart: any): any {
  return { 年: chart.bazi.siZhu.year, 月: chart.bazi.siZhu.month, 日: chart.bazi.siZhu.day, 时: chart.bazi.siZhu.hour };
}
function loadCase(sourceCase: string): { siZhu: any; enrichment: any } {
  const source = JSON.parse(fs.readFileSync(path.join(__dirname, 'calibration', sourceCase), 'utf-8'));
  const chart: any = createChart({ ...source.birth, isLunar: !!source.birth.isLunar, timeZone: source.birth.timeZone ?? 8 } as any);
  const siZhu = siZhuOf(chart);
  return { siZhu, enrichment: enrichOpen(siZhu) };
}

const gold = JSON.parse(fs.readFileSync(path.join(__dirname, 'calibration', 'source-gold.v1.json'), 'utf-8'));
const snapshot = JSON.parse(fs.readFileSync(path.join(__dirname, 'calibration', 'regression', 'v3.12.snapshot.json'), 'utf-8'));
const snapshotById = new Map(snapshot.cases.map((item: any) => [item.id, item]));
const expectedDelta: Record<string, number> = {
  '韦千里·顾维钧': -11.2,
  '韦千里·阮玲玉': -8.56,
  '韦千里·周信芳': -10.5,
  '韦千里·冼冠生': -2.56,
  '韦千里·虞洽卿': -1.6,
};

const production = new Map<string, { siZhu: any; enrichment: any }>();
for (const item of gold.cases as any[]) {
  const loaded = loadCase(item.source_case);
  production.set(item.id, loaded);
  const snap: any = snapshotById.get(item.id);
  const expected = +(snap.score + (expectedDelta[item.id] || 0)).toFixed(2);
  near(loaded.enrichment.旺衰.score, expected, `${item.id} 生产分与 F0 v6 冻结候选一致`);
  const b = loaded.enrichment.旺衰.breakdown;
  near(b.得令 + b.长生 + b.得地 + b.得势 + b.会局 + b.耗方群势 + b.冲根修正,
    loaded.enrichment.旺衰.score, `${item.id} 七项账本对平`);
  ok(Array.isArray(b.audit) && Array.isArray(b.details), `${item.id} 结构化审计与文字明细在场`);
  if (snap.guard_class === 'ok') ok(direction(loaded.enrichment.旺衰.verdict) === snap.guard_direction, `${item.id} 14✅方向不回退`);
  if (snap.guard_class === 'partial') {
    const now = direction(loaded.enrichment.旺衰.verdict);
    ok(!(snap.guard_direction === '强' && now === '弱') && !(snap.guard_direction === '弱' && now === '强'), `${item.id} 4◐不走到反侧`);
  }
}

const gu: any = production.get('韦千里·顾维钧')!.enrichment;
near(gu.旺衰.breakdown.耗方群势, -11.2, '顾维钧亥亥财势按 echo 倍率入账');
ok(gu.旺衰.verdict === '偏弱' && gu.旺衰.breakdown.details.some((text: string) => /门控=.*同类透干=月癸\(耗\)/.test(text)), '顾维钧翻弱且账本点名月癸 echo');

const ruanLoaded = production.get('韦千里·阮玲玉')!;
const ruan: any = ruanLoaded.enrichment;
near(ruan.旺衰.breakdown.耗方群势, -2.56, '阮玲玉亥亥只走 repeat 倍率');
near(ruan.旺衰.breakdown.冲根修正, -6, '阮玲玉两条巳亥冲累计封顶折完正向月令支持');
const ruanClashIds = ruan.作用关系.items.filter((item: any) => item.type === '六冲').map((item: any) => item.id).sort();
ok(JSON.stringify(ruanClashIds) === JSON.stringify(['六冲:月巳-日亥', '六冲:月巳-时亥']), `阮玲玉两冲有独立柱位 ID（${ruanClashIds.join(' / ')}）`);

const zhou: any = production.get('韦千里·周信芳')!.enrichment;
near(zhou.旺衰.breakdown.耗方群势, -10.5, '周信芳午午财杀群势按丁杀 echo 入账');
ok(zhou.旺衰.verdict === '偏弱', '周信芳由偏旺翻为偏弱');
near(production.get('韦千里·李国杰')!.enrichment.旺衰.breakdown.耗方群势, 0, '李国杰无耗方透干，总门关闭不误扣');
near(production.get('韦千里·袁克文')!.enrichment.旺衰.score, -1.7, '袁克文非月支冲根不泛扣，守住中和');

const singleBranch: any = { 年: { gan: '癸', zhi: '亥' }, 月: { gan: '辛', zhi: '丑' }, 日: { gan: '己', zhi: '辰' }, 时: { gan: '乙', zhi: '午' } };
near(scoreWangShuaiV3Adjustments('己', singleBranch, 0, 0, []).耗方群势, 0, '单个耗方支不触发群势');
const noHostileStem: any = { 年: { gan: '戊', zhi: '亥' }, 月: { gan: '丁', zhi: '丑' }, 日: { gan: '己', zhi: '亥' }, 时: { gan: '己', zhi: '辰' } };
near(scoreWangShuaiV3Adjustments('己', noHostileStem, 0, 0, []).耗方群势, 0, '余三支虽重复但无耗方透干不触发');
const monthMustNotGroup: any = { 年: { gan: '癸', zhi: '辰' }, 月: { gan: '辛', zhi: '亥' }, 日: { gan: '己', zhi: '亥' }, 时: { gan: '乙', zhi: '午' } };
near(scoreWangShuaiV3Adjustments('己', monthMustNotGroup, 0, 0, []).耗方群势, 0, '月支不进入 F1 重复支分组');

const ruanInteractions = adjudicateOpen(ruanLoaded.siZhu).items;
const ruanSix = ruanInteractions.filter(item => item.type === '六冲');
const duplicate = judgeWangShuai(ruanLoaded.siZhu, { interactions: [...ruanInteractions, ruanSix[0]] });
near(duplicate.breakdown.冲根修正, -6, '同一关系对象重复输入不重复扣分');
const forgedIdDuplicate = judgeWangShuai(ruanLoaded.siZhu, {
  interactions: [...ruanInteractions, { ...ruanSix[0], id: '六冲:伪造外部ID' }],
});
near(forgedIdDuplicate.breakdown.冲根修正, -6, '同一物理六冲即使外部 ID 不同也不重复扣分');
const withStatuses = (status: AdjudicatedRelation['status']) => ruanInteractions.map(item =>
  item.type === '六冲' ? { ...item, status } : item);
near(judgeWangShuai(ruanLoaded.siZhu, { interactions: withStatuses('被解') }).breakdown.冲根修正, 0, '被解六冲不折月令支持');
near(judgeWangShuai(ruanLoaded.siZhu, { interactions: withStatuses('减力') }).breakdown.冲根修正, 0, 'F0 冻结 reduced=0，减力六冲不扣');
const fake = (id: string, members: string[], pillars: string[]): AdjudicatedRelation => ({
  id, kind: '地支', type: '六冲', members, pillars, distance: '紧贴', status: '生效', cause: '专项反例',
});
near(judgeWangShuai(ruanLoaded.siZhu, { interactions: [fake('六冲:月丑-日未', ['丑', '未'], ['月', '日'])] }).breakdown.冲根修正, 0, '丑未库冲不进入 F2');
near(judgeWangShuai(ruanLoaded.siZhu, { interactions: [fake('六冲:年巳-日亥', ['巳', '亥'], ['年', '日'])] }).breakdown.冲根修正, 0, '不含月柱的六冲不进入 F2');

const zheng: any = production.get('韦千里·郑正秋')!.enrichment;
near(zheng.旺衰.score, 6.26, '郑正秋扶抑保持强侧，不为调候文字硬翻向');
ok(zheng.调候条例.命中.some((hit: any) => (hit.显示名 || hit.名) === '有壬乏丙'), '郑正秋调候轴命中“有壬乏丙”');
ok(zheng.五行统计.surface.火 === 0 && zheng.五行统计.withCangGan.火 === 0, '郑正秋火为 0，寒湿证据保留');
ok(!('调候性弱' in zheng) && !('气候弱' in zheng), '未外推通用调候弱分类器');

let missingPolicyThrew = false;
try { enrichBazi(ruanLoaded.siZhu, { interactionPolicy: undefined as any }); }
catch (error) { missingPolicyThrew = /interaction_policy/.test(String((error as Error).message)); }
ok(missingPolicyThrew, '缺失 open interaction_policy 明确失败');
let invalidPolicyThrew = false;
try { enrichBazi(ruanLoaded.siZhu, { interactionPolicy: { ...OPEN_INTERACTION_POLICY, chong_po_he: 'sometimes' } as any }); }
catch (error) { invalidPolicyThrew = /chong_po_he/.test(String((error as Error).message)); }
ok(invalidPolicyThrew, '非法 open interaction_policy 明确失败');

if (failed) {
  console.log(`\n❌ 旺衰 v3 专项失败 ${failed} 项`);
  process.exit(1);
}
console.log('\n✅ 旺衰 v3 专项全部通过');

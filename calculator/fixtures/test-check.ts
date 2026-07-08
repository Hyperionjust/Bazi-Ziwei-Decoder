// test-check.ts — check-analysis 体检器回归
import { checkAnalysis } from '../check-analysis';
let failed = 0;
const ok = (c: boolean, m: string) => { if (c) console.log('✓', m); else { console.log('✗', m); failed++; } };
const chart = { bazi: { enrichment: { 运岁引动: { 建议节点: [{ 年: 2030 }, { 年: 2035 }, { 年: 2040 }, { 年: 2045 }, { 年: 2050 }] }, 用神建议: { 出口: { 缺补说明: '缺金但金非本盘用忌关键' } } } } };
const seg = (n: number, extra = '') => Array.from({ length: n }, (_, i) => `第${i}句内容足够长撑起字数要求所以多写一点内容${extra}`).join('。') + '。';
const goodPara = `<span class="hl-good">${seg(3)}</span>${seg(4)}<span class="hl">${seg(1)}</span>`;
const good: any = {
  meta: { archetype_name: '厚土载物·静水流深' },
  dm: { desc_html: '己土，属田园之土，特性是包容，意味着你能托底，最强的能力是整合，但易被琐事缠身。' },
  geju: { sub_html: '官印相生格局清。所以你宜借平台成事。' },
  wuxing: { note_html: '全盘缺金而金非用忌关键。所以你不必刻意补金。' },
  tg: { mech_html: '官杀生印。', plain_html: '所以你靠信用立身。' },
  yongshen: { note_html: '临界盘体用两分。所以你护体发用并行。' },
  interp: { personality_html: goodPara, career_html: goodPara, marriage_html: goodPara + '你适合的另一半<span class="hl-good">更可能是一个比你年长、有担当、性格柔和的男生</span>。他会在大事上替你拿主意。', health_html: goodPara },
  hechong: { reading_html: seg(4) }, yunsui: { reading_html: seg(3) }, shensha: { reading_html: seg(4) },
  kaiyun: { ye: 'x', place_html: 'x', item_html: 'x', skill_html: 'x', note_html: 'x' },
  timeline: [2030, 2035, 2040, 2045, 2050].map((y, i) => ({ age: i * 10, year: y, run: '干支', run_class: 'flat', desc: '平路', marker_class: 'flat' })),
};
const rep1 = checkAnalysis(good, chart, 2026);
ok(Object.values(rep1).every((r: any) => r.status !== 'FAIL'), '合格样本全 PASS: ' + JSON.stringify(Object.entries(rep1).filter(([,r]:any)=>r.status==='FAIL').map(([k])=>k)));
const bad = JSON.parse(JSON.stringify(good));
bad.meta.archetype_name = '偏财格身弱';
bad.shensha.reading_html = '羊刃大凶,tier 很高。';
bad.interp.marriage_html = goodPara + '你适合的另一半更可能是一个或年长或年轻的男生。';
bad.timeline[0].year = 1999;
const rep2 = checkAnalysis(bad, chart, 2026);
const f = (k: string) => rep2[k]?.status === 'FAIL' || rep2['_全局禁词']?.reasons.some((r: string) => r.includes(k.split('.')[0]));
ok(rep2['meta.archetype_name'].status === 'FAIL', '判词术语被抓');
ok(rep2['_全局禁词'].status === 'FAIL', 'tier/大凶被抓');
ok(rep2['interp.marriage_html'].status === 'FAIL', '画像骑墙被抓');
ok(rep2['timeline'].status === 'FAIL', '白名单越界被抓');
console.log(failed ? `\n❌ ${failed} 失败` : '\n✅ 全部通过');
process.exit(failed ? 1 : 0);

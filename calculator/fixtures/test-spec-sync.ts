// test-spec-sync.ts — 规格漂移哨兵(v3.9.1 新增)
// ---------------------------------------------------------------------------
// 为什么要有它:
//   同一条形态规格此前在 check-analysis.ts + 4 份提示词 + SKILL.md 各写一遍。
//   v3.7.1 出过真事故——SKILL 说「≥6 句不限篇幅」、bazi-poster 说「3~5 句」、
//   体检器按 2~6 硬拦,模型写得越满越被打回,三处谁也没发现对不上。
//
// 本测试的判据:spec.json 里的数值,必须能在它声明的 mirrored_in 文档里找到。
//   改了 spec.json 却忘了改提示词 → 这里直接 FAIL。
//   反过来改了提示词却没改 spec.json → 体检器仍按 spec 判,同样会被这里逮住。
// 注意:本测试只保证「数字/上下限契约对得上」,不保证「话说得对」,语义仍需人读。
// ---------------------------------------------------------------------------
import * as fs from 'fs';
import * as path from 'path';
import SPEC from '../spec.json';

// 向上找到含 SKILL.md 的仓库根:这样无论从源码(tsx)还是编译产物(node dist/…)跑都成立
function findRoot(start: string): string {
  let d = start;
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(d, 'SKILL.md'))) return d;
    d = path.dirname(d);
  }
  return path.join(start, '..', '..');
}
const ROOT = findRoot(__dirname);
const norm = (s: string) => s.replace(/[ \t　]/g, '');
const cache: Record<string, string> = {};
function doc(rel: string): string {
  if (!(rel in cache)) {
    const p = path.join(ROOT, rel);
    cache[rel] = fs.existsSync(p) ? norm(fs.readFileSync(p, 'utf-8')) : '';
  }
  return cache[rel];
}

let fail = 0;
function mustMention(rel: string, needle: string, why: string) {
  const body = doc(rel);
  if (!body) { console.error(`❌ 文档不存在: ${rel}`); fail++; return; }
  if (!body.includes(norm(needle))) {
    console.error(`❌ ${rel} 未复述规格「${needle}」 — ${why}`);
    fail++;
  }
}

const S = SPEC.sections;
const A = SPEC.archetype;

// ---- 判词规格: N 字 / M+M 对仗 ----
for (const f of A.mirrored_in) {
  mustMention(f, `${A.couplet_len}+${A.couplet_len}`, 'spec.archetype.couplet_len');
}

// ---- 精读段句数区间 ----
const closeRead = `${S.close_read.min_sentences}~${S.close_read.max_sentences}`;
for (const f of ['SKILL.md', 'prompts/bazi-poster.md', 'prompts/bazi-poster-review.md']) {
  mustMention(f, closeRead, 'spec.sections.close_read');
}

// ---- 四大解读段:句数下限 + 字数下限 + 明确无上限必须三项同时同步 ----
const majorRule = `≥${S.major_interp.min_sentences}句、≥${S.major_interp.min_chars}字、不设上限`;
for (const f of S.mirrored_in) {
  mustMention(f, majorRule, 'spec.sections.major_interp: min_sentences/min_chars/no upper limit');
}
if (S.major_interp.max_sentences !== null || S.major_interp.max_chars !== null) {
  console.error('❌ major_interp 必须同时保持句数与字数不设上限(max_sentences/max_chars 均为 null)');
  fail++;
}
mustMention('prompts/ziwei-poster.md', `≥${S.major_interp.min_sentences}句`, 'spec.sections.major_interp.min_sentences');
for (const f of ['SKILL.md', 'prompts/bazi-poster.md', 'prompts/bazi-poster-review.md']) {
  mustMention(f, `每段至少${S.major_interp.min_good_highlights}处`, 'spec.sections.major_interp.min_good_highlights(仅为机器底线,正向语义仍须全覆盖)');
}

// ---- 十神长段:旧版“一句机理+一句白话”不得回归 ----
const tgRule = `≥${S.tg_block.plain_min_sentences}句、≥${S.tg_block.plain_min_chars}字、不设上限`;
for (const f of ['SKILL.md', 'prompts/bazi-poster.md', 'prompts/bazi-poster-review.md']) {
  mustMention(f, tgRule, 'spec.sections.tg_block:十神长段');
}

// ---- 罕见现象独立段 ----
const rareRule = `≥${S.rare_reading.min_sentences}句、≥${S.rare_reading.min_chars}字、不设上限`;
for (const f of ['prompts/bazi-poster.md', 'prompts/bazi-poster-review.md']) {
  mustMention(f, rareRule, 'spec.sections.rare_reading');
  mustMention(f, '偏正向／偏提醒／两面性', '罕象逐项判断好坏与两面性');
}

// ---- 五个算法所有块:数量/截断/条件规则齐全,且不得要求提示词产出 ----
const AB = SPEC.algorithm_owned_blocks;
const algoBlocks = Object.entries(AB.blocks);
if (algoBlocks.length !== AB.exact_blocks) {
  console.error(`❌ algorithm_owned_blocks 应为 ${AB.exact_blocks} 块,实际 ${algoBlocks.length} 块`);
  fail++;
}
for (const [name, block] of algoBlocks) {
  if (block.owner !== 'algorithm' || block.prompt_output_required !== false) {
    console.error(`❌ algorithm_owned_blocks.${name} 必须 owner=algorithm 且 prompt_output_required=false`);
    fail++;
  }
  for (const rule of ['quantity', 'truncation', 'condition'] as const) {
    if (!block[rule] || Object.keys(block[rule]).length === 0) {
      console.error(`❌ algorithm_owned_blocks.${name}.${rule} 缺失或为空`);
      fail++;
    }
  }
}
for (const f of ['prompts/bazi-poster.md', 'prompts/bazi-poster-review.md']) {
  mustMention(f, 'owner=algorithm', '算法所有块不属于 analysis.json');
  mustMention(f, '不要求提示词产出', '算法所有块不要求 LLM 生成');
}

// ---- timeline 项数 ----
mustMention('prompts/bazi-poster.md', `恰${SPEC.timeline.exact_items}项`, 'spec.timeline.exact_items');
mustMention('prompts/bazi-poster.md', `≤${SPEC.timeline.growth_max_chars}字`, 'spec.timeline.growth_max_chars');
mustMention('prompts/bazi-poster.md', 'growth 每项必填', 'spec.timeline.growth_required');

// ---- 连接词白名单:评审遍须列出全部 ----
for (const w of SPEC.connectors.allow) {
  mustMention('prompts/bazi-poster-review.md', w, 'spec.connectors.allow');
}

// ---- 两句块 ----
mustMention('prompts/bazi-poster-review.md', '恰两句', 'spec.sections.two_sentence_block(=2)');
if (S.two_sentence_block.exact_sentences !== 2) {
  console.error('❌ two_sentence_block 已不再是 2,提示词里的「恰两句」措辞需同步改写');
  fail++;
}

// ---- 正缘四型锚头:每个锚头文案都要在提示词里出现 ----
const anchors = Array.from(new Set(Object.values(SPEC.marriage_anchor.by_gongzuo)));
for (const a of anchors) mustMention('prompts/bazi-poster.md', a, 'spec.marriage_anchor.by_gongzuo');

if (fail) { console.error(`\n规格漂移 ${fail} 处 — 改 spec.json 后请同步上述文档`); process.exit(1); }
console.log(`✅ 全部通过 (规格同步: 判词/精读段/四大段句数+字数+无上限/算法所有块×${algoBlocks.length}/timeline/连接词×${SPEC.connectors.allow.length}/正缘四型×${anchors.length})`);

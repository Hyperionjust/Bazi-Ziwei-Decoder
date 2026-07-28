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
// 注意:本测试只保证「数字对得上」,不保证「话说得对」,语义仍需人读。
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

// ---- 四大解读段句数下限(提示词写成 6~10 句,下限须与 spec 一致) ----
for (const f of ['SKILL.md', 'prompts/bazi-poster.md', 'prompts/bazi-poster-review.md']) {
  mustMention(f, `${S.major_interp.min_sentences}~10句`, 'spec.sections.major_interp.min_sentences');
}
mustMention('prompts/ziwei-poster.md', `≥${S.major_interp.min_sentences}句`, 'spec.sections.major_interp.min_sentences');

// ---- timeline 项数 ----
mustMention('prompts/bazi-poster.md', `恰${SPEC.timeline.exact_items}项`, 'spec.timeline.exact_items');

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
console.log(`✅ 全部通过 (规格同步: 判词/精读段/四大段/timeline/连接词×${SPEC.connectors.allow.length}/正缘四型×${anchors.length})`);

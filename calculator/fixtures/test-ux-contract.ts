// test-ux-contract.ts — Codex 对话与海报使用指引回归
// ---------------------------------------------------------------------------
// 这些规则属于用户体验契约，无法靠排盘数值测试覆盖：
// 1) 开场先问通俗结果/专业详解；2) 11章只是展开入口；
// 3) 聊天与四类海报都告诉用户可直接问 AI；4) 逆风/体弱仍标助长；
// 5) 正缘画像优先相处气质，不锁死现实年龄。
// ---------------------------------------------------------------------------
import * as fs from 'fs';
import * as path from 'path';

function findRoot(start: string): string {
  let d = start;
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(d, 'SKILL.md'))) return d;
    d = path.dirname(d);
  }
  throw new Error('找不到项目根目录');
}

const ROOT = findRoot(__dirname);
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');
let failed = 0;
const ok = (cond: boolean, msg: string) => {
  if (cond) console.log('✓', msg);
  else { console.error('✗', msg); failed++; }
};

const skill = read('SKILL.md');
const novice = read('prompts/novice-mode.md');
const modeB = read('prompts/output-mode-B.md');
const bazi = read('prompts/bazi-prompt.md');
const poster = read('prompts/bazi-poster.md');
const review = read('prompts/bazi-poster-review.md');

const openingQuestion = '通俗易懂的结果';
for (const [name, body] of [['SKILL', skill], ['novice-mode', novice]])
  ok(body.includes(openingQuestion) && body.includes('专业细节更完整的详解'), `${name}:开场阅读方式二选一存在`);

for (const [name, body] of [['output-mode-B', modeB], ['bazi-prompt', bazi]]) {
  ok(body.includes('不是 11 章完整详解') && body.includes('章节正文尚未生成'), `${name}:明确总览≠11章全文`);
  ok(body.includes('总领速览') && body.includes('11 章展开入口'), `${name}:总览/目录状态分开`);
  ok(body.includes('海报：已生成') && body.includes('对话详解：当前已生成总领速览'), `${name}:两种都要时分别报告交付状态`);
  ok(body.includes('有疑惑') && body.includes('原句'), `${name}:聊天内给出直接提问指引`);
}

for (const tpl of ['report-bazi-poster.html', 'report-zonghe-poster.html', 'report-ziwei-poster.html', 'report-mbti-poster.html']) {
  const body = read(`templates/${tpl}`);
  ok(body.includes('直接把海报内容发给 AI 问'), `${tpl}:海报含继续问AI指引`);
}

const baziTpl = read('templates/report-bazi-poster.html');
ok(baziTpl.includes('逆风或体弱，不等于没有助力') && baziTpl.includes('{{timeline.0.growth}}') && baziTpl.includes('{{timeline.4.growth}}'), '八字海报:逆风/体弱助长说明与五节点占位齐全');
ok(poster.includes('growth 每项必填') && review.includes('逆风/体弱节点不得空缺'), '提示词/评审:每个时间节点强制助长焦点');

for (const [name, body] of [['bazi-prompt', bazi], ['bazi-poster', poster], ['bazi-poster-review', review]]) {
  ok(body.includes('成熟') && body.includes('细腻') && body.includes('平等同频'), `${name}:三类关系气质映射齐全`);
  ok(!body.includes('年龄词必须照抄'), `${name}:已移除实际年龄硬锁`);
}

if (failed) {
  console.error(`\nUX 契约 ${failed} 处失败`);
  process.exit(1);
}
console.log('\n✅ UX 契约全部通过（开场/详解状态/AI指引/运势助长/关系气质）');

// test-ux-contract.ts — Codex 对话与海报使用指引回归
// ---------------------------------------------------------------------------
// 1) 开场仍先分阅读深度；2) 功能询问强烈推荐先聊天、海报后置；
// 3) 注意事项与首轮总览高度精简，正文用加粗要点+短段落；
// 4) 八字海报先四柱本体核心条，再以八项人生坐标逐项映射 01~08，完整盘面/十神后置；
// 5) 八卡同规格、标题层级高于正文、长叙事自动分段；
// 6) 聊天与四类海报都告诉用户可直接问 AI；7) 逆风/体弱仍标助长。
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
const disclaimer = read('prompts/disclaimer-preamble.md');
const poster = read('prompts/bazi-poster.md');
const review = read('prompts/bazi-poster-review.md');
const baziTpl = read('templates/report-bazi-poster.html');
const visualSystem = read('references/bazi-poster-visual-system.md');

for (const [name, body] of [['SKILL', skill], ['novice-mode', novice]])
  ok(body.includes('通俗易懂的结果') && body.includes('专业细节更完整的详解'), `${name}:开场阅读方式二选一存在`);

ok(skill.includes('强烈推荐先和 AI 聊一轮详细分析，再考虑海报') && skill.includes('两种都要，分两步完成'), 'SKILL:功能询问强推荐先聊后海报');
ok(novice.includes('更推荐先和我聊一轮详细分析') && novice.includes('不把推荐变成阻断门'), 'novice-mode:小白海报路径有推荐但尊重选择');

ok(disclaimer.includes('命盘是镜子，不是判决书') && disclaimer.includes('方向盘始终在你手里'), 'disclaimer:保留成长心态核心');
ok(!disclaimer.includes('确认偏误') && !disclaimer.includes('自我实现') && disclaimer.length < 650, 'disclaimer:移除长篇心理原理与编号清单');

for (const [name, body] of [['output-mode-B', modeB], ['bazi-prompt', bazi]]) {
  ok(body.includes('四个核心结论') && body.includes('你的底色') && body.includes('最强长板') && body.includes('最该留意') && body.includes('眼下阶段'), `${name}:首轮直接进入四句本人解读`);
  ok(body.includes('章节正文尚未生成') && body.includes('继续深聊'), `${name}:极简总览与深聊入口状态清楚`);
  ok(body.includes('加粗要点') && body.includes('bullet list'), `${name}:下钻采用加粗小段落并减少项目符号`);
  ok(body.includes('做成海报') && body.includes('先聊清重点'), `${name}:详解+海报默认分两步`);
  ok(body.includes('有疑惑') && body.includes('原句'), `${name}:聊天内给出直接提问指引`);
}

for (const tpl of ['report-bazi-poster.html', 'report-zonghe-poster.html', 'report-ziwei-poster.html', 'report-mbti-poster.html']) {
  const body = read(`templates/${tpl}`);
  ok(body.includes('直接把海报内容发给 AI 问'), `${tpl}:海报含继续问AI指引`);
}

const idxOverview = baziTpl.indexOf('{{overview.block_html}}');
const idxGuide = baziTpl.indexOf('class="reader-guide"');
const idxReality = baziTpl.indexOf('{{interp.personality_html}}');
const idxEvidence = baziTpl.indexOf('class="evidence-divider"');
const idxPillars = baziTpl.indexOf('{{bazi.year.gan}}');
const idxTenGods = baziTpl.indexOf('{{tg.plain_html}}');
ok(idxOverview >= 0 && idxOverview < idxGuide && idxGuide < idxReality && idxReality < idxEvidence && idxEvidence < idxPillars && idxPillars < idxTenGods && baziTpl.includes('.overview-bazi-core') && baziTpl.includes('.bazi-core-pillar.is-day'), '八字海报:四柱核心与八项坐标→现实维度→专业依据→四柱详表/十神顺序正确');
ok([1,2,3,4,5,6,7,8].every(n => baziTpl.includes(`id="section-${String(n).padStart(2, '0')}"`)), '八字海报:正文 01~08 均有唯一坐标锚点');
ok(baziTpl.includes('未来几年怎么走') && baziTpl.includes('{{yunsui.cards_html}}') && baziTpl.includes('没有列出的年份不代表不好') && baziTpl.indexOf('{{yunsui.cards_html}}') < baziTpl.indexOf('class="timing-evidence"') && baziTpl.includes('{{yunsui.rows_html}}'), '八字海报:06 先给白话年份卡，专业运岁明细后置折叠');
ok(['tone-personality','tone-career','tone-relationship','tone-wellbeing','tone-change','tone-timing','tone-milestones','tone-action'].every(t => baziTpl.includes(t)), '八字海报:八项现实维度有稳定独立色系');
ok(baziTpl.includes('.overview-grid') && !baziTpl.includes('.overview-primary') && !baziTpl.includes('.overview-secondary') && baziTpl.includes('grid-auto-rows: 1fr'), '八字海报:01~08 总领卡共用单一等轨网格，无 05~08 缩小分支');
ok(baziTpl.includes('--type-body: 12.5px') && baziTpl.includes('--type-title-card: 14.5px') && baziTpl.includes('--type-title-panel: 14px') && baziTpl.includes('--type-title-section: 18px') && baziTpl.includes('font-weight: var(--weight-title)') && baziTpl.includes('.narrative-paragraph + .narrative-paragraph'), '八字海报:标题大于正文的字级令牌与段落呼吸存在');
ok(baziTpl.includes('data-watermark') && baziTpl.includes('.section::after') && baziTpl.includes('data-day-element="{{bazi.day.gan_wx}}"') && ['木','火','土','金','水'].every(wx => baziTpl.includes(`data-day-element="${wx}"`)) && baziTpl.includes('stroke-opacity'), '八字海报:日主五行清浅主题、浅水纹与大字水印令牌齐全');
ok(!baziTpl.includes('rgba(236,242,240,.88)') && !baziTpl.includes('rgba(220,229,227,.18)') && baziTpl.includes('rgba(var(--theme-wash-rgb),.58)'), '八字海报:总领大面积底色随日主主题切换，不再被固定青绿覆盖');
ok(poster.includes('"overview"') && poster.includes('"change"') && poster.includes('"timing"') && poster.includes('"milestones"') && poster.includes('"action"') && poster.includes('八字本体核心条') && review.includes('四柱核心条') && review.includes('八项人生坐标'), '提示词/评审:四柱本体与八项坐标质量门齐全');
ok(visualSystem.includes('## 八字本体核心条') && visualSystem.includes('| 01 | 性格与天赋') && visualSystem.includes('| 06 | 未来几年怎么走') && visualSystem.includes('| 08 | 日常可执行建议') && visualSystem.includes('同一编号、标题、色系和水印字') && visualSystem.includes('最多 4 张白话年份卡'), '视觉系统:四柱身份锚点、八项映射与06渐进披露均有文档事实源');
ok(poster.includes('最多 4 张白话年份卡') && poster.includes('最多3个关键节点') && review.includes('超过3个时间节点=FAIL'), '提示词/评审:06 主段数量与白话层级门禁齐全');
ok(poster.includes('每 2~3 句完成一个微主题') && poster.includes('渲染层会在不拆坏高亮标签') && review.includes('每 2~3 句须完成一个微主题') && skill.includes('渲染层会保护内联高亮并自动生成语义段落'), '提示词/评审/SKILL:长叙事按微主题组织并由渲染层安全分段');
ok(visualSystem.includes('八张卡必须放在同一个等轨网格') && visualSystem.includes('标题都必须同时比相邻正文更大、更粗') && visualSystem.includes('每 2~3 句形成一个视觉段落'), '视觉系统:八卡同规格、标题层级与正文段落节奏有单一事实说明');
ok(baziTpl.includes('逆风或体弱，不等于没有助力') && baziTpl.includes('{{timeline.0.growth}}') && baziTpl.includes('{{timeline.4.growth}}'), '八字海报:逆风/体弱助长说明与五节点占位齐全');
ok(poster.includes('growth 每项必填') && review.includes('逆风/体弱节点不得空缺'), '提示词/评审:每个时间节点强制助长焦点');

for (const [name, body] of [['bazi-prompt', bazi], ['bazi-poster', poster], ['bazi-poster-review', review]]) {
  ok(body.includes('成熟') && body.includes('细腻') && body.includes('平等同频'), `${name}:三类关系气质映射齐全`);
  ok(!body.includes('年龄词必须照抄'), `${name}:未恢复实际年龄硬锁`);
}

if (failed) {
  console.error(`\nUX 契约 ${failed} 处失败`);
  process.exit(1);
}
console.log('\n✅ UX 契约全部通过（极简开场/先聊后海报/四柱核心与八项等规格坐标/标题层级/语义分段/日主五行清浅主题/AI指引）');

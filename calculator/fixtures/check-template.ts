// check-template.ts — 海报模板完整性校验(BUG-1 防复发)
// 校验:以</html>结尾、div/section 开闭平衡、关键占位符齐全。任一失败 exit 1。
import * as fs from 'fs'; import * as path from 'path';

const tplDir = path.join(__dirname, '..', '..', 'templates');
let failed = 0;
function check(file: string, requiredKeys: string[]) {
  const p = path.join(tplDir, file);
  const c = fs.readFileSync(p, 'utf-8');
  const errs: string[] = [];
  if (!c.trimEnd().endsWith('</html>')) errs.push('不以</html>结尾');
  const cnt = (re: RegExp) => (c.match(re) || []).length;
  const dOpen = cnt(/<div\b/g), dClose = cnt(/<\/div>/g);
  const sOpen = cnt(/<section\b/g), sClose = cnt(/<\/section>/g);
  if (dOpen !== dClose) errs.push(`div ${dOpen}/${dClose} 不平衡`);
  if (sOpen !== sClose) errs.push(`section ${sOpen}/${sClose} 不平衡`);
  for (const k of requiredKeys) if (!c.includes(k)) errs.push(`缺 ${k}`);
  // v4.0 项目身份：成品只展示当前项目与作者；历史来源集中放在 NOTICE/LICENSE，
  // 不再让“魔改版/原作者模板”措辞覆盖现行产品的原创主叙事。
  for (const k of ['Bazi-Ziwei-Decoder', 'Hyperionjust']) if (!c.includes(k)) errs.push(`缺项目署名 ${k}`);
  for (const legacy of ['本魔改版', '原作者 dzcmemory', '海报模板借用自', '海报模板风格延续自'])
    if (c.includes(legacy)) errs.push(`残留旧身份措辞 ${legacy}`);
  if (errs.length) { console.log(`✗ ${file}:`, errs.join('; ')); failed++; }
  else console.log(`✓ ${file} (div ${dOpen}/${dClose}, section ${sOpen}/${sClose}, </html> ✓)`);
}
check('report-bazi-poster.html', [
  'footer-disclaim', '{{meta.name}}', '{{kaiyun.ye}}', '{{kaiyun.tiaohou_html}}', '{{kaiyun.note_html}}',
  '{{kaiyun.place_html}}', '{{kaiyun.item_html}}', '{{kaiyun.skill_html}}',
  '{{hechong.rows_html}}', '{{yunsui.cards_html}}', '{{yunsui.rows_html}}', '{{shensha.reading_html}}', '{{meta.taiyuan}}', '{{meta.minggong}}',
  // 小白阅读入口 + 中式纹样 + 正向信息视觉令牌不可回退。
  'reader-guide', '沿编号展开', '{{overview.block_html}}', 'at-a-glance', 'overview-bazi-core', 'bazi-core-pillars', '.bazi-core-pillar.is-day', '四柱命盘详表', 'overview-grid', 'coordinate-card', 'data-watermark', 'evidence-divider', '专业依据',
  'id="section-01"', 'id="section-08"', '未来几年怎么走', 'timing-signal-grid', 'timing-evidence', 'tone-personality', 'tone-career', 'tone-relationship', 'tone-wellbeing', 'tone-change', 'tone-timing', 'tone-milestones', 'tone-action',
  'data-day-element="{{bazi.day.gan_wx}}"', '.report[data-day-element="木"]', '.report[data-day-element="火"]', '.report[data-day-element="土"]', '.report[data-day-element="金"]', '.report[data-day-element="水"]',
  '--theme-primary', '--jade-deep', '--type-body', '--type-title-card', '--type-title-panel', '--type-title-section', '.section h2::after', '.section::after', '.narrative-paragraph', '.hl-good', 'font-weight: 900',
  // v3.14 五项算法所有块：整块/内联占位符必须由模板预留，空值由 render 注入 ''，不留空卡片。
  '{{algo.classics_html}}', '{{algo.insights_html}}', '{{algo.month_flow_html}}',
  // 条件式罕见现象整块：算法列事实，LLM 讲现实含义；无罕象时整块空字符串。
  '{{rare.block_html}}', 'rare-phenomena', '罕见现象',
  '{{timeline.0.trigger_html}}', '{{timeline.4.trigger_html}}',
  '{{timeline.0.growth}}', '{{timeline.4.growth}}', 'luck-growth-guide', '逆风或体弱，不等于没有助力', '直接把海报内容发给 AI 问',
  '{{dayun.0.state_html}}', '{{dayun.9.state_html}}', '{{liunian.0.state_html}}', '{{liunian.9.state_html}}',
]);
check('report-zonghe-poster.html', ['reader-guide', '小白这样看', '--jade-deep', '.hl-good', 'font-weight: 900', '直接把海报内容发给 AI 问']);
check('report-ziwei-poster.html', [
  'footer-disclaim', '{{meta.name}}', '{{meta.archetype_name}}', '{{meta.axis_oneliner}}',
  '{{ziwei.ming_zhu}}', '{{ziwei.shen_zhu}}', '{{ziwei.wuxing_ju}}',
  '{{gongs.子.mainStarsHtml}}', '{{gongs.子.shenBadge}}', '{{gongs.子.flag}}', '{{gongs.子.daxian_range}}',
  '{{z.axis_html}}', '{{z.mingshen_html}}', '{{z.career_html}}', '{{z.wealth_html}}',
  '{{z.marriage_html}}', '{{z.health_html}}', '{{z.daxian_html}}', '{{z.liunian_html}}', '{{z.advice_html}}',
  '{{mbti.char_svg}}', 'reader-guide', '小白这样看', '--jade-deep', '.hl-good', 'font-weight: 900', '直接把海报内容发给 AI 问',
]);
check('report-mbti-poster.html', [
  'footer-disclaim', '{{meta.name}}', '{{meta.gender}}', '{{meta.solar_date}}',
  '{{mbti.type}}', '{{mbti.alt}}', '{{mbti.alt2}}', '{{mbti.conf}}', '{{mbti.dom}}', '{{mbti.aux}}',
  '{{mbti.dm_label}}', '{{mbti.tagline}}', '{{mbti.bars_rows_html}}', '{{mbti.char_svg}}', '{{mbti.diff_section_html}}',
  '{{m.overview_html}}', '{{m.sanguan_html}}', '{{m.friends_html}}', '{{m.love_html}}',
  '{{m.work_html}}', '{{m.family_html}}', '{{m.hobbies_html}}',
  '{{bazi.year.gan}}', '{{bazi.year.gan_wx}}', '{{bazi.day.gan}}', '{{bazi.day.zhi_wx}}',
  'reader-guide', '小白这样看', '--jade-deep', '.hl-good', 'font-weight:900', '直接把海报内容发给 AI 问',
]);
process.exit(failed ? 1 : 0);

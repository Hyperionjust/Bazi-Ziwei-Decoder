// test-poster-v2.ts — v3.14 八字海报 v2 确定性区块与兼容矩阵
// ---------------------------------------------------------------------------
// 五项新区块都由 chart.json 所有；本测试只通过正式 CLI 渲染，不导入 render.ts 私有函数，
// 从而同时锁住 chart→flat→模板替换的真实数据流。测试产物写系统临时目录，不污染仓库。
// ---------------------------------------------------------------------------
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';

function findRoot(start: string): string {
  let d = start;
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(d, 'SKILL.md'))) return d;
    d = path.dirname(d);
  }
  throw new Error('找不到项目根目录');
}

const ROOT = findRoot(__dirname);
const CALC = path.join(ROOT, 'calculator');
const EX = path.join(ROOT, 'examples');
const TEMPLATE = path.join(ROOT, 'templates', 'report-bazi-poster.html');
const TSX = path.join(CALC, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SOURCE_RENDER = path.join(CALC, 'render.ts');
const DIST_RENDER = path.join(CALC, 'dist-bundle', 'render.js');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'bazi-poster-v2-'));
const read = (p: string) => JSON.parse(fs.readFileSync(p, 'utf-8'));
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const baseChart = read(path.join(EX, 'sample-chart.json'));
const baseAnalysis = read(path.join(EX, 'sample-analysis-bazi.json'));

let failed = 0;
const ok = (cond: boolean, msg: string) => {
  if (cond) console.log('✓', msg);
  else { console.error('✗', msg); failed++; }
};
const count = (s: string, needle: string) => s.split(needle).length - 1;

interface RenderResult { html: string; stderr: string; status: number | null; }
function render(name: string, chart: any, analysis: any | undefined, currentYear: number | undefined, dist = false): RenderResult {
  const chartPath = path.join(TMP, `${name}.chart.json`);
  const analysisPath = path.join(TMP, `${name}.analysis.json`);
  const outputPath = path.join(TMP, `${name}.${dist ? 'dist' : 'src'}.html`);
  fs.writeFileSync(chartPath, JSON.stringify(chart), 'utf-8');
  if (analysis !== undefined) fs.writeFileSync(analysisPath, JSON.stringify(analysis), 'utf-8');
  const entry = dist ? DIST_RENDER : SOURCE_RENDER;
  const args = dist ? [entry] : [TSX, entry];
  args.push(`--chart=${chartPath}`, `--template=${TEMPLATE}`, `--output=${outputPath}`, '--mode=bazi');
  if (analysis !== undefined) args.push(`--analysis=${analysisPath}`);
  if (currentYear !== undefined) args.push(`--currentYear=${currentYear}`);
  const p = spawnSync(process.execPath, args, { cwd: CALC, encoding: 'utf-8' });
  return {
    html: fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf-8') : '',
    stderr: p.stderr || '',
    status: p.status,
  };
}

function noRenderDebris(html: string): boolean {
  return !/\{\{[^{}]+\}\}/.test(html)
    && !/>\s*(?:undefined|null)\s*</i.test(html)
    && !/<(section|div)[^>]+class="[^"]*(?:algo-card|month-flow|rare-phenomena)[^"]*"[^>]*>\s*<\/\1>/.test(html);
}

// 1) 2000 随包样例：典出、12 月条、护体档与独立罕象块出现；无裁决时看点隐藏。
const base = render('base', baseChart, baseAnalysis, 2026);
ok(base.status === 0, '2000 随包样例可渲染');
ok(count(base.html, '<section class="algo-card classics-card') === 1, '典出正例：恰一块');
ok(count(base.html, '<li><span class="classic-name">') === 3, '典出数量上限：原序最多三条');
ok(count(base.html, '<section class="algo-card insights-card') === 0, '核心看点反例：无来源整块隐藏');
ok(count(base.html, '<section class="month-flow">') === 1 && count(base.html, '<div class="month-cell ') === 12, '流月条正例：恰 12 月');
ok(count(base.html, '<span class="state-pair">') === 19, '护体档正例：9 步大运 + 10 个流年各至多一枚');
ok(count(base.html, '<section class="section rare-phenomena">') === 1 && count(base.html, '<div class="rare-item">') === 2, '罕见现象正例：算法两项事实 + 独立现实解读恰一块');
ok(base.html.includes('德秀满盘') && base.html.includes('原局伏吟') && base.html.includes('偏正向') && base.html.includes('两面性'), '罕象块同时展示算法名称与好坏/现实判断');
ok(noRenderDebris(base.html), '基准海报无残留占位符/undefined/null/空算法块');

// 2) 双看点 + 三条典出极限态，并锁 HTML 转义与固定白话（不露施工字段名）。
const insightChart = clone(baseChart);
const enI = insightChart.bazi.enrichment;
enI.调候条例.命中[0].显示名 = '<img src=x onerror=alert(1)>';
enI.调候条例.命中[0].意象 = '<script>alert(1)</script>这是一段超过安全边界但仍须保持原文次序的意象说明文字';
enI.用神建议.出口.相神裁决 = { 格局相神: ['火'], 改法: '伤食重佩印', 重神: '伤食' };
enI.用神建议.出口.轴冲突 = { 五行: ['金'] };
const insight = render('insights', insightChart, baseAnalysis, 2026);
const insightBlock = insight.html.match(/<section class="algo-card insights-card[\s\S]*?<\/section>/)?.[0] || '';
const classicBlock = insight.html.match(/<section class="algo-card classics-card[\s\S]*?<\/section>/)?.[0] || '';
ok(insight.status === 0 && count(insightBlock, '<div class="insight-badge">') === 2, '核心看点正例：双来源恰两枚徽章');
ok(!/相神裁决|轴冲突|扶抑忌/.test(insightBlock), '核心看点只出固定白话，不露施工词');
ok(classicBlock.includes('&lt;img src=x onerror=alert(1)&gt;') && classicBlock.includes('&lt;script&gt;') && !classicBlock.includes('<script>'), 'chart 文本统一 HTML 转义');

// 3) 引爆窗口：timeline 与所选 lineage 关系视图同源；重复同年仍只出一个节点图标。
const triggerChart = clone(baseChart);
const enT = triggerChart.bazi.enrichment;
const mkTrigger = (year: number, type: string) => ({
  id: type, type, members: ['申', '辰'], pillars: ['年', '日'], distance: 2, status: '虚拱', cause: '差一字成局',
  引爆窗口: { 待: ['子'], 方式: '填实', 应期: [{ 年: year, 载体: `流年${year}` }, { 年: year, 载体: `大运${year}` }] },
});
enT.作用关系.items = [mkTrigger(2038, 'open窗口')];
enT.作用关系.lineage = { name: '测试流派', items: [mkTrigger(2028, '流派窗口')] };
const trigger = render('trigger-lineage', triggerChart, baseAnalysis, 2026);
ok(count(trigger.html, '<span class="tl-trigger"') === 1 && /2028[\s\S]*tl-trigger/.test(trigger.html), '⏳正例：同年重复应期合并为一个现有节点图标');
ok(trigger.html.includes('流派窗口') && !trigger.html.includes('open窗口'), '关系表与 ⏳ 共同读取 lineage 视图');
ok(count(trigger.html, '<span class="hc-trigger"') === 1, '关系区保留一条引爆详情');
delete enT.作用关系.lineage;
const triggerOpen = render('trigger-open', triggerChart, baseAnalysis, 2026);
ok(triggerOpen.html.includes('open窗口') && !triggerOpen.html.includes('流派窗口'), '无 lineage 时关系表与 ⏳ 一同回退 open items');

// 4) 年份错配/缺字段/非法体档：条件块隐藏且 warning 只出一次。
const mismatch = render('month-mismatch', baseChart, baseAnalysis, 2027);
ok(count(mismatch.html, '<section class="month-flow">') === 0, '流月条反例：chart 年份与 currentYear 不同则隐藏');
ok(count(mismatch.stderr, '[render][warn] 流月风向条已隐藏') === 1, '流月年份错配只告警一次');
const invalidGradeChart = clone(baseChart);
for (const x of invalidGradeChart.bazi.enrichment.运岁引动.顺逆.大运) x.体档 = '剧动';
for (const x of invalidGradeChart.bazi.enrichment.运岁引动.顺逆.流年) delete x.体档;
const invalidGrade = render('invalid-grade', invalidGradeChart, baseAnalysis, 2026);
ok(count(invalidGrade.html, '<span class="state-pair">') === 0, '护体档反例：缺失或非法值保持 v1 单轴布局');

// 5) 无 --currentYear：按运行年份匹配；旧 chart + 旧 analysis/无 analysis 均不崩且无空 wrapper。
const autoYearChart = clone(baseChart);
autoYearChart.bazi.enrichment.流月引动.年 = new Date().getFullYear();
const autoYear = render('auto-year', autoYearChart, baseAnalysis, undefined);
ok(autoYear.status === 0 && count(autoYear.html, '<section class="month-flow">') === 1, '省略 --currentYear 时按运行年份显示流月条');

const oldChart = clone(baseChart);
const enOld = oldChart.bazi.enrichment;
delete enOld.调候条例;
delete enOld.流月引动;
delete enOld.运岁引动.顺逆;
delete enOld.作用关系.lineage;
for (const item of (enOld.作用关系.items || [])) delete item.引爆窗口;
  delete enOld.用神建议.出口.相神裁决;
  delete enOld.用神建议.出口.轴冲突;
  delete enOld.罕象;
const oldWithAnalysis = render('old-with-analysis', oldChart, baseAnalysis, 2026);
const oldWithoutAnalysis = render('old-without-analysis', oldChart, undefined, 2026);
for (const [label, result] of [['旧 analysis', oldWithAnalysis], ['无 analysis', oldWithoutAnalysis]] as const) {
  ok(result.status === 0, `${label} + 旧 chart + 新模板可渲染`);
  ok(!/<section class="(?:algo-card|month-flow)|<section class="section rare-phenomena/.test(result.html) && !/<span class="(?:state-pair|tl-trigger|hc-trigger)"/.test(result.html), `${label} 缺新字段时算法可选 DOM 与罕象块全隐藏`);
  ok(noRenderDebris(result.html), `${label} 兼容输出无渲染残渣`);
}

// 6) 源码与 dist-bundle 必须同输出（仅归一化跨分钟生成时间）。
if (fs.existsSync(DIST_RENDER)) {
  const dist = render('base-dist', baseChart, baseAnalysis, 2026, true);
  const normalize = (html: string) => html.replace(/生成时间：<span class="num">[^<]*<\/span>/, '生成时间：<span class="num">#</span>');
  ok(dist.status === 0 && normalize(dist.html) === normalize(base.html), 'render.ts 与 dist-bundle/render.js 输出逐字一致');
} else {
  ok(false, '缺 dist-bundle/render.js，须先运行 bundle');
}

if (failed) {
  console.error(`\n八字海报 v2 门禁 ${failed} 处失败；临时产物：${TMP}`);
  process.exit(1);
}
console.log('✅ 八字海报 v2 全部通过（五项出现/隐藏 + 年份 + 流派同源 + 新旧兼容 + source/dist）');

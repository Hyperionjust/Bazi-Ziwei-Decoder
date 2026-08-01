// run-calibration.ts — 校准回测 runner 骨架(P2)
// ---------------------------------------------------------------------------
// 读本目录 *.case.json(已证实生平命例, 不入库) → 算法层排盘 → 输出待人工评分的
// Markdown 对照表(算法判定 | 命例事实 | 评分空列)。只搭架子: 不代打分、不写库。
// 用法: npx tsx run-calibration.ts [--output=calibration-report.md]
// ---------------------------------------------------------------------------
import * as fs from 'fs';
import * as path from 'path';
import { createChart } from '../../yiqi-core/index';
import { enrichOpen as enrichBazi } from '../support/open-policy';
import { analyzeYunSui } from '../../bazi-enrich/yunsui';
import { judgeSpouseProfile } from '../../bazi-enrich/zhengyuan';

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  for (const a of process.argv.slice(2)) { const m = a.match(/^--([^=]+)=(.*)$/); if (m) args[m[1]] = m[2]; }
  return args;
}

const here = __dirname;
const caseFiles = fs.readdirSync(here).filter(f => f.endsWith('.case.json'));
if (!caseFiles.length) {
  console.log('未发现命例文件(*.case.json)。复制 case-template.json 为 <代号>.case.json 填写后重跑;命例含真实生辰,不入库。');
  process.exit(0);
}

const lines: string[] = ['# 校准回测对照表(待人工评分)', '', `> 生成口径: 算法层确定性输出 vs 命例已证实事实;评分列由人工填 0/0.5/1。`, ''];

for (const f of caseFiles) {
  let c: any;
  try { c = JSON.parse(fs.readFileSync(path.join(here, f), 'utf-8')); }
  catch (e) { console.error(`[skip] ${f}: JSON 解析失败 ${(e as Error).message}`); continue; }
  const b = c.birth || {};
  let chart: any;
  try { chart = createChart({ ...b, isLunar: !!b.isLunar, timeZone: b.timeZone ?? 8 }); }
  catch (e) { console.error(`[skip] ${f}: 排盘失败 ${(e as Error).message}`); continue; }

  const siZhu: any = { 年: chart.bazi.siZhu.year, 月: chart.bazi.siZhu.month, 日: chart.bazi.siZhu.day, 时: chart.bazi.siZhu.hour };
  const en: any = enrichBazi(siZhu);
  const ys = analyzeYunSui(siZhu, chart.bazi.dayun || [], new Date().getFullYear());
  const zy = judgeSpouseProfile(siZhu, b.gender);
  const events: any[] = c.events || [];
  const nodeYears = new Set((ys.建议节点 || []).map((n: any) => n.年));
  const hitOf = (y: number) => nodeYears.has(y) ? '命中' : (nodeYears.has(y - 1) || nodeYears.has(y + 1)) ? '±1年' : '未中';

  lines.push(`## 命例 ${c.id || f}`);
  lines.push('');
  lines.push(`四柱: ${['year', 'month', 'day', 'hour'].map(k => chart.bazi.siZhu[k].gan + chart.bazi.siZhu[k].zhi).join(' ')} · 时辰来源: ${b.time_source || '未注明'}`);
  lines.push('');
  lines.push('| 模块 | 算法判定 | 命例事实 | 评分(人工) |');
  lines.push('|---|---|---|---|');
  const ck = en.用神建议?.出口;
  lines.push(`| 用神 | 开运[${(ck?.开运用神 || []).join('')}] 喜[${(ck?.喜神 || []).join('')}] 忌[${(ck?.忌神 || []).join('') || '无'}] | ${c.facts?.yongshen || '(未填)'} | |`);
  const evStr = events.map(e => `${e.year}${e.type}→${hitOf(e.year)}`).join('; ') || '(未填事件)';
  lines.push(`| 大运应期 | 建议节点: ${(ys.建议节点 || []).map((n: any) => `${n.年}[${n.权重}]`).join(' ')} | ${evStr} | |`);
  lines.push(`| 婚恋画像 | ${zy.年龄倾向}(置信${zy.置信}) 宫坐${zy.宫坐} | ${c.facts?.marriage?.spouse_age_diff || '(未填)'} / ${c.facts?.marriage?.spouse_traits || ''} | |`);
  const tgKeys = ['year', 'month', 'hour'].map(k => chart.bazi.shiShen?.[k]).filter(Boolean).join('/');
  lines.push(`| 职业方向 | 透干十神: ${tgKeys || '-'} · 格局: ${en.格局?.primary || '-'} (映射库未建, 人工判) | ${c.facts?.career || '(未填)'} | |`);
  lines.push('');
}

const args = parseArgs();
const out = lines.join('\n');
if (args.output) { fs.writeFileSync(args.output, out, 'utf-8'); console.error(`对照表已写入 ${args.output}`); }
else process.stdout.write(out + '\n');

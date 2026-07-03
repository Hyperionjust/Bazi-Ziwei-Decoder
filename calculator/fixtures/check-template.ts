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
  if (errs.length) { console.log(`✗ ${file}:`, errs.join('; ')); failed++; }
  else console.log(`✓ ${file} (div ${dOpen}/${dClose}, section ${sOpen}/${sClose}, </html> ✓)`);
}
check('report-bazi-poster.html', [
  'footer-disclaim', '{{meta.name}}', '{{kaiyun.ye}}', '{{kaiyun.tiaohou_html}}', '{{kaiyun.note_html}}',
  '{{kaiyun.place_html}}', '{{kaiyun.item_html}}', '{{kaiyun.skill_html}}',
  '{{hechong.rows_html}}', '{{yunsui.rows_html}}', '{{shensha.reading_html}}', '{{meta.taiyuan}}', '{{meta.minggong}}',
]);
check('report-zonghe-poster.html', []);
process.exit(failed ? 1 : 0);

// test-tiaohou.ts — 调候 120 格结构校验 + 快照锁(v3.10.0)
// ---------------------------------------------------------------------------
// 【本测试不主张任何一格的权威取值。】
//   《穷通宝鉴》自《栏江网》→ 余春台辑本 → 徐乐吾评注本有多个文本系统,原文又是散文式论述
//   (「正月甲木,初春犹有余寒,得丙癸透…」),压成数组本身带编辑判断。在拿到可确证的底本之前,
//   逐格断言「原文就该是甲庚」是伪金标——写了只会把一次未经核对的抽取固化成"标准答案"。
//
// 所以这里只断言【不依赖版本也成立】的四类事实:
//   ① 结构完整性:120 格齐全、取干均为合法天干、无空
//   ② 快照锁:表体内容哈希。任何静默改动立即暴露——这是此前完全缺失的保护,
//      而 v3.5 的「丁日寅月误作庚壬」正是这类事故(无测试拦截,靠人工复盘才发现)。
//      有意改表时把新哈希填进 EXPECTED_HASH 即为「祝福」,改动因此必须显式。
//   ③ 寒暖燥湿宏观不变式:冬三月取火、夏三月取水(日主本身同气者豁免)。
//      任何版本都满足;能抓住整行错位、表转置、批量粘贴错这类粗错。
//      当前已知的两处例外锁成清单,清单变动才 FAIL——不预设它们是错。
//   ④ 接线一致性:getTiaoHou() 读的确实是这张表。
//
// 已核格(有出处引文的)单独 spot check;其余全部【待核】,见 tiaohou.json 校勘块。
// 校勘分两级:【底本】=有出版社/版次/页码的可确证版本;【佐证】=可交叉核对但达不到底本标准的
// 文献(如现代重排摘编本)。佐证级只能解除疑点,不能单独把底本状态推成「已确证」。
// ---------------------------------------------------------------------------
import * as crypto from 'crypto';
import { TIAO_HOU, GAN_WUXING, Tiangan, Dizhi } from '../bazi-enrich/tables';
import { getTiaoHou } from '../bazi-enrich/tiao-hou';
import TIAOHOU_DATA from '../tiaohou.json';

let failed = 0;
function ok(cond: boolean, msg: string) { if (cond) console.log('✓', msg); else { console.log('✗', msg); failed++; } }

const GANS: Tiangan[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHIS: Dizhi[] = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
const 冬: Dizhi[] = ['亥', '子', '丑'];
const 夏: Dizhi[] = ['巳', '午', '未'];
const wx = (c: string) => (GAN_WUXING as any)[c] as string | undefined;

// ── ① 结构完整性 ──────────────────────────────────────────────────────────
{
  let cells = 0, bad = 0;
  for (const g of GANS) for (const z of ZHIS) {
    const v = TIAO_HOU[g]?.[z];
    cells++;
    if (!Array.isArray(v) || v.length === 0) { bad++; console.log(`    空格: ${g}/${z}`); continue; }
    for (const c of v) if (!wx(c)) { bad++; console.log(`    非法天干: ${g}/${z} = ${c}`); }
  }
  ok(cells === 120, `120 格齐全 (得到 ${cells})`);
  ok(bad === 0, `取干全部为合法天干、无空格 (异常 ${bad} 处)`);
}

// ── ② 快照锁 ──────────────────────────────────────────────────────────────
// 有意改表时把下面这行换成新哈希(测试失败信息里会打印),改动必须显式祝福。
const EXPECTED_HASH = 'cf9a93fb6353dbf5cc2b8c52623d5292';
{
  const canon = GANS.map(g => g + ':' + ZHIS.map(z => (TIAO_HOU[g][z] || []).join('')).join(',')).join('|');
  const hash = crypto.createHash('md5').update(canon, 'utf8').digest('hex');
  ok(hash === EXPECTED_HASH,
    `表体快照未被静默改动 (期望 ${EXPECTED_HASH} / 实际 ${hash})` +
    (hash !== EXPECTED_HASH ? `\n    ↑ 若是有意改表,把 EXPECTED_HASH 换成实际值即为祝福;并同步更新 tiaohou.json 的校勘块` : ''));
}

// ── ③ 寒暖燥湿宏观不变式(版本无关) ────────────────────────────────────────
// 冬三月取火 / 夏三月取水;日主自身即该五行者豁免(丙丁不必再取火、壬癸不必再取水)。
{
  const 冬缺火 = GANS.filter(g => wx(g) !== '火' &&
    冬.some(z => !(TIAO_HOU[g][z] || []).some(c => wx(c) === '火')));
  ok(冬缺火.length === 0, `冬三月一律取火(丙丁豁免) — 违例 ${JSON.stringify(冬缺火)}`);

  // 夏月两处例外,锁成清单:清单变动(多了/少了)才 FAIL。
  //   庚/未 已由佐证文献解除疑点(「土旺金顽,故先用丁火,次取甲木」——夏月不取水是有典据的);
  //   丁/巳 佐证文献未覆盖(该本 丁 行只有 寅/午/未 三月),仍待核。
  const KNOWN_SUMMER_EXCEPTIONS = ['丁/巳', '庚/未'];
  const 夏缺水: string[] = [];
  for (const g of GANS) {
    if (wx(g) === '水') continue;
    for (const z of 夏) if (!(TIAO_HOU[g][z] || []).some(c => wx(c) === '水')) 夏缺水.push(`${g}/${z}`);
  }
  ok(JSON.stringify(夏缺水.sort()) === JSON.stringify(KNOWN_SUMMER_EXCEPTIONS.slice().sort()),
    `夏三月取水的已知例外清单未变 (期望 ${JSON.stringify(KNOWN_SUMMER_EXCEPTIONS)} / 实际 ${JSON.stringify(夏缺水)})`);
}

// ── ④ 行内重复度(套总纲 vs 逐月取的判别指标;同样只锁清单) ─────────────────
{
  const KNOWN_LOW_VARIETY = ['丁', '戊', '己'];   // 12 格 ≤5 种取法
  const low = GANS.filter(g => new Set(ZHIS.map(z => (TIAO_HOU[g][z] || []).slice().sort().join(''))).size <= 5);
  ok(JSON.stringify(low) === JSON.stringify(KNOWN_LOW_VARIETY),
    `行内低重复度清单未变 (期望 ${JSON.stringify(KNOWN_LOW_VARIETY)} / 实际 ${JSON.stringify(low)})`);
}

// ── ⑤ 接线一致性 ─────────────────────────────────────────────────────────
{
  let mismatch = 0;
  for (const g of GANS) for (const z of ZHIS)
    if (getTiaoHou(g, z).join('') !== (TIAO_HOU[g][z] || []).join('')) mismatch++;
  ok(mismatch === 0, `getTiaoHou() 与表一致 (不一致 ${mismatch} 格)`);
  ok((TIAOHOU_DATA as any).取干?.甲?.寅?.join('') === TIAO_HOU['甲']['寅'].join(''),
    'tables.ts 读的就是 tiaohou.json(数据外置未断链)');
}

// ── ⑥ 已核格 spot check(唯一有出处引文的一格) ───────────────────────────
{
  const 已核 = (TIAOHOU_DATA as any).校勘?.已核 || {};
  const keys = Object.keys(已核);
  ok(keys.length >= 1, `校勘块至少有 1 格已核 (得到 ${keys.length} 格)`);
  for (const k of keys) {
    const [g, z] = k.split('/');
    const rec = 已核[k];
    ok((TIAO_HOU as any)[g][z].join('') === rec.取干.join(''),
      `已核格 ${k} = ${rec.取干.join('')} 与表一致(出处:${String(rec.出处).slice(0, 28)}…)`);
    ok(!!rec.原文 && !!rec.出处, `已核格 ${k} 带原文与出处`);
    ok(rec.级别 === '底本' || rec.级别 === '佐证',
      `已核格 ${k} 标了校勘级别(底本/佐证) — 得到 ${rec.级别}`);
  }
  // 佐证级不得单独把底本状态推成「已确证」:佐证只能解除疑点,不能定案
  const 佐证只 = keys.length > 0 && keys.every(k => 已核[k].级别 === '佐证');
  if (佐证只) ok((TIAOHOU_DATA as any).底本?.状态 === '未确证',
    '全部已核格都只有佐证级时,底本状态必须仍为「未确证」');
}

// ── ⑦ 底本状态如实标注(防止「待核」被悄悄改成「已核」而无引文) ───────────
{
  const 底本 = (TIAOHOU_DATA as any).底本 || {};
  const 疑点 = (TIAOHOU_DATA as any).校勘?.待核疑点 || [];
  ok(底本.状态 === '未确证' || 底本.状态 === '已确证', `底本状态字段合法 (得到 ${底本.状态})`);
  if (底本.状态 === '未确证')
    ok(疑点.length > 0, `底本未确证时须保留待核疑点清单 (得到 ${疑点.length} 条)`);
}

if (failed) { console.log(`\n${failed} 项失败`); process.exit(1); }
console.log('✅ 全部通过 (调候 120 格:结构 + 快照锁 + 寒暖不变式 + 接线;取值权威性未主张,全表待核)');

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
// 祝福记录:
//   cf9a93fb…(v3.10 外置时基线) → 8b9ce331…(v3.12 批C1,2026-07-31):取干次序修订 8 格,
//   全部为「表序与知砚斋主文次序不合」的实锤(批C 13 格逐格人工核,详见 tiaohou.json
//   校勘「批C取干次序专项」)——甲/辰[庚丁壬→庚壬丁](丁是金局条件用神,书「惟有先庚後壬」)、
//   甲/申[庚丁壬→丁庚壬](书两见「先丁後庚」「丁火为尊庚金次之」)、乙/未[癸丙→丙癸](六月
//   专条「丙火为尊」+总纲「先丙後癸」)、乙/酉[癸丁丙→癸丙丁](丁是金局条件用神后置)、
//   己/申+己/酉[丙癸→癸丙]+己/戌[甲丙癸→甲癸丙](段内两见「癸先丙後」「总之先癸後丙」)、
//   戊/戌[甲丙癸→甲癸丙](书「先看甲木,次取癸水…见金先用癸水,後取丙火」)。
//   取干五行【集合】八格均未变,只动次序——金标盘(韦例/毛/样例)出口零漂移已实测。
const EXPECTED_HASH = '8b9ce331af78048a624b0c1de85a8bcf';
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

// ═══════════════════════════════════════════════════════════════════════════
// 条例层(v3.11.0 · 造化元钥吸收 M1) —— 每格从「取干数组」升级为「条件树」
// ---------------------------------------------------------------------------
// 这里同样【不主张任何一条条例的权威性】。断言的是四类可机器验证的事实:
//   ⓐ 结构:已吸收的格字段齐全、id 唯一、档位合法、细化于指向存在
//   ⓑ 受控词表:每条「若」都能被求值器解析,且只用词表内谓词/参数
//      ——词表外的散文条件在这里直接 FAIL,这是「层1 机器可判」的守门人
//   ⓒ 层2 照录护栏:每条「则」必须是本格「原文」的连续子串(标点归一后)
//      ——防止典籍论断被悄悄改写成我们自己的话。这条最要紧:吸收 ≠ 转述
//   ⓓ 求值器行为:手工构造盘,断言该命中的命中、不该命中的不命中
//   ⓔ 快照锁:条例体哈希,静默改动立即暴露(与取干表同规格)
// ═══════════════════════════════════════════════════════════════════════════
import { evalTiaoLi, 校验全部条例, 谓词表, 成派阈值, 词表版本 } from '../bazi-enrich/tiaohou-tiaoli';
import { 采样命中, 算关系 } from './bless-tiaoli-relations';

const 条例块: any = (TIAOHOU_DATA as any).条例 || {};
const 格键 = Object.keys(条例块).filter(k => !k.startsWith('_'));

// ── ⓐ 结构 ────────────────────────────────────────────────────────────────
{
  const 甲行 = ZHIS.map(z => `甲/${z}`);
  ok(甲行.every(k => 条例块[k]), `M1 验收:甲木行 12 格条例齐全 (缺 ${甲行.filter(k => !条例块[k]).join('、') || '无'})`);
  ok((条例块._覆盖?.已吸收行 || []).includes('甲'), '_覆盖 如实登记已吸收行含「甲」');
  ok(条例块._词表?.版本 === 词表版本,
    `tiaohou.json._词表.版本 与求值器 词表版本 一致 (json=${条例块._词表?.版本} / ts=${词表版本})`);
  ok(Object.keys(条例块._词表?.谓词 || {}).sort().join(',') === Object.keys(谓词表).sort().join(','),
    '_词表.谓词 清单与求值器 谓词表 逐项对齐(改一处必改另一处)');
  ok(String(条例块._词表?.成派阈值?.定义 || '').includes(String(成派阈值.加权分)),
    `_词表 复述了成派阈值 ${成派阈值.加权分}(阈值是我方操作化定义,必须写在数据侧可见处)`);

  let 条数 = 0, 坏 = 0;
  for (const k of 格键) {
    const c = 条例块[k];
    for (const f of ['原文', '出处', '级别', '条例']) if (!c[f]) { console.log(`    ${k} 缺字段 ${f}`); 坏++; }
    if (!['底本', '佐证'].includes(c.级别)) { console.log(`    ${k} 级别非法: ${c.级别}`); 坏++; }
    // 条例块里顺手记的「取干」必须与取干表逐字一致 —— 两处记同一件事就会漂移,
    // 尤其条例是分批分人写的。不一致说明有人照着别的版本抄了。
    const [g, z] = k.split('/');
    if (c.取干 && (c.取干 as string[]).join('') !== (TIAO_HOU as any)[g][z].join('')) {
      console.log(`    ${k} 条例块的取干 ${(c.取干 as string[]).join('')} ≠ 取干表 ${(TIAO_HOU as any)[g][z].join('')}`); 坏++;
    }
    条数 += (c.条例 || []).length;
    for (const t of (c.条例 || [])) {
      if (!t.意象) { console.log(`    ${k}/${t.id} 缺「意象」(层3 的概念级素材,必填)`); 坏++; }
      if (t.意象 && t.意象 === t.则) { console.log(`    ${k}/${t.id} 意象与则雷同(意象须是概念素材不是论断复读)`); 坏++; }
      // 名必填:它是 J4「解读引用的条例名须在命中清单里」的句柄。缺名→只能拿「则」凑→防编造失效。
      if (!t.名) { console.log(`    ${k}/${t.id} 缺「名」(J4 防编造的句柄,必填)`); 坏++; }
    }
  }
  ok(坏 === 0, `已吸收格字段齐全、级别合法、意象非空且不等同于则 (异常 ${坏} 处)`);
  ok(条数 >= 100, `甲木行条例总数 ${条数} 条(每格从 2 个字扩成条件树,数量本身即吸收深度)`);
}

// ── ⓑ 受控词表(层1 守门人) ────────────────────────────────────────────────
{
  const errs = 校验全部条例();
  if (errs.length) errs.slice(0, 12).forEach(e => console.log(`    ${e}`));
  ok(errs.length === 0, `所有「若」均在受控词表内且可解析 (违例 ${errs.length} 条)`);
}

// ── ⓒ 层2 照录护栏:「则」必须是本格「原文」某一【连续片段】的子串 ────────────
// ⚠ 这道网能防什么、防不了什么,说清楚:
//   能防:抄进来之后「则」被改写成我们自己的话(改一个字就 FAIL)。
//   防不了:抄的时候就抄错——因为「则」只跟同一个 JSON 里手写的「原文」比,是自洽的循环。
//   后者靠的是【人工把 `原文` 逐段对素材原书】,不是靠本测试。M1 已对全部 110 条做过
//   与 素材/穷通宝鉴.pdf 文本层的逐条比对(109/110 逐字命中,唯一例外 甲/寅「得丙癸透」
//   是有影印本背书的校改,已在校勘块登记)。记录见 references/calibration.md。
//   ★ 归一化【不吃 ／】:／ 是 `原文` 的片段拼接标记(原书里这几段并不相邻)。若把它抹掉,
//     一条横跨两个不相邻片段的「引文」也会被判为连续——那是伪造引文。故按 ／ 切段后逐段比。
{
  const norm = (s: string) => s.replace(/[，。、；：！？「」（）()\s·]/g, '');
  const bad: string[] = [];
  for (const k of 格键) {
    const segs = String(条例块[k].原文 || '').split(/[／/]/).map(norm);
    for (const t of (条例块[k].条例 || [])) if (!segs.some(sg => sg.includes(norm(t.则)))) bad.push(`${k}/${t.id}`);
  }
  if (bad.length) bad.slice(0, 8).forEach(b => console.log(`    「则」非原文连续片段: ${b}`));
  ok(bad.length === 0,
    `每条「则」都落在「原文」的某一连续片段内(不跨 ／ 拼接边界)——典籍论断照录未被改写 (违例 ${bad.length} 条)`);
}

// ── ⓓ 求值器行为(手工盘,正例 + 反例都断言) ────────────────────────────────
{
  type P = { gan: any; zhi: any };
  const 盘 = (s: string): Record<string, P> => {
    const [y, m, d0, h] = s.split(' ');
    return { 年: { gan: y[0], zhi: y[1] }, 月: { gan: m[0], zhi: m[1] }, 日: { gan: d0[0], zhi: d0[1] }, 时: { gan: h[0], zhi: h[1] } };
  };
  // [盘, 说明, 必须命中的 id, 必须不命中的 id]
  const CASES: Array<[string, string, string[], string[]]> = [
    ['庚申 戊寅 甲子 丙寅', '藏癸(子)+透丙 → 寒木向阳;申子半合水+透戊 → 水局得堤;庚戊并透',
      ['甲寅-寒木向阳', '正二月-水局得戊', '正二月-庚戊上命'],
      ['甲寅-丙癸双透', '甲寅-无丙癸', '正二月-庚辛派']],
    ['丙寅 庚寅 甲子 癸酉', '丙癸皆透 → 双透;癸既透则非「癸藏」,寒木向阳须落空(非 透:癸 的守门)',
      ['甲寅-丙癸双透'], ['甲寅-寒木向阳', '甲寅-无丙癸']],
    ['辛酉 辛卯 甲申 庚午', '金加权 5 ≥3 且透 → 成派:庚辛;申酉半会金 → 会金局;藏戊为财',
      ['正二月-庚辛派', '正二月-庚辛派会金', '甲卯-阳刃驾杀', '甲卯-刃杀得财'],
      ['甲卯-癸困财杀']],
    ['庚申 甲午 甲子 辛未', '金加权恰 3.0 触阈 → 杀重身轻;子藏癸故「无癸」不成立',
      ['甲午-杀重身轻'], ['甲午-乏癸用丁', '甲午-癸庚两透', '甲午-先贫後富']],
    ['丁卯 丁丑 甲寅 丁卯', '透数:丁=3 且寅藏甲(比肩) → 比肩发丁;其反例条例须落空',
      ['甲丑-比肩发丁', '甲丑-无庚'], ['甲丑-丁重无比肩', '甲丑-庚透丁藏', '甲丑-支多见水']],
    ['壬子 壬子 甲辰 壬申', '申子辰三合水局 + 壬透 → 水泛木浮;壬重而无丁',
      ['甲子-水泛木浮', '甲子-壬重无丁', '甲子-透壬无丙'], ['甲子-得丙方妙', '甲子-庚丁支见巳寅']],
    ['乙未 庚辰 甲戌 戊辰', '未辰戌辰 四库成土局;比劫(乙)≥2 → 杂气夺财;干支字面无水且戊透 → 弃命从财',
      ['甲辰-杂气夺财', '甲辰-弃命从财'], ['甲辰-庚壬两透', '甲辰-金局用丁']],
  ];
  let 错 = 0;
  for (const [s, why, must, mustNot] of CASES) {
    const r = evalTiaoLi(盘(s) as any);
    const got = new Set(r.命中.map(h => h.id));
    for (const id of must) if (!got.has(id)) { console.log(`    ${s} 应命中却未中: ${id}  (${why})`); 错++; }
    for (const id of mustNot) if (got.has(id)) { console.log(`    ${s} 不应命中却中了: ${id}  (${why})`); 错++; }
  }
  ok(错 === 0, `求值器 ${CASES.length} 个手工盘的命中/落空断言全对 (违例 ${错} 处)`);

  // 病 字段:典籍明指之病,在盘与否须如实标
  const r子 = evalTiaoLi(盘('壬子 壬子 甲辰 壬申') as any);
  ok(r子.病.length === 1 && r子.病[0].字 === '癸' && r子.病[0].在盘 === true && r子.病[0].透 === false,
    `甲/子 的「病:癸」如实标注在盘/透藏 (得到 ${JSON.stringify(r子.病)})`);

  // 分批吸收期间这里断言的是「未吸收的格静默返回空壳」(随批次换日干:M1 乙 → M2 戊 → M3 辛)。
  // M4 十干吸收完毕,该断言失去对象,但**不能直接删** —— 那条空壳分支仍是活代码
  // (日后加流派镜片、换底本、或某格被撤下时都会走到)。故改为两条:
  //   ① 全表 120 格已覆盖(M4 的验收标准本身)
  //   ② 空壳分支仍然健在 —— 用一个不存在的格直接调求值器验,不靠「碰巧还没吸收」
  {
    const 缺 = GANS.flatMap(g => ZHIS.filter(z => !条例块[`${g}/${z}`]).map(z => `${g}/${z}`));
    ok(缺.length === 0, `M4 验收:全表 120 格条例齐全 (缺 ${缺.length} 格${缺.length ? ':' + 缺.slice(0, 6).join('、') : ''})`);
    const 空壳 = evalTiaoLi(盘('丙寅 庚寅 甲亥 癸未') as any, '甲' as any);
    ok(空壳.有条例 === true, '(对照)已吸收的格 有条例=true');
    const 假格 = evalTiaoLi({ 年: { gan: '丙', zhi: '寅' }, 月: { gan: '庚', zhi: '寅' }, 日: { gan: '甲', zhi: '亥' }, 时: { gan: '癸', zhi: '未' } } as any, '？' as any);
    ok(假格.有条例 === false && 假格.命中.length === 0,
      '未收录的格仍走静默空壳分支,不抛错也不虚构命中(该分支是活代码,不因全表吸收完而失效)');
  }
}

// ── ⓕ 可满足性审计:不许有「死条例」 ────────────────────────────────────────
// 为什么必须查:条例的「若」是对**本格**求值的,而月支的藏干是恒定的——
//   寅恒藏丙戊、辰恒藏癸、巳恒藏庚。若把典籍的「无丙」照字面写成全盘 无:丙,
//   在寅月这条**永远不可能命中**,变成一条谁也不知道已经死了的规则。
//   M1 首跑此审计即抓出 7 条(4 条月令藏干口径、1 条「柱中全无一水」、
//   1 条同上、1 条「丁壬癸戊四透」——四柱只有 4 个天干位,加日干甲字面就排不下)。
//   全部按「天干不透」重写并在 判定备注 里留痕。下批照此办理。
// 同一批月令藏干在【反方向】上还会造出「恒真条例」——申恒藏庚壬戊,写成 `有:壬 且 有:戊`
//   就是每张七月甲木盘都命中,原文的「须见戊土」一次也不会被检验。M1 首跑抓出 1 条(甲申-壬无碍见戊)。
//   两头都得堵,所以下面死条例与恒真条例一起查。
// 用固定种子的 PRNG,结果可复现;每格随机 4000 盘。
{
  const N = 4000;
  let seed = 20260729;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length) % a.length];
  const fired = new Map<string, number>();
  for (const k of 格键) for (const t of (条例块[k].条例 || [])) fired.set(`${k}/${t.id}`, 0);
  for (const k of 格键) {
    const [dm, mz] = k.split('/');
    for (let i = 0; i < N; i++) {
      const sz: any = {
        年: { gan: pick(GANS), zhi: pick(ZHIS) }, 月: { gan: pick(GANS), zhi: mz },
        日: { gan: dm, zhi: pick(ZHIS) }, 时: { gan: pick(GANS), zhi: pick(ZHIS) },
      };
      for (const h of evalTiaoLi(sz).命中) fired.set(`${k}/${h.id}`, (fired.get(`${k}/${h.id}`) || 0) + 1);
    }
  }
  const dead = [...fired].filter(([, n]) => n === 0).map(([k]) => k);
  if (dead.length) dead.forEach(k => console.log(`    死条例(${N} 随机盘无一命中): ${k}`));
  ok(dead.length === 0,
    `无死条例 —— 每条「若」在本格都至少能被某个盘满足 (死条例 ${dead.length} 条)`);

  const always = [...fired].filter(([, n]) => n === N).map(([k]) => k);
  if (always.length) always.forEach(k => console.log(`    恒真条例(${N} 随机盘全中,条件形同虚设): ${k}`));
  ok(always.length === 0,
    `无恒真条例 —— 没有哪条「若」在本格永远为真(那样典籍写的条件等于没判) (恒真 ${always.length} 条)`);

  // 偏离典籍字面的写法必须留痕:典籍原判里说「无X」、而「若」却用了「非 透:」(口径从
  //   全盘收窄到天干)的,必须写 判定备注 说明为什么。
  //   注:「非 透:」若只是互斥守门(如「癸藏丙透」须排除癸也透干)则不在此列——那不是口径调整。
  //   判据要精确到【是哪个字的「无」】:光看「则里有没有『无』」会把「丙藏衣禄无亏」这种
  //   误判成口径调整(那里的「无」在「无亏」上,不在「无丙」上)。
  const 无痕: string[] = [];
  for (const k of 格键) for (const t of (条例块[k].条例 || [])) {
    if (t.判定备注) continue;
    const 改判的干 = [...String(t.若).matchAll(/非\s*透:([一-龥])/g)].map(m => m[1]);
    const 说了无 = 改判的干.some(g => new RegExp(`无${g}|不见${g}`).test(t.则)) || /全无/.test(t.则);
    if (改判的干.length && 说了无) 无痕.push(`${k}/${t.id}`);
  }
  ok(无痕.length === 0,
    `凡把典籍「无X」改判为「天干不透」的条例都写了 判定备注 (缺备注 ${无痕.length} 条:${无痕.slice(0, 4).join('、')})`);
}

// ── ⓖ 条例间的包含关系必须是【算出来的】,不是手写的 ────────────────────────
// 「细化于」被用在两种含义相反的关系上:子集(母子同时命中,档位计双计) vs 互斥(母条的例外,永不同时)。
// 若不区分,chart.txt 对互斥那些打「勿与母条重复计」纯属误导。关系由
// fixtures/bless-tiaoli-relations.ts 采样算出并回写;这里用同样的方法复验——
// 改了「若」却忘了重跑祝福脚本,就在这里被拦住。
{
  const 差: string[] = [];
  for (const k of 格键) {
    const 条例 = 条例块[k].条例 || [];
    const res = 算关系(k, 条例, 采样命中(k));
    for (const t of 条例) {
      const r = res[t.id];
      if ((t.关系 || undefined) !== r.关系) 差.push(`${k}/${t.id} 关系: 存 ${t.关系 || '—'} / 实算 ${r.关系 || '—'}`);
      if (JSON.stringify(t.蕴含 || undefined) !== JSON.stringify(r.蕴含))
        差.push(`${k}/${t.id} 蕴含: 存 ${JSON.stringify(t.蕴含) || '—'} / 实算 ${JSON.stringify(r.蕴含) || '—'}`);
    }
  }
  if (差.length) 差.slice(0, 6).forEach(x => console.log(`    ${x}`));
  ok(差.length === 0,
    `条例间「关系/蕴含」与实际命中集合一致 (不一致 ${差.length} 处` +
    (差.length ? ';改了「若」之后请跑 npx tsx fixtures/bless-tiaoli-relations.ts 重新回写' : '') + ')');
  const 互斥数 = 格键.flatMap(k => 条例块[k].条例 || []).filter((t: any) => t.关系 === '互斥').length;
  ok(互斥数 > 0, `「细化于」里确实存在互斥型(${互斥数} 条)——正因如此才不能对它们一律打「勿重复计」`);
}

// ── ⓔ 条例快照锁 ──────────────────────────────────────────────────────────
// 有意改条例时把新哈希填回来即为「祝福」,改动因此必须显式(与取干表同规格)。
const EXPECTED_TIAOLI_HASH = 'a2c05e1a0093978b6bd2f44ade7d60db';   // v3.11.0 M4 十干全表 120 格 / 1396 条
{
  const canon = 格键.map(k =>
    k + '::' + (条例块[k].条例 || []).map((t: any) => [t.id, t.名, t.若, t.则, t.档].join('|')).join(';')
  ).join('||');
  const hash = crypto.createHash('md5').update(canon, 'utf8').digest('hex');
  ok(hash === EXPECTED_TIAOLI_HASH,
    `条例体快照未被静默改动 (期望 ${EXPECTED_TIAOLI_HASH} / 实际 ${hash})` +
    (hash !== EXPECTED_TIAOLI_HASH ? '\n    ↑ 若是有意改条例,把 EXPECTED_TIAOLI_HASH 换成实际值即为祝福' : ''));
}

// ── ⓗ v1.1(v3.12 批B2) 条例「前提」行为:身势过滤正反例 ──────────────────────
// 1991 质检盘(辛未 丙申 丁巳 乙巳,丁/申格,金成派):旺衰=中和——书义「财多身弱」以身不任财
// 为前提,中和盘命中「身弱」字样条例名不副实(质检报告 P1-2)。前提=身:弱 过滤后:
{
  const QA = { 年: { gan: '辛', zhi: '未' }, 月: { gan: '丙', zhi: '申' }, 日: { gan: '丁', zhi: '巳' }, 时: { gan: '乙', zhi: '巳' } } as any;
  const hitIds = (r: any) => r.命中.map((h: any) => h.id);
  const 中和 = evalTiaoLi(QA, '丁', '中和');
  ok(!hitIds(中和).includes('丁申-财多身弱') && !hitIds(中和).includes('丁申-庚多无壬'),
    `前提v1.1:中和盘不再命中财多身弱系(命中=${hitIds(中和).join(',') || '无'})`);
  const 弱 = evalTiaoLi(QA, '丁', '弱');
  ok(hitIds(弱).includes('丁申-财多身弱'),
    '前提v1.1:同盘若身弱则财多身弱照常命中(前提只滤身不弱者)');
  const 未传 = evalTiaoLi(QA, '丁');
  ok(hitIds(未传).includes('丁申-财多身弱'),
    '前提v1.1:身势未传时前提恒真(孤立调用不静默丢条例,兼容旧行为)');
  ok(中和.词表版本 === 'v1.1', `词表版本已升 v1.1 (得到 ${中和.词表版本})`);
}

if (failed) { console.log(`\n${failed} 项失败`); process.exit(1); }
console.log('✅ 全部通过 (调候 120 格:结构 + 快照锁 + 寒暖不变式 + 接线;取值权威性未主张,全表待核)');
console.log('✅ 条例层通过 (甲木 12 格:受控词表 + 则照录原文 + 求值器行为 + 条例快照锁)');

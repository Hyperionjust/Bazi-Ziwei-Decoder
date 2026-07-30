// test-check.ts — check-analysis 体检器回归
import { checkAnalysis, checkLongform, checkZonghe, checkZiwei, checkMbti } from '../check-analysis';
import * as fs from 'fs';
import * as path from 'path';
let failed = 0;
const ok = (c: boolean, m: string) => { if (c) console.log('✓', m); else { console.log('✗', m); failed++; } };
const chart = { bazi: { enrichment: { 运岁引动: { 建议节点: [{ 年: 2030 }, { 年: 2035 }, { 年: 2040 }, { 年: 2045 }, { 年: 2050 }] }, 用神建议: { 出口: { 缺补说明: '缺金但金非本盘用忌关键' } } } } };
const seg = (n: number, extra = '') => Array.from({ length: n }, (_, i) => `第${i}句内容足够长撑起字数要求所以多写一点内容${extra}`).join('。') + '。';
const goodPara = `<span class="hl-good">${seg(3)}</span>${seg(4)}<span class="hl">${seg(1)}</span>`;
const good: any = {
  meta: { archetype_name: '厚土载物·静水流深' },
  dm: { desc_html: '己土，属田园之土，特性是包容，意味着你能托底，最强的能力是整合，但易被琐事缠身。' },
  geju: { sub_html: '官印相生格局清。所以你宜借平台成事。' },
  wuxing: { note_html: '全盘缺金而金非用忌关键。所以你不必刻意补金。' },
  tg: { mech_html: '官杀生印。', plain_html: '所以你靠信用立身。' },
  yongshen: { note_html: '临界盘体用两分。所以你护体发用并行。' },
  interp: { personality_html: goodPara, career_html: goodPara, marriage_html: goodPara + '你适合的另一半<span class="hl-good">更可能是一个比你年长、有担当、性格柔和的男生</span>。他会在大事上替你拿主意。', health_html: goodPara },
  hechong: { reading_html: seg(4) }, yunsui: { reading_html: seg(3) }, shensha: { reading_html: seg(4) },
  kaiyun: { ye: 'x', place_html: 'x', item_html: 'x', skill_html: 'x', note_html: 'x' },
  timeline: [2030, 2035, 2040, 2045, 2050].map((y, i) => ({ age: i * 10, year: y, run: '干支', run_class: 'flat', desc: '平路', marker_class: 'flat' })),
};
const rep1 = checkAnalysis(good, chart, 2026);
ok(Object.values(rep1).every((r: any) => r.status !== 'FAIL'), '合格样本全 PASS: ' + JSON.stringify(Object.entries(rep1).filter(([,r]:any)=>r.status==='FAIL').map(([k])=>k)));
const bad = JSON.parse(JSON.stringify(good));
bad.meta.archetype_name = '偏财格身弱';
bad.shensha.reading_html = '羊刃大凶,tier 很高。';
bad.interp.marriage_html = goodPara + '你适合的另一半更可能是一个或年长或年轻的男生。';
bad.timeline[0].year = 1999;
const rep2 = checkAnalysis(bad, chart, 2026);
ok(rep2['meta.archetype_name'].status === 'FAIL', '判词术语被抓');
ok(rep2['_全局禁词'].status === 'FAIL', 'tier/大凶被抓');
ok(rep2['interp.marriage_html'].status === 'FAIL', '画像骑墙被抓');
ok(rep2['timeline'].status === 'FAIL', '白名单越界被抓');
// ---- v3.7.1 正缘画像四型分型 + 连接词白名单 ----
{
  const mk = (marriage: string) => { const b = JSON.parse(JSON.stringify(good)); b.interp.marriage_html = goodPara + marriage; return b; };
  const chartGZ = JSON.parse(JSON.stringify(chart));
  chartGZ.bazi.enrichment.正缘倾向 = { 年龄倾向: '年长', 置信: '高', 宫坐: '七杀' };
  // 七杀宫坐 + 印星锚头 → 分型错位被抓
  const rWrong = checkAnalysis(mk('你适合的另一半<span class="hl-good">更可能是一个比你年长、有担当、外柔内刚的男生</span>。他会在大事上撑住你。'), chartGZ, 2026);
  ok(rWrong['interp.marriage_html'].status === 'FAIL' && rWrong['interp.marriage_html'].reasons.some(r => r.includes('不符')), '分型:七杀宫坐配印星锚头被抓');
  // 七杀宫坐 + 官杀锚头 → PASS
  const rRight = checkAnalysis(mk('能接住你的，<span class="hl-good">更可能是一个比你年长、有担当、雷厉风行的男生</span>。他会在你硬扛的时候毫不含糊地接手。'), chartGZ, 2026);
  ok(rRight['interp.marriage_html'] == null || rRight['interp.marriage_html'].status !== 'FAIL', '分型:官杀宫坐配官杀锚头 PASS: ' + JSON.stringify(rRight['interp.marriage_html']?.reasons || []));
  // 无宫坐数据 → 任一锚头均可(向后兼容,good 样本已验证)
  // 连接词白名单:新连接词「这让你」PASS,盘外开头 FAIL
  const bC = JSON.parse(JSON.stringify(good));
  bC.geju.sub_html = '官印相生格局清。这让你宜借平台成事。';
  const rC = checkAnalysis(bC, chart, 2026);
  ok(rC['geju.sub_html'].status !== 'FAIL', '连接词:「这让你」开头 PASS');
  bC.geju.sub_html = '官印相生格局清。你宜借平台成事。';
  const rC2 = checkAnalysis(bC, chart, 2026);
  ok(rC2['geju.sub_html'].status === 'FAIL', '连接词:白名单外开头被抓');
  // 精读段窗口放宽:7 句 PASS,9 句 FAIL
  const bS = JSON.parse(JSON.stringify(good));
  bS.hechong.reading_html = seg(7);
  ok(checkAnalysis(bS, chart, 2026)['hechong.reading_html'].status !== 'FAIL', '精读段:7句 PASS(放宽后)');
  bS.hechong.reading_html = seg(9);
  ok(checkAnalysis(bS, chart, 2026)['hechong.reading_html'].status === 'FAIL', '精读段:9句仍被拦');
}

// ---- 长文体检(--mode=longform):泄漏样必拦 / 合规样零误伤 ----
const lfChart = { bazi: { enrichment: { 正缘倾向: { 年龄倾向: '年长', 置信: '低' } } } };
const lfLeak = '你的日主是丙火。该命主性格外向。从这里的 rubric v3 加分看出算法层判偏旺。今年是灾年会有大凶。你总是拖延。从小你就习惯牵头攒局。';
const rl = checkLongform(lfLeak, lfChart, 2026);
ok(rl['_幕后机制泄漏'].status === 'FAIL', '长文:机制词(rubric/算法层)被抓');
ok(rl['_版本号泄漏'].status === 'FAIL', '长文:版本号(v3)被抓');
ok(rl['_播报腔'].status === 'FAIL', '长文:第三人称播报(该命主)被抓');
ok(rl['_绝对凶语'].status === 'FAIL', '长文:大凶/灾年被抓');
ok(rl['_行为频率断言'].status === 'FAIL', '长文:频率断言(你总是)被抓');
ok(rl['_童年行为断言'].status === 'FAIL', '长文:童年行为(从小…牵头攒局)被抓');
const lfClean = '你天生带着一股沉静的韧劲。紫微命主星落在事业宫。今年走顺风，后年略有逆风宜守。这一层的置信度：低，仅供参考。你的正缘更可能比你年长一些，性格温厚。';
const rc = checkLongform(lfClean, lfChart, 2026);
ok(Object.values(rc).every((r: any) => r.status !== 'FAIL'), '长文:合规样零误伤(置信度/命主星/顺逆/年长): ' + JSON.stringify(Object.entries(rc).filter(([, r]: any) => r.status === 'FAIL').map(([k]) => k)));
const rAge = checkLongform('你温厚踏实。你的正缘更可能比你年轻活泼。', lfChart, 2026);
ok(rAge['正缘年龄一致性'].status === 'FAIL', '长文:正缘年龄词与算法判定矛盾被抓');

// ---- P0-C 置信度传播: 边界盘高确定断语红线(正/反样例) ----
{
  const bChart = { bazi: { enrichment: { confidence_tier: { tier: 'low' } } } };
  const hChart = { bazi: { enrichment: { confidence_tier: { tier: 'high' } } } };
  const certainTxt = '你的事业必然在近年起飞。2029年你会升职加薪。';
  const hedgedTxt = '如果你近年在体制内,2028-2030 这个窗口整体偏顺,适合主动争取;应期只是参考,决定权在你。';
  const rB1 = checkLongform(certainTxt, bChart, 2026);
  ok(rB1['_边界盘高确定断语'].status === 'FAIL', '边界盘+「必然/单年断事」→ FAIL(正样例): ' + JSON.stringify(rB1['_边界盘高确定断语'].reasons.length));
  ok(rB1['_边界盘高确定断语'].reasons.some(r => r.includes('必然')) && rB1['_边界盘高确定断语'].reasons.some(r => r.includes('单年')), '两种模式(高确定词/单年定断)各自命中');
  const rB2 = checkLongform(hedgedTxt, bChart, 2026);
  ok(rB2['_边界盘高确定断语'].status !== 'FAIL', '边界盘+条件句区间应期 → PASS(反样例): ' + JSON.stringify(rB2['_边界盘高确定断语'].reasons));
  const rB3 = checkLongform(certainTxt, hChart, 2026);
  ok(rB3['_边界盘高确定断语'].status !== 'FAIL', '非边界盘(high 档)不触发本红线(规则限边界盘)');
  // 旧 chart 无 confidence_tier: 回退 用神边界盘/时辰临界 判定
  const legacy = { bazi: { enrichment: { 用神建议: { 边界盘: true } } } };
  ok(checkLongform(certainTxt, legacy, 2026)['_边界盘高确定断语'].status === 'FAIL', '旧 chart 回退边界盘字段仍拦截');
}

// ---- v3.8 综合海报体检(--mode=zonghe):随包样例即 golden ----
{
  const sample = JSON.parse(fs.readFileSync(path.join(__dirname, '../../examples/sample-analysis-zonghe.json'), 'utf-8'));
  const rz = checkZonghe(sample, {});
  ok(Object.values(rz).every((r: any) => r.status !== 'FAIL'), 'zonghe:随包样例 ALL PASS: ' + JSON.stringify(Object.entries(rz).filter(([, r]: any) => r.status === 'FAIL').map(([k, r]: any) => [k, r.reasons])));
  const bz = JSON.parse(JSON.stringify(sample));
  bz.meta.archetype_name = '厚土紫微的守成者'; // 8字·旧样例的违规判词
  bz.section_01.text = '此命宜守成。' + bz.section_01.text;
  bz.final.risks[0].desc = '此年大凶,诸事不宜';
  const rz2 = checkZonghe(bz, {});
  ok(rz2['meta.archetype_name'].status === 'FAIL', 'zonghe:8字判词被抓');
  ok(rz2['_全局禁词'].reasons.some((r: string) => r.includes('播报腔')), 'zonghe:「此命」播报腔被抓');
  ok(rz2['_全局禁词'].reasons.some((r: string) => r.includes('绝对断语')), 'zonghe:大凶被抓');
}
// ---- v3.8 紫微海报体检(--mode=ziwei) ----
{
  const zseg = (n: number) => Array.from({ length: n }, (_, i) => `第${i}句紫微解读内容足够具体足够长撑起段落规格要求`).join('。') + '。';
  const zgood: any = { meta: { archetype_name: '紫垣定鼎掌枢客' } };
  for (const k of ['axis_html', 'mingshen_html', 'career_html', 'wealth_html', 'marriage_html', 'health_html', 'daxian_html', 'liunian_html', 'advice_html'])
    zgood[k] = `<span class="hl-good">${zseg(3)}</span>${zseg(4)}`;
  const rw = checkZiwei(zgood, {});
  ok(Object.values(rw).every((r: any) => r.status !== 'FAIL'), 'ziwei:合格样全 PASS: ' + JSON.stringify(Object.entries(rw).filter(([, r]: any) => r.status === 'FAIL').map(([k]) => k)));
  const zbad = JSON.parse(JSON.stringify(zgood));
  zbad.meta.archetype_name = '守成者';
  zbad.career_html = '两句话。敷衍了事。';
  zbad.daxian_html = zseg(7) + '这步大运是灾年。';
  delete zbad.advice_html;
  const rw2 = checkZiwei(zbad, {});
  ok(rw2['meta.archetype_name'].status === 'FAIL', 'ziwei:3字判词被抓');
  ok(rw2['career_html'].status === 'FAIL', 'ziwei:两句敷衍被抓');
  ok(rw2['_全局禁词'].reasons.some((r: string) => r.includes('绝对断语')), 'ziwei:大限灾年被抓');
  ok(rw2['advice_html'].status === 'FAIL', 'ziwei:缺字段被抓');
}

// ---- v3.8.x 回归:mbti 意象嫁接违规必须反映到总体判定(P0:_全局 不得提前冻结放行) ----
{
  const mChart = { bazi: { siZhu: { day: { gan: '甲' } }, enrichment: { 八维结构: { 最像类型: 'INTJ', 备选类型: 'INFJ' } } } };
  const mkM = (tagline: string) => ({
    meta: { archetype_name: '厚土载物·静水流深' },
    mbti_tagline: tagline,
    overview_html: `<span class="hl-good">${seg(2)}</span>${seg(3)}`,
    sanguan_html: `<span class="hl">${seg(2)}</span>${seg(3)}`,
    friends_html: `<span class="hl-good">${seg(5)}</span>`,
    love_html: `<span class="hl-good">${seg(5)}</span>`,
    work_html: `<span class="hl">${seg(5)}</span>`,
    family_html: `<span class="hl-good">${seg(5)}</span>`,
    hobbies_html: `<span class="hl-good">${seg(5)}</span>`,
  });
  const rImgBad = checkMbti(mkM('你沉静而笃定，按自己的节奏稳稳向前。'), mChart);
  ok(rImgBad['_全局'].status === 'FAIL', 'mbti:意象嫁接违规→总体判定不通过(回归:_全局不提前冻结): ' + JSON.stringify(rImgBad['_全局']?.reasons));
  const rImgOk = checkMbti(mkM('你像一棵大树，沉静地把根扎进土里。'), mChart);
  ok(rImgOk['_全局'].status === 'PASS', 'mbti:日主意象落锚→_全局 PASS: ' + JSON.stringify(rImgOk['_全局']?.reasons));
}

// ═══════════════════════════════════════════════════════════════════════════
// 批4(v3.11.0)· 体检器与提示词/算法层的三处内部矛盾
// ---------------------------------------------------------------------------
// 这三条都不是「规则太严」,是**体检器和别处对不上**——模型照提示词写必被打回,
// 照体检器写又违反提示词;或者算法层给的事实被体检器当成模型的错。
// 每条都正反例各锁一次:修完不能变成放行一切。
// ═══════════════════════════════════════════════════════════════════════════
{
  const 基 = () => JSON.parse(JSON.stringify(good));
  const F = (a: any, ch: any = chart) => Object.entries(checkAnalysis(a, ch, 2026))
    .filter(([, v]: any) => v.status === 'FAIL').map(([k, v]: any) => `${k}:${v.reasons.join('|')}`);

  // ── 批4-a:`命主` 是全局禁词(播报腔),但 bazi-poster.md 又明写「name:没提供填『命主』」──
  //    姓名槽位里的「命主」是占位符不是播报腔。豁免路径写在 spec.json,这里锁正反两面。
  {
    const a = 基(); a.meta.name = '命主';
    ok(!F(a).some(x => x.includes('命主')), `批4-a 正例:meta.name=「命主」不再被禁词误杀(提示词就是这么要求的) ${JSON.stringify(F(a))}`);
    const b = 基(); b.meta.name = '张三'; b.hechong.reading_html = seg(4) + '命主的运势不错。';
    ok(F(b).some(x => x.includes('命主')), '批4-a 反例:正文里的播报腔「命主」仍被拦(豁免只给姓名槽位)');
  }

  // ── 批4-b:运岁段本来就要讲大运,一步大运横跨十年,年份必然落在「今年起 5 年窗口」外 ──
  //    那是算法层给的事实,不是模型乱写。豁免大运起止年 + 建议节点年。
  {
    const ch: any = JSON.parse(JSON.stringify(chart));
    ch.bazi.dayun = [{ startYear: 2028, endYear: 2037 }];
    const a = 基(); a.yunsui.reading_html = '2028-2037这步大运是关键窗口。' + seg(2);
    ok((checkAnalysis(a, ch, 2026) as any)['yunsui.reading_html'].status === 'PASS',
      '批4-b 正例:引用大运起止年 2028-2037 不再报警(算法层自己给的年份)');
    const b = 基(); b.yunsui.reading_html = '1949年是个转折点。' + seg(2);
    const r = (checkAnalysis(b, ch, 2026) as any)['yunsui.reading_html'];
    ok(r.status === 'WARN' && r.reasons.some((x: string) => x.includes('1949')),
      '批4-b 反例:白名单外的无关年份 1949 仍报警');
  }

  // ── 批4-c:罕象提及判据原是「名字前 3 字出现在文里」——
  //    「原局天克地冲」前 3 字是「原局天」,而文里自然写的是「天克地冲」,于是点名了也 FAIL。
  {
    const ch: any = JSON.parse(JSON.stringify(chart));
    ch.bazi.enrichment.罕象 = [{ 名: '原局天克地冲', 罕见度: '罕见', 涉及: '年-日', 说明: 'x', 匹配词: ['天克地冲'] }];
    const a = 基(); a.shensha.reading_html = seg(3) + '你这盘还有天克地冲的结构在。';
    ok(!F(a, ch).some(x => x.startsWith('shensha.reading_html')),
      '批4-c 正例:文里写「天克地冲」即算点名(不必凑「原局天」这个前缀)');
    const b = 基();
    ok(F(b, ch).some(x => x.includes('罕象')), '批4-c 反例:盘有罕象而只字未提,仍 FAIL');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// J4(v3.11.0 M4)· 调候条例引用防编造
// ---------------------------------------------------------------------------
// 条例名是《穷通宝鉴》/《造化元钥》该格条件树里的名目(寒木向阳/水泛木浮/去浊留清…)。
// 引用【命中】的是「解读引真典有名目」;引用【未命中】的就是编造 —— 那条规则在这张盘上
// 根本没成立。这正是 J3 给解读层的自由(意象随盘重写)必须配的那把锁:
// 措辞可以自由，事实不行。
// ═══════════════════════════════════════════════════════════════════════════
{
  const 甲卯盘 = {
    bazi: {
      enrichment: {
        运岁引动: { 建议节点: [{ 年: 2030 }, { 年: 2035 }, { 年: 2040 }, { 年: 2045 }, { 年: 2050 }] },
        用神建议: { 出口: { 缺补说明: '缺金但金非本盘用忌关键' } },
        调候条例: {
          格: '甲/卯', 有条例: true,
          命中: [{ 名: '阳刃驾杀', 档: '中' }, { 名: '曲直得庚', 档: '上' }],
          未命中: 16, 病: [],
        },
      },
    },
  };
  const 基 = () => JSON.parse(JSON.stringify(good));
  const 条例FAIL = (a: any) => Object.entries(checkAnalysis(a, 甲卯盘, 2026))
    .filter(([k, v]: any) => k === '_条例引用' && v.status === 'FAIL')
    .map(([, v]: any) => v.reasons.join('|'));

  const a1 = 基(); a1.yongshen.note_html = '本盘命中阳刃驾杀，锋芒有处安放。所以你在规则清晰的场子里更容易发挥。';
  ok(条例FAIL(a1).length === 0, `J4 正例:引用【命中】的条例名「阳刃驾杀」放行 ${JSON.stringify(条例FAIL(a1))}`);

  const a2 = 基(); a2.yongshen.note_html = '本盘有水泛木浮之象，根基不定。所以你在规则清晰的场子里更容易发挥。';
  ok(条例FAIL(a2).some(r => r.includes('水泛木浮')),
    'J4 反例①:引用【本格未命中】的「水泛木浮」被拦(那条规则在这张盘上没成立)');

  const a3 = 基(); a3.yongshen.note_html = '本盘有寒木向阳之象，得暖而发。所以你在规则清晰的场子里更容易发挥。';
  ok(条例FAIL(a3).some(r => r.includes('寒木向阳')),
    'J4 反例②:引用【别格】的条例名(寒木向阳是甲/寅 的名目)同样被拦');

  ok(条例FAIL(基()).length === 0, 'J4 零误伤:完全不提条例的合格样本不受影响');

  // 未吸收/无条例的盘不得凭空报错
  const 无条例盘 = JSON.parse(JSON.stringify(甲卯盘));
  无条例盘.bazi.enrichment.调候条例 = { 格: '？/？', 有条例: false, 命中: [], 未命中: 0, 病: [] };
  const r无 = checkAnalysis(基(), 无条例盘, 2026) as any;
  ok(r无['_条例引用'] === undefined, 'J4:该格无条例时不生成 _条例引用 项(不平白多一条报告)');
}

console.log(failed ? `\n❌ ${failed} 失败` : '\n✅ 全部通过');
process.exit(failed ? 1 : 0);

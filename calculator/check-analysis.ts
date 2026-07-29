// check-analysis.ts — 海报 analysis.json 确定性体检(评审—重生 Pass 的脚本侧) v1
// ---------------------------------------------------------------------------
// 分工:本脚本查机器可判的形态红线(合法性/禁词/句式/白名单/着色/计数);
//       语义质量(锚定/落地/口吻/护栏)由 prompts/bazi-poster-review.md 评审遍查。
// 用法: node check-analysis.js --analysis=analysis.json --chart=chart.json [--currentYear=YYYY]
// 输出: 逐字段报告(stdout JSON);任一 FAIL → exit 1(FAIL 字段应送回评审遍重生)。
// ---------------------------------------------------------------------------
import * as fs from 'fs';
// v3.9.1: 所有形态规格(句数/字数/白名单/禁词/判词规格)统一从 spec.json 取,
//         不再在本文件与提示词里各写一遍。改规格只改 spec.json,
//         提示词里的同款数字由 fixtures/test-spec-sync.ts 逐条比对。
import SPEC from './spec.json';

type Rep = { status: 'PASS'|'FAIL'|'WARN'; reasons: string[] };
const strip = (s: string) => String(s || '').replace(/<[^>]+>/g, '');
const sentences = (s: string) => strip(s).split(/[。！？!?]/).map(x => x.trim()).filter(Boolean);
const alt = (arr: readonly string[]) => arr.join('|');

const SEC = SPEC.sections;
const ARCH = SPEC.archetype;

// v3.7.1 两句类第二句连接词白名单(治「所以你」×4 节拍器式同质化;同海报鼓励错开)
const CONNECTOR_RE = new RegExp(`^(${alt(SPEC.connectors.allow)})`);
const CONNECTOR_DESC = SPEC.connectors.allow.join('/');

// 判词规格:N 字整句 或 M+M 对仗(分隔符见 spec.archetype.couplet_separators)
const ARCHETYPE_OK = (t: string) =>
  new RegExp(`^[一-龥]{${ARCH.single_len}}$`).test(t) ||
  new RegExp(`^[一-龥]{${ARCH.couplet_len}}[${ARCH.couplet_separators.join('')}][一-龥]{${ARCH.couplet_len}}$`).test(t);
const ARCHETYPE_DESC = `判词须${ARCH.single_len}字或${ARCH.couplet_len}+${ARCH.couplet_len}对仗`;
const ARCHETYPE_FORBID_RE = new RegExp(ARCH.forbid_pattern);

// v3.2.3(用户定) 童年断言细则:「从小」只能接气质不能接行为——童年限定词与可证伪动作词同句即违规
const CHILD_MARK = new RegExp(`(${alt(SPEC.childhood.marks)})`);
const CHILD_ACT = new RegExp(`(${alt(SPEC.childhood.acts)})`);
function childhoodViolations(text: string): string[] {
  const out: string[] = [];
  for (const sent of String(text).replace(/<[^>]+>/g, '').split(/[。！？!?\n]/)) {
    if (CHILD_MARK.test(sent) && CHILD_ACT.test(sent)) out.push(sent.trim().slice(0, 40));
  }
  return out;
}

export function checkAnalysis(a: any, chart: any, currentYear: number): Record<string, Rep> {
  const R: Record<string, Rep> = {};
  const put = (k: string, bad: string[], warn: string[] = []) => {
    R[k] = { status: bad.length ? 'FAIL' : (warn.length ? 'WARN' : 'PASS'), reasons: [...bad, ...warn] };
  };

  // ---- 判词:7字 或 4+4 对仗;禁格局术语 ----
  {
    const bad: string[] = [];
    const t = strip(a?.meta?.archetype_name || '');
    if (!ARCHETYPE_OK(t)) bad.push(`${ARCHETYPE_DESC},得到「${t}」`);
    if (ARCHETYPE_FORBID_RE.test(t)) bad.push(ARCH.forbid_desc);
    put('meta.archetype_name', bad);
  }

  // ---- 全局禁词(所有解读字段;分层定义见 spec.json forbid) ----
  const FORBID_ALL = SPEC.forbid.all;
  // 批4 修:`命主` 是全局禁词(播报腔),但 bazi-poster.md 又明写「name:没提供填『命主』」——
  //   姓名槽位里的「命主」是占位符不是播报腔,不豁免就是提示词与体检器自相矛盾,
  //   模型照提示词写必被打回,照体检器写又违反提示词。豁免路径写在 spec.json 里(单一事实源)。
  const FORBID_EXEMPT: RegExp[] = ((SPEC.forbid as any).all_exempt_paths || []).map((r: string) => new RegExp(r));
  const FORBID_FREQ = SPEC.forbid.freq;
  const FORBID_MECH = SPEC.forbid.mech;
  const FORBID_SHUNNI = SPEC.forbid.shunni; // 精读/时间轴措辞
  const SHUNNI_PATH_RE = new RegExp(SPEC.forbid.shunni_path_prefix);
  const walk = (obj: any, path: string, fn: (p: string, v: string) => void) => {
    if (typeof obj === 'string') fn(path, obj);
    else if (Array.isArray(obj)) obj.forEach((v, i) => walk(v, `${path}[${i}]`, fn));
    else if (obj && typeof obj === 'object') for (const k of Object.keys(obj)) walk(obj[k], path ? `${path}.${k}` : k, fn);
  };
  {
    const bad: string[] = [];
    walk(a, '', (p, v) => {
      if (!FORBID_EXEMPT.some(re => re.test(p)))
        for (const w of FORBID_ALL) if (v.includes(w)) bad.push(`${p} 含内部字段/播报腔「${w}」`);
      if (SHUNNI_PATH_RE.test(p)) for (const w of FORBID_SHUNNI) if (v.includes(w)) bad.push(`${p} 含绝对断语「${w}」(应用顺风/逆风)`);
      for (const w of FORBID_FREQ) if (v.includes(w)) bad.push(`${p} 含行为频率断言「${w}」(能力而非事迹:改写为能力/特质/潜力句式)`);
      for (const w of FORBID_MECH) if (v.includes(w)) bad.push(`${p} 泄漏幕后机制词「${w}」(幕后台前分离:用户只看结论)`);
      for (const c of childhoodViolations(v)) bad.push(`${p} 童年行为断言「${c}…」(细则:从小只能接气质不能接行为,动作可证伪)`);
    });
    put('_全局禁词', bad);
  }

  // ---- 两句类:恰两句 + 下句以所以你/意味着你开头 ----
  // tg 特例:mech=上句(恰一句报盘面)、plain=下句(恰一句,以所以你开头)
  {
    const bad1: string[] = []; const bad2: string[] = [];
    const m = a?.tg?.mech_html, p = a?.tg?.plain_html;
    const TG_N = SEC.tg_block.exact_sentences;
    if (m == null) bad1.push('缺字段'); else if (sentences(m).length !== TG_N) bad1.push(`上句应恰${TG_N}句,实际${sentences(m).length}句`);
    if (p == null) bad2.push('缺字段'); else {
      if (sentences(p).length !== TG_N) bad2.push(`下句应恰${TG_N}句,实际${sentences(p).length}句`);
      if (!CONNECTOR_RE.test(strip(p).trim())) bad2.push(`下句须以连接词开头(${CONNECTOR_DESC})`);
    }
    put('tg.mech_html', bad1); put('tg.plain_html', bad2);
  }
  for (const [k, path] of [['dm.desc_html', a?.dm?.desc_html], ['geju.sub_html', a?.geju?.sub_html], ['wuxing.note_html', a?.wuxing?.note_html], ['yongshen.note_html', a?.yongshen?.note_html]] as [string, string][]) {
    if (path == null) { put(k, [`缺字段`]); continue; }
    const bad: string[] = [];
    const ss = sentences(path);
    if (k === 'dm.desc_html') {
      // 日主固定句式:特性是…意味着你…最强的能力是…但…
      const t = strip(path);
      for (const m of ['特性是', '意味着你', '最强的能力', '但']) if (!t.includes(m)) bad.push(`日主固定句式缺「${m}」`);
    } else {
      if (ss.length !== SEC.two_sentence_block.exact_sentences) bad.push(`应恰${SEC.two_sentence_block.exact_sentences}句,实际 ${ss.length} 句`);
      if (ss[1] && !CONNECTOR_RE.test(ss[1])) bad.push(`第二句须以连接词开头(${CONNECTOR_DESC})`);
    }
    put(k, bad);
  }
  // 缺补说明转述(wuxing)
  {
    const que = chart?.bazi?.enrichment?.用神建议?.出口?.缺补说明 || '';
    if (que && a?.wuxing?.note_html) {
      const missElems = (que.match(/缺([木火土金水])/g) || []).map((x: string) => x[1]);
      const covered = missElems.every((e: string) => strip(a.wuxing.note_html).includes(e));
      if (!covered) R['wuxing.note_html'] = { status: 'FAIL', reasons: [...(R['wuxing.note_html']?.reasons || []), '出口有〔缺补说明〕但未转述所缺五行'] };
    }
  }

  // ---- 四大段落:句数/字数/着色存在 ----
  for (const k of ['personality_html', 'career_html', 'marriage_html', 'health_html']) {
    const v = a?.interp?.[k];
    if (v == null) { put(`interp.${k}`, ['缺字段']); continue; }
    const bad: string[] = [];
    const ss = sentences(v); const len = strip(v).length;
    const MI = SEC.major_interp;
    if (ss.length < MI.min_sentences || len < MI.min_chars) bad.push(`详写不足(句数${ss.length}/字数${len},要求≥${MI.min_sentences}句≥${MI.min_chars}字)`);
    const g = (v.match(/hl-good/g) || []).length, r = (v.match(/class="hl"/g) || []).length;
    if (g + r < MI.min_highlights) bad.push(`着色不足(绿${g}红${r},特质短语应成段着色)`);
    put(`interp.${k}`, bad);
  }
  // 婚恋画像句式(v3.7.1 四型分型:按 正缘倾向.宫坐 确定性选锚头,治全盘一刀切同质化;同盘分型可复现)
  {
    const ANCHOR_BY_GONGZUO: Record<string, string> = SPEC.marriage_anchor.by_gongzuo;
    const v = a?.interp?.marriage_html || '';
    const bad: string[] = [];
    const mt = strip(v).match(/(你适合的另一半|能接住你的|让你眼睛一亮又留得住的|与你最同频的)[^。！？]{0,12}更可能是一个([^。！？]{4,40})的(男生|女生)/);
    if (!mt) bad.push('缺正缘画像句式(四型锚头之一 + 「更可能是一个{特质×3}的男生/女生」)');
    else {
      const gz = chart?.bazi?.enrichment?.正缘倾向?.宫坐;
      const expect = gz ? ANCHOR_BY_GONGZUO[String(gz).replace(/[^一-龥]/g, '')] : null;
      if (expect && mt[1] !== expect) bad.push(`画像锚头「${mt[1]}」与宫坐(${gz})应选型「${expect}」不符(分型由算法宫坐确定,不得混用)`);
      if (!new RegExp('hl-good[^>]*>[^<]*更可能是一个').test(v) && !/更可能是一个[^<]*<\/span>/.test(v) && !/<span class="hl-good">[^<]*更可能是一个/.test(v))
        bad.push('画像整句未加粗标绿');
      if (/(相仿或|或年长|或年轻|或同龄)/.test(mt[2])) bad.push('画像年龄骑墙(须择一或明确改用性格轴)');
    }
    if (bad.length) R['interp.marriage_html'] = { status: 'FAIL', reasons: [...(R['interp.marriage_html']?.reasons || []).filter(x => !bad.includes(x)), ...bad] };
  }

  // ---- 三个精读段:3~7句 ----
  for (const [k, v] of [['hechong.reading_html', a?.hechong?.reading_html], ['yunsui.reading_html', a?.yunsui?.reading_html], ['shensha.reading_html', a?.shensha?.reading_html]] as [string, string][]) {
    if (v == null) { put(k, ['缺字段']); continue; }
    const bad: string[] = []; const warn: string[] = [];
    const n = sentences(v).length;
    if (n < SEC.close_read.min_sentences || n > SEC.close_read.max_sentences) bad.push(`精读段应${SEC.close_read.min_sentences}~${SEC.close_read.max_sentences}句,实际${n}句`);
    if (k === 'yunsui.reading_html') {
      // 批4 修:运岁段本来就要讲大运,而一步大运横跨十年——「1997-2006 癸未」这种年份
      //   必然落在「今年起 5 年窗口」之外,却是算法自己给的事实,警它没有道理。
      //   豁免:大运起止年 与 建议节点年(都由算法层产出,不是模型自由发挥的年份)。
      const 大运年 = new Set<number>();
      for (const d of (chart?.bazi?.dayun || [])) { 大运年.add(+d.startYear); 大运年.add(+d.endYear); }
      for (const n of (chart?.bazi?.enrichment?.运岁引动?.建议节点 || [])) 大运年.add(+n.年);
      const yrs = (strip(v).match(/(19|20)\d{2}/g) || []).map(Number);
      for (const y of yrs)
        if ((y < currentYear - 1 || y > currentYear + 5) && !大运年.has(y))
          warn.push(`提及年份${y}超出今年起5年窗口,且不在大运起止年/建议节点白名单内`);
    }
    put(k, bad, warn);
  }

  // ---- 正缘年龄一致性(v2.6):画像年龄词须与算法判定一致 ----
  {
    const zy = chart?.bazi?.enrichment?.正缘倾向;
    const v = String(a?.interp?.marriage_html || '');
    if (zy && v) {
      const said: string[] = [];
      if (/比你年长|年长/.test(strip(v))) said.push('年长');
      if (/比你年轻|年轻/.test(strip(v))) said.push('年轻');
      if (/同龄/.test(strip(v))) said.push('同龄');
      const bad: string[] = [];
      if (said.length && !said.includes(zy.年龄倾向)) bad.push(`画像年龄词(${said.join('/')})与算法判定(${zy.年龄倾向})矛盾`);
      if (!said.length && zy.置信 === '高') bad.push(`判定置信高(${zy.年龄倾向})但画像未用年龄词`);
      if (bad.length) R['interp.marriage_html'] = { status: 'FAIL', reasons: [...(R['interp.marriage_html']?.reasons || []), ...bad] };
    }
  }

  // ---- 罕象提及(v2.5):chart 有罕象时,神煞/合冲精读段须至少点名一个罕象 ----
  {
    const rare = (chart?.bazi?.enrichment?.罕象 || []) as any[];
    if (rare.length) {
      const names = rare.map(r => String(r.名 || '').replace(/[(（].*$/, ''));
      const text = strip(String(a?.shensha?.reading_html || '')) + strip(String(a?.hechong?.reading_html || ''));
      // 批4 修:原判据是「名字前 3 字出现在文里」,这个前缀太脆——
      //   「原局天克地冲」前 3 字是「原局天」,可文里自然写的是「天克地冲」;
      //   「原局伏吟」前 3 字是「原局伏」。于是模型明明点名了罕象,照样判 FAIL。
      //   改为按罕象自带的 匹配词(rare.ts 定义处说了算)判,缺省回退到「去括号、去『原局』前缀的全名」。
      const 匹配词 = (r: any): string[] => {
        const 全 = String(r.名 || '').replace(/[(（].*$/, '');
        const alias: string[] = Array.isArray(r.匹配词) ? r.匹配词 : [];
        return [全, 全.replace(/^原局/, ''), ...alias].filter(x => x && x.length >= 2);
      };
      const mentioned = rare.some(r => 匹配词(r).some(w => text.includes(w)));
      if (!mentioned) {
        for (const k of ['shensha.reading_html', 'hechong.reading_html']) {
          R[k] = { status: 'FAIL', reasons: [...(R[k]?.reasons || []), `盘有罕象(${names.join('/')})但精读段未提及`] };
        }
      }
    }
  }

  // ---- timeline:恰5项 + 年份∈建议节点白名单 ----
  {
    const bad: string[] = [];
    const tl = a?.timeline;
    const wl = new Set(((chart?.bazi?.enrichment?.运岁引动?.建议节点) || []).map((n: any) => n.年));
    if (!Array.isArray(tl) || tl.length !== SPEC.timeline.exact_items) bad.push(`timeline 应恰${SPEC.timeline.exact_items}项,实际${Array.isArray(tl) ? tl.length : 0}`);
    else if (wl.size) for (const t of tl) if (!wl.has(+t.year)) bad.push(`节点年份${t.year}不在建议节点白名单`);
    put('timeline', bad);
  }

  return R;
}

// ---- v2.8: mbti 海报体检(--mode=mbti) ----
// v3.4 意象嫁接:十干→日主意象关键词(任一命中即算落锚)
const DM_IMG: Record<string, string[]> = {
  甲: ['大树', '参天', '乔木'], 乙: ['花草', '藤蔓', '藤', '花木'], 丙: ['太阳', '骄阳', '日光'], 丁: ['烛', '灯火', '星光'],
  戊: ['高山', '山'], 己: ['田园', '田', '沃土', '园土'], 庚: ['刀', '剑', '斧钺'], 辛: ['珠玉', '玉', '珠', '金饰'],
  壬: ['江河', '江', '河', '大水', '奔流'], 癸: ['雨露', '雨', '露', '甘霖'],
};
export function checkMbti(a: any, chart: any): Record<string, Rep> {
  const R: Record<string, Rep> = {};
  const bw = chart?.bazi?.enrichment?.八维结构 || {};
  const allowed = new Set([bw.最像类型, bw.备选类型, String(a?.meta?.tested_mbti || '').toUpperCase()].filter(Boolean));
  const bad0: string[] = [];
  const walk = (obj: any, path: string, fn: (p: string, v: string) => void) => {
    if (typeof obj === 'string') fn(path, obj);
    else if (obj && typeof obj === 'object') for (const k of Object.keys(obj)) walk(obj[k], path ? path + '.' + k : k, fn);
  };
  walk(a, '', (p, v) => {
    for (const w of ['tier', 'needs_review', '命主是', '大凶', '灾年']) if (v.includes(w)) bad0.push(`${p} 含「${w}」`);
    for (const w of ['多半是你', '你总是', '你每次', '你从不', '你一定会', '第一个想到你']) if (v.includes(w)) bad0.push(`${p} 含行为频率断言「${w}」`);
    for (const w of ['rubric', '算法层', '映射矩阵', '出文协议', 'v3加分', 'v4加分', '忌神折向', '评审遍', '体检器', '派系侧重']) if (v.includes(w)) bad0.push(`${p} 泄漏幕后机制词「${w}」`);
    for (const c of childhoodViolations(v)) bad0.push(`${p} 童年行为断言「${c}…」(从小只能接气质不能接行为)`);
    if (/你是\s*[EI][NS][TF][JP]\b/.test(v)) bad0.push(`${p} 出现「你是X型」断言(须用最像/底盘)`);
    for (const m of v.match(/\b[EI][NS][TF][JP]\b/g) || []) if (!allowed.has(m)) bad0.push(`${p} 出现盘外类型 ${m}(允许:${[...allowed].join('/')})`);
  });
  for (const k of ['overview_html', 'sanguan_html', 'friends_html', 'love_html', 'work_html', 'family_html', 'hobbies_html']) {
    const v = a?.[k]; const bad: string[] = [];
    if (v == null || v === '-') { R[k] = { status: 'FAIL', reasons: ['缺字段'] }; continue; }
    const n = sentences(v).length;
    if (n < 4) bad.push(`应≥4句,实际${n}`);
    if (!/hl-good|class="hl"/.test(v)) bad.push('无着色');
    R[k] = { status: bad.length ? 'FAIL' : 'PASS', reasons: bad };
  }
  const tested = String(a?.meta?.tested_mbti || '').trim();
  // v3.4 意象嫁接 + MBTI 主轴(用户定)
  {
    const dmGan = chart?.bazi?.siZhu?.day?.gan;
    const imgs: string[] = (dmGan && DM_IMG[dmGan]) || [];
    const hasImg = (txt: string) => imgs.some(k => String(txt || '').includes(k));
    if (imgs.length) {
      if (a?.mbti_tagline && !hasImg(a.mbti_tagline)) bad0.push(`mbti_tagline 未落日主意象(意象嫁接:${dmGan}=${imgs[0]}…)`);
      if (tested && a?.diff_verdict && !hasImg(a.diff_verdict) && a?.diff_html && !hasImg(a.diff_html)) bad0.push(`diff 判词与正文均未出现日主意象(意象嫁接铁律:${dmGan}=${imgs[0]}…)`);
    }
    const dom = chart?.bazi?.enrichment?.八维结构?.主导;
    const domDesc: Record<string, string> = { Te: '外向思维', Ti: '内向思维', Fe: '外向情感', Fi: '内向情感', Se: '外向感觉', Si: '内向感觉', Ne: '外向直觉', Ni: '收敛洞察' };
    if (dom && a?.overview_html && !String(a.overview_html).includes(dom) && !String(a.overview_html).includes(domDesc[dom] || '§'))
      bad0.push(`overview 未点名主导功能 ${dom}(叙事框架:MBTI 为主轴,八字为落锚)`);
  }
  if (tested) {
    const dv = strip(String(a?.diff_verdict || ''));
    const dvBad: string[] = [];
    if (!dv) dvBad.push('缺 diff_verdict 判词');
    else {
      if (!dv.startsWith(SEC.mbti_verdict.prefix)) dvBad.push(`判词须以「${SEC.mbti_verdict.prefix}」开头`);
      // v3.9.1 修:此处原先按 34 判定却写「>30字」,阈值与提示文本不一致
      if (dv.length > SEC.mbti_verdict.max_chars) dvBad.push(`判词过长(${dv.length}>${SEC.mbti_verdict.max_chars}字)`);
    }
    R['diff_verdict'] = { status: dvBad.length ? 'FAIL' : 'PASS', reasons: dvBad };
    const len = strip(String(a?.diff_html || '')).length;
    const MD = SEC.mbti_diff; const okLen = len >= MD.min_chars && len <= MD.max_chars;
    R['diff_html'] = { status: okLen ? 'PASS' : 'FAIL', reasons: okLen ? [] : [`差异版块应${MD.min_chars}~${MD.max_chars}字,实际${len}`] };
  }
  // P0 修复:_全局 汇总赋值挪到所有违规 push(含意象嫁接/主导功能块)完成之后,避免提前冻结放行
  R['_全局'] = { status: bad0.length ? 'FAIL' : 'PASS', reasons: bad0 };
  return R;
}

// ---- v3.8: 综合印证海报体检(--mode=zonghe) ----
// 此前综合海报字段零脚本校验(QC 评审点名);查机器可判红线:判词规格/禁词/播报腔/段落长度/枚举合法性/条目数
export function checkZonghe(a: any, _chart: any): Record<string, Rep> {
  const R: Record<string, Rep> = {};
  const put = (k: string, bad: string[]) => { R[k] = { status: bad.length ? 'FAIL' : 'PASS', reasons: bad }; };
  {
    const bad: string[] = []; const t = strip(a?.meta?.archetype_name || '');
    if (!ARCHETYPE_OK(t)) bad.push(`${ARCHETYPE_DESC},得到「${t}」`);
    if (ARCHETYPE_FORBID_RE.test(t)) bad.push(ARCH.forbid_desc);
    put('meta.archetype_name', bad);
  }
  { // 全局禁词 + 顺逆(风险/冲突路径)
    const bad: string[] = [];
    const walk = (obj: any, path: string, fn: (p: string, v: string) => void) => {
      if (typeof obj === 'string') fn(path, obj);
      else if (Array.isArray(obj)) obj.forEach((v, i) => walk(v, `${path}[${i}]`, fn));
      else if (obj && typeof obj === 'object') for (const k of Object.keys(obj)) walk(obj[k], path ? `${path}.${k}` : k, fn);
    };
    walk(a, '', (p, v) => {
      for (const w of ['tier', 'needs_review', 'lineage_weights', '起法待核']) if (v.includes(w)) bad.push(`${p} 含内部字段「${w}」`);
      for (const w of ['rubric', '算法层', '映射矩阵', '出文协议', '评审遍', '体检器', '算法模型']) if (v.includes(w)) bad.push(`${p} 泄漏幕后机制词「${w}」`);
      for (const w of ['多半是你', '你总是', '你每次', '你从不', '你一定会']) if (v.includes(w)) bad.push(`${p} 含行为频率断言「${w}」`);
      if (/(大凶|灾年|凶年)/.test(v)) bad.push(`${p} 含绝对断语(应用顺风/逆风)`);
      for (const c of childhoodViolations(v)) bad.push(`${p} 童年行为断言「${c}…」`);
    });
    // 播报腔:主叙事字段须第二人称,不得「此命/该命/命主」
    for (const [p, v] of [['section_01.text', a?.section_01?.text], ['section_02.conclusion', a?.section_02?.conclusion], ['final.life_axis', a?.final?.life_axis]] as [string, string][])
      if (v && /(此命|该命|命主)/.test(strip(v))) bad.push(`${p} 第三人称播报腔(此命/该命/命主),须第二人称「你」`);
    put('_全局禁词', bad);
  }
  { // section_01: 180-250 字(容差 160-280)
    const bad: string[] = []; const len = strip(a?.section_01?.text || '').length;
    if (!a?.section_01?.text) bad.push('缺字段');
    else if (len < 160 || len > 280) bad.push(`主轴印证段应约180-250字(容差160-280),实际${len}`);
    put('section_01.text', bad);
  }
  { // section_02: ≥3 句
    const bad: string[] = []; const n = sentences(a?.section_02?.conclusion || '').length;
    if (!a?.section_02?.conclusion) bad.push('缺字段');
    else if (n < 3) bad.push(`阶段印证结论应≥3句成段,实际${n}句`);
    put('section_02.conclusion', bad);
  }
  { // 枚举与条目数
    const bad: string[] = [];
    if (!['同向印证', '互补印证', '存在矛盾'].includes(a?.consistency)) bad.push(`consistency 须三选一,得到「${a?.consistency}」`);
    for (const k of ['career', 'wealth', 'marriage', 'children', 'family', 'health']) {
      const d = a?.dim?.[k];
      if (!d) { bad.push(`dim.${k} 缺失`); continue; }
      if (!['verdict-yes', 'verdict-partial', 'verdict-no'].includes(d.verdict_class)) bad.push(`dim.${k}.verdict_class 非法`);
    }
    if (!Array.isArray(a?.final?.nodes) || a.final.nodes.length !== 5) bad.push(`final.nodes 应恰5项`);
    if (!Array.isArray(a?.conflicts) || a.conflicts.length !== 3) bad.push(`conflicts 应恰3项`);
    if (!Array.isArray(a?.strengths) || a.strengths.length !== 3 || !Array.isArray(a?.weaknesses) || a.weaknesses.length !== 3) bad.push('strengths/weaknesses 应各恰3项');
    put('_结构', bad);
  }
  return R;
}

// ---- v3.8: 紫微独立海报体检(--mode=ziwei) ----
const ZIWEI_FIELDS = ['axis_html', 'mingshen_html', 'career_html', 'wealth_html', 'marriage_html', 'health_html', 'daxian_html', 'liunian_html', 'advice_html'];
export function checkZiwei(a: any, _chart: any): Record<string, Rep> {
  const R: Record<string, Rep> = {};
  const put = (k: string, bad: string[]) => { R[k] = { status: bad.length ? 'FAIL' : 'PASS', reasons: bad }; };
  {
    const bad: string[] = []; const t = strip(a?.meta?.archetype_name || '');
    if (!ARCHETYPE_OK(t)) bad.push(`${ARCHETYPE_DESC},得到「${t}」`);
    put('meta.archetype_name', bad);
  }
  { // 全局禁词
    const bad: string[] = [];
    const walk = (obj: any, path: string, fn: (p: string, v: string) => void) => {
      if (typeof obj === 'string') fn(path, obj);
      else if (obj && typeof obj === 'object') for (const k of Object.keys(obj)) walk(obj[k], path ? `${path}.${k}` : k, fn);
    };
    walk(a, '', (p, v) => {
      for (const w of ['tier', 'needs_review', '命主是', '起法待核']) if (v.includes(w)) bad.push(`${p} 含「${w}」`);
      for (const w of ['rubric', '算法层', '映射矩阵', '出文协议', '评审遍', '体检器']) if (v.includes(w)) bad.push(`${p} 泄漏幕后机制词「${w}」`);
      for (const w of ['多半是你', '你总是', '你每次', '你从不', '你一定会']) if (v.includes(w)) bad.push(`${p} 含行为频率断言「${w}」`);
      if (/^(daxian_html|liunian_html)/.test(p) && /(大凶|灾年|凶年)/.test(v)) bad.push(`${p} 含绝对断语(应用顺风/逆风)`);
      for (const c of childhoodViolations(v)) bad.push(`${p} 童年行为断言「${c}…」`);
    });
    put('_全局禁词', bad);
  }
  for (const k of ZIWEI_FIELDS) { // 段落长度 + 着色
    const v = a?.[k]; const bad: string[] = [];
    if (v == null || v === '' || v === '-') { put(k, ['缺字段']); continue; }
    const n = sentences(v).length, len = strip(v).length;
    if (n < 5 || len < 140) bad.push(`详写不足(句数${n}/字数${len},要求≥6句约200字起,容差5句140字)`);
    if (['mingshen_html', 'career_html', 'wealth_html', 'marriage_html', 'health_html'].includes(k) && !/hl-good|class="hl"/.test(v)) bad.push('无着色(特质短语应成段着色)');
    put(k, bad);
  }
  return R;
}

// ---- 长文(Markdown)后置体检(--mode=longform) ----
// 长文语义质量由评审遍把关;本模式只兜「机器可判的形态红线」:幕后机制泄漏 / 版本号史 /
// 第三人称播报腔 / 绝对凶语(顺逆措辞) / 行为频率断言 / 童年行为断言 / 正缘年龄与算法判定一致性 /
// 边界盘高确定断语(P0-C 置信度传播)。
// 刻意避开会误伤的词:「置信度」允许对用户显示(边界盘须标低);紫微「命主星/身主星」为星名不拦。

// P0-C 边界盘高确定断语模式(常量;chart 为边界盘/低置信时命中即 FAIL)
export const HIGH_CERTAINTY_WORDS = SPEC.forbid.high_certainty;
// 「无条件词伴随的具体单年断事」启发式: 句中含具体年份 + 定断句式(会/将) 且无任何条件/留余地词
const SINGLE_YEAR_RE = /(19|20)\d{2}\s*年/;
const YEAR_ASSERT_RE = /(19|20)\d{2}\s*年[^,，;；]{0,14}(你会|将会|就会|会有|会出现|会发生)/;
const HEDGE_RE = /(如果|若|倘|一旦|可能|或许|大概|预计|倾向|概率|机会|窗口|留意|注意|风险|参考|宜|前后|左右|上下|区间|之间|到20|[-–~至])/;
// 边界盘判定: 全局置信度 low(P0-C) 优先;旧 chart 无该字段时回退 用神边界盘/时辰临界
function isBoundaryChart(chart: any): boolean {
  const en = chart?.bazi?.enrichment;
  if (en?.confidence_tier?.tier) return en.confidence_tier.tier === 'low';
  return en?.用神建议?.边界盘 === true || en?.时辰边界?.boundary === true;
}
export function checkLongform(text: string, chart: any, currentYear: number): Record<string, Rep> {
  const R: Record<string, Rep> = {};
  const push = (k: string, reasons: string[], warn = false) => {
    R[k] = { status: reasons.length ? (warn ? 'WARN' : 'FAIL') : 'PASS', reasons };
  };
  const raw = strip(text);
  const segs = raw.split(/[。！？!?\n]/).map(s => s.trim()).filter(Boolean);
  const scan = (re: RegExp) => segs.filter(s => re.test(s)).map(s => s.slice(0, 40));

  // 1) 幕后机制词泄漏(幕后台前分离 v3.1.5)
  push('_幕后机制泄漏', scan(/(rubric|算法层|映射矩阵|出文协议|评审遍|体检器|忌神折向|派系侧重|lineage_weights|needs_review|起法待核|R1驿马|R2文|R3胎元|v3加分|v4加分|加分审计)/i)
    .map(s => `机制词:「${s}」(幕后台前分离:用户只看结论)`));
  // 版本号史泄漏(rubric 版本 v2/v3/v4,可能被模型引出)
  push('_版本号泄漏', scan(/\bv[234](\.\d+){0,3}\b/i).map(s => `版本号:「${s}」`));
  // 第三人称播报腔(须第二人称「你」)
  push('_播报腔', scan(/(该命主|命主的性格|命主是|命主为|此命主|此造)/).map(s => `第三人称播报:「${s}」(须用第二人称「你」)`));
  // 2) 绝对凶语(顺逆措辞 v2.3)
  push('_绝对凶语', scan(/(大凶|灾年|凶年|凶星|血光|横死)/).map(s => `绝对断语:「${s}」(应改顺风/平路/逆风)`));
  // 3) 行为频率断言(能力而非事迹 v3.0)
  push('_行为频率断言', scan(/(多半是你|你总是|你每次|你从不|你一定会|第一个想到你)/).map(s => `频率断言:「${s}」(改写为能力/特质/潜力)`));
  // 4) 童年行为断言(v3.2.3)
  push('_童年行为断言', childhoodViolations(text).map(c => `「${c}…」(从小只能接气质、不接可证伪行为)`));
  // 4.5) P0-C 置信度传播: chart 为边界盘时,高确定断语与"无条件词的具体单年断事"必拦
  {
    const bad: string[] = [];
    if (isBoundaryChart(chart)) {
      for (const s of segs) {
        for (const w of HIGH_CERTAINTY_WORDS) if (s.includes(w)) { bad.push(`边界盘高确定断语:「${s.slice(0, 40)}」(含「${w}」;low 档须条件句+区间应期)`); break; }
        if (SINGLE_YEAR_RE.test(s) && YEAR_ASSERT_RE.test(s) && !HEDGE_RE.test(s))
          bad.push(`边界盘单年定断:「${s.slice(0, 40)}」(应期须给区间或加条件词,不给单年断事)`);
      }
    }
    push('_边界盘高确定断语', bad);
  }
  // 5) 正缘年龄一致性(v2.6):仅在「婚配/正缘」语境句里比对年龄词
  {
    const zy = chart?.bazi?.enrichment?.正缘倾向;
    const bad: string[] = [];
    if (zy?.年龄倾向) {
      const mtext = segs.filter(s => /(正缘|配偶|另一半|伴侣|对象|婚配|择偶|另一伴)/.test(s)).join(' ');
      const said: string[] = [];
      if (/年长|比你大/.test(mtext)) said.push('年长');
      if (/年轻|比你小/.test(mtext)) said.push('年轻');
      if (/同龄|相仿/.test(mtext)) said.push('同龄');
      if (said.length && !said.includes(zy.年龄倾向)) bad.push(`正缘年龄词(${said.join('/')})与算法判定(${zy.年龄倾向})矛盾`);
    }
    push('正缘年龄一致性', bad);
  }
  return R;
}

function main() {
  const MODE_HELP = '模式说明(--mode,默认 bazi): bazi=八字海报JSON体检 / zonghe=综合印证海报体检 / ziwei=紫微独立海报体检 / mbti=MBTI海报体检 / longform=长文(Markdown)体检';
  const args: Record<string, string> = {};
  for (const x of process.argv.slice(2)) { const m = x.match(/^--([^=]+)=(.*)$/); if (m) args[m[1]] = m[2]; }
  // 长文模式:输入为 Markdown/文本(--text 或 --analysis 指向 .md),chart 可选(用于正缘年龄一致性)
  if (args.mode === 'longform') {
    const p = args.text || args.analysis;
    if (!p) { console.error('Usage: node check-analysis.js --mode=longform --text=report.md [--chart=chart.json] [--currentYear=YYYY]\n' + MODE_HELP); process.exit(1); }
    const text = fs.readFileSync(p, 'utf-8');
    const chart = args.chart ? JSON.parse(fs.readFileSync(args.chart, 'utf-8')) : {};
    const cy = args.currentYear ? +args.currentYear : new Date().getFullYear();
    const rep = checkLongform(text, chart, cy);
    const fails = Object.entries(rep).filter(([, r]) => r.status === 'FAIL');
    console.log(JSON.stringify({ 结论: fails.length ? `FAIL×${fails.length}(送回重写)` : 'ALL PASS', 明细: rep }, null, 2));
    process.exit(fails.length ? 1 : 0);
  }
  if (!args.analysis || !args.chart) { console.error('Usage: node check-analysis.js --analysis=analysis.json --chart=chart.json [--mode=bazi|zonghe|ziwei|mbti|longform] [--currentYear=YYYY]\n' + MODE_HELP); process.exit(1); }
  let a: any;
  try { a = JSON.parse(fs.readFileSync(args.analysis, 'utf-8')); }
  catch (e) { console.error(JSON.stringify({ _JSON合法性: { status: 'FAIL', reasons: [String((e as Error).message)] } })); process.exit(1); }
  const chart = JSON.parse(fs.readFileSync(args.chart, 'utf-8'));
  const cy = args.currentYear ? +args.currentYear : new Date().getFullYear();
  const rep = (args.mode === 'mbti') ? checkMbti(a, chart)
    : (args.mode === 'zonghe') ? checkZonghe(a, chart)
    : (args.mode === 'ziwei') ? checkZiwei(a, chart)
    : checkAnalysis(a, chart, cy);
  const fails = Object.entries(rep).filter(([, r]) => r.status === 'FAIL');
  console.log(JSON.stringify({ 结论: fails.length ? `FAIL×${fails.length}(送回评审遍重生)` : 'ALL PASS', 明细: rep }, null, 2));
  process.exit(fails.length ? 1 : 0);
}
if (require.main === module) main();

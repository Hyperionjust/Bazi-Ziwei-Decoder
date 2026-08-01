// tiaohou-tiaoli.ts — 调候条例求值器(v3.11.0 / 造化元钥吸收工程 M1)
// ---------------------------------------------------------------------------
// 【它是什么】
//   《穷通宝鉴》/《造化元钥》的每一格不是「丙癸」两个字,而是一棵条件树:
//     正月甲木:得丙癸透,富贵双全(上);癸藏丙透,名寒木向阳,主大富贵(上);
//     如无丙癸,平常人也(下);一派庚辛,主一生劳苦克子刑妻(忌)……
//   丢掉的条件分支恰恰是确定性可判的——丙透没透、癸藏没藏、是不是一派庚辛,
//   全部是查盘面就能判的事实。本模块把 tiaohou.json 的「条例.若」对盘面求值。
//
// 【三层分离(工单 v3.11 §2.2,铁律)】
//   层1 盘面判定 = 本模块。受控词表,机器求值,同盘可复现。词表外的写法直接抛错。
//   层2 典籍论断 = tiaohou.json 的「则/名/原文」。照录原文,是数据不是输出,本模块不改写。
//   层3 用户解读 = 提示词层。自由发挥,反同质化。本模块不产出任何白话句式,
//                  只给 名/则/意象 三个概念级素材字段——严禁在此塞固定文案模板。
//
// 【为什么条件要写成 DSL 而不是散文】
//   散文条件只能靠 LLM 现场理解,同一盘两次跑可能判不一样,且无法测试。
//   写成受控 DSL 后:①可解析即可测 ②命中清单进 chart.txt 是确定性事实
//   ③体检器能查「解读引用的条例名是否在命中清单里」(J4,M4 批)。
// ---------------------------------------------------------------------------
import {
  Tiangan, Dizhi, WuXing, TIANGAN, DIZHI,
  GAN_WUXING, ZHI_WUXING, ZHI_CANG_GAN, getShiShen, ShiShen
} from './tables';
import { SAN_HE, SAN_HUI } from './zhi-relations';
import TIAOHOU_DATA from '../tiaohou.json';

type Pillar = '年' | '月' | '日' | '时';
export type GanZhi = { gan: Tiangan; zhi: Dizhi };

// ── 受控词表 v1 ────────────────────────────────────────────────────────────
// 谓词一览(参数类型 / 语义)。改这张表 = 改词表版本,必须同步 tiaohou.json.条例._词表。
// v1.1(v3.12 批B2):新增「身」谓词(参数 强|弱|中和),配套条例「前提」字段——
//   「财多身弱」类条例(全表 10 条+同段关联 5 条)按书义以身不任财为前提,v1 词表只判财势
//   (成派/会局),中和盘也会命中「身弱」字样条例(质检报告 P1-2 实锤,1991 质检盘)。
//   身势取自旺衰计分 verdict(偏旺/极旺→强;偏弱/极弱→弱;中和→中和)——是计分产物不是
//   盘面字面事实,故只允许用在「前提」过滤,不入「若」的盘面判定层(三层分离不破)。
// v2(v3.12 批C2):新增柱位谓词 柱透/坐支——参数两字连写(「柱透:年丁」=年柱天干为丁,
//   「坐支:时辰」=时柱地支为辰),不引入第二个冒号故 ATOM 语法零改动。用于回收 v1 时代
//   因无柱位谓词被迫放宽的 72 条(「癸透年干」曾放宽为【癸出干】——放宽方向全是更易命中,
//   假阳性面;实证清单见立项调查)。节气深浅谓词(冬至前後类)本版仍不做,继续按判定备注留痕。
export const 词表版本 = 'v2';

export const 谓词表: Record<string, { 参数: '天干' | '地支' | '五行' | '天干组' | '十神类' | '身势' | '柱位干' | '柱位支'; 说明: string; 可计数: boolean }> = {
  透:     { 参数: '天干',   说明: '该天干出现在四柱天干(含日干——日干本身也在天干上,是字面事实)', 可计数: true },
  藏:     { 参数: '天干',   说明: '该天干出现在四支藏干(本气/中气/余气任一)', 可计数: true },
  有:     { 参数: '天干',   说明: '透 或 藏(全盘可见)', 可计数: true },
  无:     { 参数: '天干',   说明: '非「有」——全盘不见此字', 可计数: false },
  制:     { 参数: '天干',   说明: '存在此字可制(语义等同「有」,对应典籍「有X制之」)', 可计数: false },
  支:     { 参数: '地支',   说明: '该地支出现在四支', 可计数: true },
  支五行: { 参数: '五行',   说明: '地支字面五行为该五行的支(不含藏干)', 可计数: true },
  会局:   { 参数: '五行',   说明: '四支成三合/半合/三会/半会该五行局;土局特指辰戌丑未≥3', 可计数: false },
  成派:   { 参数: '天干组', 说明: '「一派X」——该组五行全盘势成(阈值见 成派阈值,属我方操作化定义)', 可计数: false },
  十神:   { 参数: '十神类', 说明: '四柱(不含日干本身)天干+藏干中存在该十神或十神类(比劫/食伤/财/官杀/印)', 可计数: true },
  十神透: { 参数: '十神类', 说明: '同上但只看天干(不含藏干、不含日干本身)——对应典籍「干透比劫」这类明说透干的写法', 可计数: true },
  身:     { 参数: '身势',   说明: 'v1.1:日主身势(强|弱|中和),取自旺衰计分 verdict——计分产物非盘面字面,仅供条例「前提」过滤用;身势未知(未传)时恒真(不过滤,防孤立调用静默丢条例)', 可计数: false },
  柱透:   { 参数: '柱位干', 说明: 'v2:某柱天干为X,参数两字连写如「柱透:年丁」(首字∈年月日时,次字天干)——对应典籍「癸透年干」「己出月上」类明说柱位的写法', 可计数: false },
  坐支:   { 参数: '柱位支', 说明: 'v2:某柱地支为Z,参数两字连写如「坐支:时辰」——对应典籍「或生辰时」「甲申时」类明说柱位地支的写法', 可计数: false },
};

// 「一派」的操作化定义 —— ⚠ 这是我们的定义,不是典籍原文。
//   典籍只说「一派庚辛」,没给判据。为了机器可判,取:
//     该五行的含藏干加权分 ≥ 3.0(天干每字 1;地支本气 1、中气 0.5、余气 0.3,与 countWuXing 同口径)
//     且至少有一字透干(纯藏不算「一派」——「派」是显势)。
//   分数随命中一并输出,便于审计与日后调参。改阈值 = 改词表版本。
//   ★ 排除日干本身(v3.11.0 M2):「一派」说的是日主周围的势,日主自己是被论的那个人,不是「派」的一员。
//     甲行只用到 成派:庚辛/壬癸/戊己/丙丁,不含日干,无差别;但乙行原文有「或一派甲木」,
//     若把日干乙也计进去,等于白送 1.0 分进 3.0 的阈值——同一句话在比劫上比在别的十神上更容易成立。
export const 成派阈值 = { 加权分: 3.0, 需透干: true, 排除日干: true };

// ── 盘面事实层 ──────────────────────────────────────────────────────────────
export type PanFacts = {
  天干: Tiangan[];            // 年月日时(含日干)
  非日干天干: Tiangan[];      // 十神口径用
  地支: Dizhi[];
  藏干: Tiangan[];            // 四支藏干展开(含重复)
  五行加权: Record<WuXing, number>;
  会局: Partial<Record<WuXing, string>>;   // 五行 → 成局说明
  十神集: string[];           // 十神 + 十神类(去重)
  身势?: '强' | '弱' | '中和';  // v1.1:旺衰计分 verdict 映射,由 evalTiaoLi 调用方传入(可缺)
  柱: Record<Pillar, GanZhi>;  // v2:按柱原始干支(柱透/坐支 谓词用)
};

const 十神类 = (ss: ShiShen): string =>
  ss === '比肩' || ss === '劫财' ? '比劫' :
  ss === '食神' || ss === '伤官' ? '食伤' :
  ss === '偏财' || ss === '正财' ? '财' :
  ss === '七杀' || ss === '正官' ? '官杀' : '印';

export function buildFacts(siZhu: Record<Pillar, GanZhi>, dayMaster: Tiangan): PanFacts {
  const pillars: Pillar[] = ['年', '月', '日', '时'];
  const 天干 = pillars.map(p => siZhu[p].gan);
  const 地支 = pillars.map(p => siZhu[p].zhi);
  const 非日干天干 = pillars.filter(p => p !== '日').map(p => siZhu[p].gan);

  const 藏干: Tiangan[] = [];
  const 五行加权: Record<WuXing, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const g of 天干) 五行加权[GAN_WUXING[g]] += 1;
  for (const z of 地支) {
    for (const cg of ZHI_CANG_GAN[z]) {
      藏干.push(cg.gan);
      五行加权[GAN_WUXING[cg.gan]] += cg.role === '本气' ? 1 : cg.role === '中气' ? 0.5 : 0.3;
    }
  }

  // 会局 — 单一事实源:三合/三会表直接取自 zhi-relations(排盘层),不另立一份。
  const 会局: Partial<Record<WuXing, string>> = {};
  const uniq = [...new Set(地支)];
  for (const sh of SAN_HE) {
    const 在 = sh.zhi.filter(z => uniq.includes(z));
    if (在.length === 3) 会局[sh.wuxing as WuXing] = `三合${sh.wuxing}局`;
    else if (在.length === 2) {
      // 缺旺神者为「拱」(虚拱,不成局);缺生或缺库者为半合,含旺神,作成局论。
      const missIdx = sh.zhi.findIndex(z => !uniq.includes(z));
      if (missIdx !== 1 && !会局[sh.wuxing as WuXing]) 会局[sh.wuxing as WuXing] = `${sh.wuxing}局半合`;
    }
  }
  for (const sh of SAN_HUI) {
    const 在 = sh.zhi.filter(z => uniq.includes(z));
    if (在.length === 3) 会局[sh.wuxing as WuXing] = `三会${sh.wuxing}方`;
    else if (在.length === 2 && !会局[sh.wuxing as WuXing]) {
      const missIdx = sh.zhi.findIndex(z => !uniq.includes(z));
      if (missIdx !== 1) 会局[sh.wuxing as WuXing] = `${sh.wuxing}方半会`;
    }
  }
  // 土局:三合/三会无土,典籍「支成土局」指四库(辰戌丑未)成群。
  const 库 = 地支.filter(z => (['辰', '戌', '丑', '未'] as Dizhi[]).includes(z));
  if (库.length >= 3) 会局['土'] = `四库成土局(${库.join('')})`;

  // 十神 — 日干本身不是十神,故用「非日干天干 + 全部藏干」
  const 十神集 = new Set<string>();
  for (const g of [...非日干天干, ...藏干]) {
    const ss = getShiShen(dayMaster, g);
    十神集.add(ss);
    十神集.add(十神类(ss));
  }

  return { 天干, 非日干天干, 地支, 藏干, 五行加权, 会局, 十神集: [...十神集],
           柱: { 年: siZhu.年, 月: siZhu.月, 日: siZhu.日, 时: siZhu.时 } };
}

// 计数(用于 X数:A>=N)
function 计数(pred: string, arg: string, f: PanFacts, dayMaster: Tiangan): number {
  switch (pred) {
    case '透': return f.天干.filter(g => g === arg).length;
    case '藏': return f.藏干.filter(g => g === arg).length;
    case '有': return 计数('透', arg, f, dayMaster) + 计数('藏', arg, f, dayMaster);
    case '支': return f.地支.filter(z => z === arg).length;
    case '支五行': return f.地支.filter(z => ZHI_WUXING[z] === arg).length;
    case '十神': case '十神透': {
      const pool = pred === '十神透' ? f.非日干天干 : [...f.非日干天干, ...f.藏干];
      let n = 0;
      for (const g of pool) {
        const ss = getShiShen(dayMaster, g);
        if (ss === arg || 十神类(ss) === arg) n++;
      }
      return n;
    }
    default: throw new Error(`谓词 ${pred} 不支持计数`);
  }
}

function 求值原子(pred: string, arg: string, cmp: string | null, num: number | null,
                  f: PanFacts, dayMaster: Tiangan): boolean {
  if (cmp) {
    const n = 计数(pred, arg, f, dayMaster);
    switch (cmp) {
      case '>=': return n >= num!;
      case '>':  return n >  num!;
      case '=':  return n === num!;
      case '<=': return n <= num!;
      case '<':  return n <  num!;
    }
  }
  switch (pred) {
    case '透': case '藏': case '有': case '支': case '支五行': case '十神': case '十神透':
      return 计数(pred, arg, f, dayMaster) >= 1;
    case '无': return 计数('有', arg, f, dayMaster) === 0;
    case '制': return 计数('有', arg, f, dayMaster) >= 1;
    case '会局': return !!f.会局[arg as WuXing];
    case '身': return f.身势 === undefined ? true : f.身势 === arg; // 身势未知恒真(见词表说明)
    case '柱透': return f.柱[arg[0] as Pillar]?.gan === arg[1];      // v2:某柱天干为X
    case '坐支': return f.柱[arg[0] as Pillar]?.zhi === arg[1];      // v2:某柱地支为Z
    case '成派': {
      // 天干组如「庚辛」——组内各字五行须一致(词表校验已保证)
      // 「一派」说的是日主【周围】的势,故日干本身不计(见 成派阈值.排除日干)
      const wx = GAN_WUXING[arg[0] as Tiangan];
      const 分 = 成派阈值.排除日干 ? f.五行加权[wx] - (GAN_WUXING[dayMaster] === wx ? 1 : 0) : f.五行加权[wx];
      const 透了 = f.非日干天干.some(g => GAN_WUXING[g] === wx && arg.includes(g));
      return 分 >= 成派阈值.加权分 && (!成派阈值.需透干 || 透了);
    }
  }
  throw new Error(`未知谓词: ${pred}`);
}

// ── 「若」表达式:词法 + 递归下降(非 > 且 > 或) ──────────────────────────────
type Tok = { t: 'atom'; pred: string; arg: string; cmp: string | null; num: number | null }
         | { t: '且' | '或' | '非' | '(' | ')' };

// 谓词名不含 :;参数是连续汉字但不吞掉逻辑词 且/或/非(否则「透:丙且透:癸」会把「丙且透」当参数)
const ATOM_RE = /^([一-龥]+):((?:(?!且|或|非)[一-龥])+)(?:(>=|<=|>|<|=)(\d+))?/;

export function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let s = src.trim();
  while (s.length) {
    if (s[0] === ' ') { s = s.slice(1); continue; }
    if (s[0] === '(' || s[0] === '（') { out.push({ t: '(' }); s = s.slice(1); continue; }
    if (s[0] === ')' || s[0] === '）') { out.push({ t: ')' }); s = s.slice(1); continue; }
    if (s.startsWith('且')) { out.push({ t: '且' }); s = s.slice(1); continue; }
    if (s.startsWith('或')) { out.push({ t: '或' }); s = s.slice(1); continue; }
    if (s.startsWith('非')) { out.push({ t: '非' }); s = s.slice(1); continue; }
    const m = ATOM_RE.exec(s);
    if (!m) throw new Error(`「若」无法解析(词表外写法): …${s.slice(0, 12)}`);
    // 计数写法把「数」缀在谓词上:透数:丙>=2 / 十神数:比劫>=2 —— 仅在带比较式时还原
    let pred = m[1]; const arg = m[2];
    if (m[3] && pred.endsWith('数') && pred.length > 1) pred = pred.slice(0, -1);
    out.push({ t: 'atom', pred, arg, cmp: m[3] || null, num: m[4] !== undefined ? +m[4] : null });
    s = s.slice(m[0].length);
  }
  return out;
}

export function 校验若(src: string): void {
  const toks = tokenize(src);
  for (const tk of toks) {
    if (tk.t !== 'atom') continue;
    const def = 谓词表[tk.pred];
    if (!def) throw new Error(`词表外谓词「${tk.pred}」(见 谓词表)`);
    if (tk.cmp && !def.可计数) throw new Error(`谓词「${tk.pred}」不可计数,不能写 ${tk.cmp}${tk.num}`);
    const a = tk.arg;
    switch (def.参数) {
      case '天干': if (!TIANGAN.includes(a as Tiangan)) throw new Error(`「${tk.pred}:${a}」参数非合法天干`); break;
      case '地支': if (!DIZHI.includes(a as Dizhi)) throw new Error(`「${tk.pred}:${a}」参数非合法地支`); break;
      case '五行': if (!['木','火','土','金','水'].includes(a)) throw new Error(`「${tk.pred}:${a}」参数非合法五行`); break;
      case '天干组': {
        if (a.length < 1) throw new Error(`「成派:${a}」需给天干组`);
        const bad = [...a].filter(c => !TIANGAN.includes(c as Tiangan));
        if (bad.length) throw new Error(`「成派:${a}」含非天干字 ${bad.join('')}`);
        const wxs = new Set([...a].map(c => GAN_WUXING[c as Tiangan]));
        if (wxs.size !== 1) throw new Error(`「成派:${a}」组内五行不一致(${[...wxs].join('/')})——一派须同气`);
        break;
      }
      case '十神类': {
        const ok = ['比肩','劫财','食神','伤官','偏财','正财','七杀','正官','偏印','正印','比劫','食伤','财','官杀','印'];
        if (!ok.includes(a)) throw new Error(`「十神:${a}」非合法十神/十神类`);
        break;
      }
      case '身势': if (!['强','弱','中和'].includes(a)) throw new Error(`「身:${a}」参数须为 强|弱|中和`); break;
      case '柱位干':
        if (a.length !== 2 || !['年','月','日','时'].includes(a[0]) || !TIANGAN.includes(a[1] as Tiangan))
          throw new Error(`「柱透:${a}」参数须两字连写:柱位(年|月|日|时)+天干`);
        break;
      case '柱位支':
        if (a.length !== 2 || !['年','月','日','时'].includes(a[0]) || !DIZHI.includes(a[1] as Dizhi))
          throw new Error(`「坐支:${a}」参数须两字连写:柱位(年|月|日|时)+地支`);
        break;
    }
  }
  // 语法可解析性
  parse(toks);
}

type Node = { k: 'atom'; tok: Extract<Tok, { t: 'atom' }> }
          | { k: '非'; a: Node } | { k: '且' | '或'; a: Node; b: Node };

function parse(toks: Tok[]): Node {
  let i = 0;
  const peek = () => toks[i];
  const eat = (t: Tok['t']) => { if (toks[i]?.t !== t) throw new Error(`「若」语法错误:期望 ${t}`); i++; };
  function primary(): Node {
    const tk = peek();
    if (!tk) throw new Error('「若」语法错误:表达式意外结束');
    if (tk.t === '非') { i++; return { k: '非', a: primary() }; }
    if (tk.t === '(') { i++; const n = orExpr(); eat(')'); return n; }
    if (tk.t === 'atom') { i++; return { k: 'atom', tok: tk }; }
    throw new Error(`「若」语法错误:意外的 ${tk.t}`);
  }
  function andExpr(): Node { let n = primary(); while (peek()?.t === '且') { i++; n = { k: '且', a: n, b: primary() }; } return n; }
  function orExpr(): Node { let n = andExpr(); while (peek()?.t === '或') { i++; n = { k: '或', a: n, b: andExpr() }; } return n; }
  const root = orExpr();
  if (i !== toks.length) throw new Error('「若」语法错误:表达式尾部有残余');
  return root;
}

// 「若」的语法树缓存:同一条条例会被上万张盘反复求值(测试里的死条例/恒真/关系审计尤其),
// 每次重新分词+建树纯属浪费。字符串→AST 一一对应,缓存安全。
const AST_CACHE = new Map<string, Node>();
function 取AST(src: string): Node {
  let n = AST_CACHE.get(src);
  if (!n) { n = parse(tokenize(src)); AST_CACHE.set(src, n); }
  return n;
}

export function 求值若(src: string, f: PanFacts, dayMaster: Tiangan): boolean {
  const node = 取AST(src);
  const go = (n: Node): boolean =>
    n.k === 'atom' ? 求值原子(n.tok.pred, n.tok.arg, n.tok.cmp, n.tok.num, f, dayMaster)
    : n.k === '非' ? !go(n.a)
    : n.k === '且' ? go(n.a) && go(n.b)
    : go(n.a) || go(n.b);
  return go(node);
}

// ── 对外:整格求值 ──────────────────────────────────────────────────────────
export type TiaoLi = {
  id: string; 若: string; 则: string; 档: '上' | '中' | '下' | '忌';
  // 名:必填。它是 J4 体检器「解读引用的条例名必须在命中清单里」的唯一句柄——
  //   缺名就只能拿「则」截前几字凑,句柄不稳,防编造这条就形同虚设。格内不得重名。
  名: string;
  意象?: string; 细化于?: string; 两系分歧?: string; 适用?: string;
  // 判定备注:当「若」的写法偏离典籍字面时,必须在此写清为什么。
  //   典型场景:典籍说「无丙」,但本格月令藏干里恒有丙(寅藏丙),按全盘口径这条永远不可能命中
  //   ——成了死条例。此时按「天干不透」判并在这里留痕,不许悄悄改了口径当没事。
  判定备注?: string;
  // 前提(v1.1):在「若」的盘面判定之外追加的过滤条件(同一套词表语法,现仅用「身:X」)。
  //   「财多身弱」类条例书义以身不任财为前提——「若」保持纯盘面结构判定(三层分离),
  //   身势这种计分产物走前提层。前提不满足=不命中(与若不满足同效);身势未知时前提恒真。
  //   与 细化于/蕴含 链上的条例必须同前提(否则子集/蕴含关系被前提切破,test-tiaohou 会拦)。
  前提?: string;
  // 下面两个由 fixtures/bless-tiaoli-relations.ts 计算回写,不手写:
  关系?: '子集' | '互斥' | '交叠';  // 本条与 细化于 母条的实际关系(子集=会同时命中/互斥=永不同时)
  蕴含?: string[];                  // 未声明 细化于、但命中本条时必同时命中的条例(档位计会重复计入)
};
export type TiaoLiHit = TiaoLi & { 显示名: string };
export type BingItem = { 字: Tiangan; 依据: string; 在盘: boolean; 透: boolean };

export type TiaoLiResult = {
  格: string;
  词表版本: string;
  有条例: boolean;                 // 该格是否已吸收(未吸收的行留空,不报错)
  出处?: string; 级别?: string;
  命中: TiaoLiHit[];
  未命中: number;
  档位计: Record<string, number>;  // {上:n,中:n,下:n,忌:n}
  病: BingItem[];
  两系分歧?: string[];
  盘面: { 五行加权: Record<WuXing, number>; 会局: Partial<Record<WuXing, string>> };
};

const 条例库: any = (TIAOHOU_DATA as any).条例 || {};

export function evalTiaoLi(siZhu: Record<Pillar, GanZhi>, dayMaster?: Tiangan, 身势?: '强' | '弱' | '中和'): TiaoLiResult {
  const dm = dayMaster || siZhu.日.gan;
  const 格 = `${dm}/${siZhu.月.zhi}`;
  const cell = 条例库[格];
  const f = buildFacts(siZhu, dm);
  if (身势) f.身势 = 身势; // v1.1:旺衰 verdict 映射由调用方传入(enrich.ts);不传则「身:X」前提恒真
  const base: TiaoLiResult = {
    格, 词表版本, 有条例: !!cell, 命中: [], 未命中: 0,
    档位计: { 上: 0, 中: 0, 下: 0, 忌: 0 }, 病: [],
    盘面: { 五行加权: f.五行加权, 会局: f.会局 },
  };
  if (!cell) return base;                       // 尚未吸收的格:静默返回空,不抛错(分批吸收期间必须如此)

  base.出处 = cell.出处; base.级别 = cell.级别;
  if (cell.两系分歧?.length) base.两系分歧 = cell.两系分歧.map((d: any) => typeof d === 'string' ? d : d.说明);

  for (const t of (cell.条例 || []) as TiaoLi[]) {
    if (求值若(t.若, f, dm) && (!t.前提 || 求值若(t.前提, f, dm))) {
      base.命中.push({ ...t, 显示名: t.名 });
      base.档位计[t.档] = (base.档位计[t.档] || 0) + 1;
    } else base.未命中++;
  }
  for (const b of (cell.病 || []) as Array<{ 字: Tiangan; 依据: string }>) {
    base.病.push({
      字: b.字, 依据: b.依据,
      在盘: 计数('有', b.字, f, dm) > 0,
      透: 计数('透', b.字, f, dm) > 0,
    });
  }
  return base;
}

// 词表自检:tiaohou.json 里所有「若」是否都在词表内且可解析。测试与 schema-check 共用。
export function 校验全部条例(): string[] {
  const errs: string[] = [];
  for (const [格, cell] of Object.entries<any>(条例库)) {
    if (格.startsWith('_')) continue;
    const ids = new Set<string>(); const 名集 = new Set<string>();
    for (const t of (cell.条例 || [])) {
      if (!t.id) { errs.push(`[${格}] 有条例缺 id`); continue; }
      if (ids.has(t.id)) errs.push(`[${格}] id 重复: ${t.id}`);
      ids.add(t.id);
      if (!t.名) errs.push(`[${格}/${t.id}] 缺「名」(J4 防编造的句柄,必填)`);
      else if (名集.has(t.名)) errs.push(`[${格}] 名重复: ${t.名} —— 格内重名会让 J4 无法定位是哪一条`);
      else 名集.add(t.名);
      if (!t.则) errs.push(`[${格}/${t.id}] 缺「则」(典籍原判不得为空)`);
      if (!['上', '中', '下', '忌'].includes(t.档)) errs.push(`[${格}/${t.id}] 档非法: ${t.档}`);
      try { 校验若(t.若); } catch (e: any) { errs.push(`[${格}/${t.id}] ${e.message}`); }
      // v1.1 三层分离守门:「若」=纯盘面判定,不得用「身」谓词(计分产物);「前提」过同一套词表校验,
      // 且现阶段只允许身势过滤(扩前提用途须改词表版本再拍板)
      if (/身:/.test(t.若)) errs.push(`[${格}/${t.id}] 「若」不得使用「身:」谓词(计分产物走「前提」,三层分离)`);
      if (t.前提) {
        try { 校验若(t.前提); } catch (e: any) { errs.push(`[${格}/${t.id}] 前提: ${e.message}`); }
        if (!/^身:(强|弱|中和)$/.test(t.前提.trim())) errs.push(`[${格}/${t.id}] 前提现阶段仅允许单一「身:强|弱|中和」,得到「${t.前提}」`);
      }
    }
    for (const t of (cell.条例 || [])) {
      if (t.细化于 && !ids.has(t.细化于)) errs.push(`[${格}/${t.id}] 细化于 指向不存在的 id: ${t.细化于}`);
    }
  }
  return errs;
}

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAnalysis = checkAnalysis;
exports.checkMbti = checkMbti;
// check-analysis.ts — 海报 analysis.json 确定性体检(评审—重生 Pass 的脚本侧) v1
// ---------------------------------------------------------------------------
// 分工:本脚本查机器可判的形态红线(合法性/禁词/句式/白名单/着色/计数);
//       语义质量(锚定/落地/口吻/护栏)由 prompts/bazi-poster-review.md 评审遍查。
// 用法: node check-analysis.js --analysis=analysis.json --chart=chart.json [--currentYear=YYYY]
// 输出: 逐字段报告(stdout JSON);任一 FAIL → exit 1(FAIL 字段应送回评审遍重生)。
// ---------------------------------------------------------------------------
const fs = __importStar(require("fs"));
const strip = (s) => String(s || '').replace(/<[^>]+>/g, '');
const sentences = (s) => strip(s).split(/[。！？!?]/).map(x => x.trim()).filter(Boolean);
// v3.2.3(用户定) 童年断言细则:「从小」只能接气质不能接行为——童年限定词与可证伪动作词同句即违规
const CHILD_MARK = /(从小|小时候|打小|孩提|学生时代|少年时|童年)/;
const CHILD_ACT = /(习惯|牵头|攒局|张罗|带头|组织|分工|派活|主持|带队|发起|当班长|当过|干过|做过|拉着|老是|总能把|就爱管)/;
function childhoodViolations(text) {
    const out = [];
    for (const sent of String(text).replace(/<[^>]+>/g, '').split(/[。！？!?\n]/)) {
        if (CHILD_MARK.test(sent) && CHILD_ACT.test(sent))
            out.push(sent.trim().slice(0, 40));
    }
    return out;
}
function checkAnalysis(a, chart, currentYear) {
    const R = {};
    const put = (k, bad, warn = []) => {
        R[k] = { status: bad.length ? 'FAIL' : (warn.length ? 'WARN' : 'PASS'), reasons: [...bad, ...warn] };
    };
    // ---- 判词:7字 或 4+4 对仗;禁格局术语 ----
    {
        const bad = [];
        const t = strip(a?.meta?.archetype_name || '');
        if (!/^[一-龥]{7}$/.test(t) && !/^[一-龥]{4}[·•・][一-龥]{4}$/.test(t))
            bad.push(`判词须7字或4+4对仗,得到「${t}」`);
        if (/[格局]{2}|身弱|身强|七杀格|正官格|偏财格/.test(t))
            bad.push('判词堆格局术语');
        put('meta.archetype_name', bad);
    }
    // ---- 全局禁词(所有解读字段) ----
    const FORBID_ALL = ['tier', 'needs_review', 'lineage_weights', '命主', '起法待核'];
    const FORBID_FREQ = ['多半是你', '你总是', '你每次', '你从不', '你一定会', '第一个想到你'];
    const FORBID_MECH = ['rubric', '算法层', '映射矩阵', '出文协议', 'v3加分', 'v4加分', '忌神折向', 'R1驿马', 'R2文', 'R3胎元', '评审遍', '体检器', '派系侧重', 'lineage'];
    const FORBID_SHUNNI = ['大凶', '灾年', '凶年', '凶星']; // 精读/时间轴措辞
    const walk = (obj, path, fn) => {
        if (typeof obj === 'string')
            fn(path, obj);
        else if (Array.isArray(obj))
            obj.forEach((v, i) => walk(v, `${path}[${i}]`, fn));
        else if (obj && typeof obj === 'object')
            for (const k of Object.keys(obj))
                walk(obj[k], path ? `${path}.${k}` : k, fn);
    };
    {
        const bad = [];
        walk(a, '', (p, v) => {
            for (const w of FORBID_ALL)
                if (v.includes(w))
                    bad.push(`${p} 含内部字段/播报腔「${w}」`);
            if (/^(hechong|yunsui|shensha|timeline)/.test(p))
                for (const w of FORBID_SHUNNI)
                    if (v.includes(w))
                        bad.push(`${p} 含绝对断语「${w}」(应用顺风/逆风)`);
            for (const w of FORBID_FREQ)
                if (v.includes(w))
                    bad.push(`${p} 含行为频率断言「${w}」(能力而非事迹:改写为能力/特质/潜力句式)`);
            for (const w of FORBID_MECH)
                if (v.includes(w))
                    bad.push(`${p} 泄漏幕后机制词「${w}」(幕后台前分离:用户只看结论)`);
            for (const c of childhoodViolations(v))
                bad.push(`${p} 童年行为断言「${c}…」(细则:从小只能接气质不能接行为,动作可证伪)`);
        });
        put('_全局禁词', bad);
    }
    // ---- 两句类:恰两句 + 下句以所以你/意味着你开头 ----
    // tg 特例:mech=上句(恰一句报盘面)、plain=下句(恰一句,以所以你开头)
    {
        const bad1 = [];
        const bad2 = [];
        const m = a?.tg?.mech_html, p = a?.tg?.plain_html;
        if (m == null)
            bad1.push('缺字段');
        else if (sentences(m).length !== 1)
            bad1.push(`上句应恰一句,实际${sentences(m).length}句`);
        if (p == null)
            bad2.push('缺字段');
        else {
            if (sentences(p).length !== 1)
                bad2.push(`下句应恰一句,实际${sentences(p).length}句`);
            if (!/^(所以你|意味着你)/.test(strip(p).trim()))
                bad2.push('下句须以「所以你/意味着你」开头');
        }
        put('tg.mech_html', bad1);
        put('tg.plain_html', bad2);
    }
    for (const [k, path] of [['dm.desc_html', a?.dm?.desc_html], ['geju.sub_html', a?.geju?.sub_html], ['wuxing.note_html', a?.wuxing?.note_html], ['yongshen.note_html', a?.yongshen?.note_html]]) {
        if (path == null) {
            put(k, [`缺字段`]);
            continue;
        }
        const bad = [];
        const ss = sentences(path);
        if (k === 'dm.desc_html') {
            // 日主固定句式:特性是…意味着你…最强的能力是…但…
            const t = strip(path);
            for (const m of ['特性是', '意味着你', '最强的能力', '但'])
                if (!t.includes(m))
                    bad.push(`日主固定句式缺「${m}」`);
        }
        else {
            if (ss.length !== 2)
                bad.push(`应恰两句,实际 ${ss.length} 句`);
            if (ss[1] && !/^(所以你|意味着你)/.test(ss[1]))
                bad.push('第二句须以「所以你/意味着你」开头');
        }
        put(k, bad);
    }
    // 缺补说明转述(wuxing)
    {
        const que = chart?.bazi?.enrichment?.用神建议?.出口?.缺补说明 || '';
        if (que && a?.wuxing?.note_html) {
            const missElems = (que.match(/缺([木火土金水])/g) || []).map((x) => x[1]);
            const covered = missElems.every((e) => strip(a.wuxing.note_html).includes(e));
            if (!covered)
                R['wuxing.note_html'] = { status: 'FAIL', reasons: [...(R['wuxing.note_html']?.reasons || []), '出口有〔缺补说明〕但未转述所缺五行'] };
        }
    }
    // ---- 四大段落:句数/字数/着色存在 ----
    for (const k of ['personality_html', 'career_html', 'marriage_html', 'health_html']) {
        const v = a?.interp?.[k];
        if (v == null) {
            put(`interp.${k}`, ['缺字段']);
            continue;
        }
        const bad = [];
        const ss = sentences(v);
        const len = strip(v).length;
        if (ss.length < 6 || len < 160)
            bad.push(`详写不足(句数${ss.length}/字数${len},要求≥6句≥160字)`);
        const g = (v.match(/hl-good/g) || []).length, r = (v.match(/class="hl"/g) || []).length;
        if (g + r < 2)
            bad.push(`着色不足(绿${g}红${r},特质短语应成段着色)`);
        put(`interp.${k}`, bad);
    }
    // 婚恋画像句式
    {
        const v = a?.interp?.marriage_html || '';
        const bad = [];
        const m = v.match(/更可能是一个([^<>]{4,40})的(男生|女生)/);
        if (!m)
            bad.push('缺正缘画像固定句式「更可能是一个…的男生/女生」');
        else {
            if (!new RegExp('hl-good[^>]*>[^<]*更可能是一个').test(v) && !/更可能是一个[^<]*<\/span>/.test(v) && !/<span class="hl-good">[^<]*更可能是一个/.test(v))
                bad.push('画像整句未加粗标绿');
            if (/(相仿或|或年长|或年轻|或同龄)/.test(m[1]))
                bad.push('画像年龄骑墙(须择一或明确改用性格轴)');
        }
        if (bad.length)
            R['interp.marriage_html'] = { status: 'FAIL', reasons: [...(R['interp.marriage_html']?.reasons || []).filter(x => !bad.includes(x)), ...bad] };
    }
    // ---- 三个精读段:3~5句 ----
    for (const [k, v] of [['hechong.reading_html', a?.hechong?.reading_html], ['yunsui.reading_html', a?.yunsui?.reading_html], ['shensha.reading_html', a?.shensha?.reading_html]]) {
        if (v == null) {
            put(k, ['缺字段']);
            continue;
        }
        const bad = [];
        const warn = [];
        const n = sentences(v).length;
        if (n < 2 || n > 6)
            bad.push(`精读段应3~5句,实际${n}句`);
        if (k === 'yunsui.reading_html') {
            const yrs = (strip(v).match(/(19|20)\d{2}/g) || []).map(Number);
            for (const y of yrs)
                if (y < currentYear - 1 || y > currentYear + 5)
                    warn.push(`提及年份${y}超出今年起5年窗口`);
        }
        put(k, bad, warn);
    }
    // ---- 正缘年龄一致性(v2.6):画像年龄词须与算法判定一致 ----
    {
        const zy = chart?.bazi?.enrichment?.正缘倾向;
        const v = String(a?.interp?.marriage_html || '');
        if (zy && v) {
            const said = [];
            if (/比你年长|年长/.test(strip(v)))
                said.push('年长');
            if (/比你年轻|年轻/.test(strip(v)))
                said.push('年轻');
            if (/同龄/.test(strip(v)))
                said.push('同龄');
            const bad = [];
            if (said.length && !said.includes(zy.年龄倾向))
                bad.push(`画像年龄词(${said.join('/')})与算法判定(${zy.年龄倾向})矛盾`);
            if (!said.length && zy.置信 === '高')
                bad.push(`判定置信高(${zy.年龄倾向})但画像未用年龄词`);
            if (bad.length)
                R['interp.marriage_html'] = { status: 'FAIL', reasons: [...(R['interp.marriage_html']?.reasons || []), ...bad] };
        }
    }
    // ---- 罕象提及(v2.5):chart 有罕象时,神煞/合冲精读段须至少点名一个罕象 ----
    {
        const rare = (chart?.bazi?.enrichment?.罕象 || []);
        if (rare.length) {
            const names = rare.map(r => String(r.名 || '').replace(/[(（].*$/, ''));
            const text = strip(String(a?.shensha?.reading_html || '')) + strip(String(a?.hechong?.reading_html || ''));
            const mentioned = names.some(n => n && text.includes(n.slice(0, 3)));
            if (!mentioned) {
                for (const k of ['shensha.reading_html', 'hechong.reading_html']) {
                    R[k] = { status: 'FAIL', reasons: [...(R[k]?.reasons || []), `盘有罕象(${names.join('/')})但精读段未提及`] };
                }
            }
        }
    }
    // ---- timeline:恰5项 + 年份∈建议节点白名单 ----
    {
        const bad = [];
        const tl = a?.timeline;
        const wl = new Set(((chart?.bazi?.enrichment?.运岁引动?.建议节点) || []).map((n) => n.年));
        if (!Array.isArray(tl) || tl.length !== 5)
            bad.push(`timeline 应恰5项,实际${Array.isArray(tl) ? tl.length : 0}`);
        else if (wl.size)
            for (const t of tl)
                if (!wl.has(+t.year))
                    bad.push(`节点年份${t.year}不在建议节点白名单`);
        put('timeline', bad);
    }
    return R;
}
// ---- v2.8: mbti 海报体检(--mode=mbti) ----
// v3.4 意象嫁接:十干→日主意象关键词(任一命中即算落锚)
const DM_IMG = {
    甲: ['大树', '参天', '乔木'], 乙: ['花草', '藤蔓', '藤', '花木'], 丙: ['太阳', '骄阳', '日光'], 丁: ['烛', '灯火', '星光'],
    戊: ['高山', '山'], 己: ['田园', '田', '沃土', '园土'], 庚: ['刀', '剑', '斧钺'], 辛: ['珠玉', '玉', '珠', '金饰'],
    壬: ['江河', '江', '河', '大水', '奔流'], 癸: ['雨露', '雨', '露', '甘霖'],
};
function checkMbti(a, chart) {
    const R = {};
    const bw = chart?.bazi?.enrichment?.八维结构 || {};
    const allowed = new Set([bw.最像类型, bw.备选类型, String(a?.meta?.tested_mbti || '').toUpperCase()].filter(Boolean));
    const bad0 = [];
    const walk = (obj, path, fn) => {
        if (typeof obj === 'string')
            fn(path, obj);
        else if (obj && typeof obj === 'object')
            for (const k of Object.keys(obj))
                walk(obj[k], path ? path + '.' + k : k, fn);
    };
    walk(a, '', (p, v) => {
        for (const w of ['tier', 'needs_review', '命主是', '大凶', '灾年'])
            if (v.includes(w))
                bad0.push(`${p} 含「${w}」`);
        for (const w of ['多半是你', '你总是', '你每次', '你从不', '你一定会', '第一个想到你'])
            if (v.includes(w))
                bad0.push(`${p} 含行为频率断言「${w}」`);
        for (const w of ['rubric', '算法层', '映射矩阵', '出文协议', 'v3加分', 'v4加分', '忌神折向', '评审遍', '体检器', '派系侧重'])
            if (v.includes(w))
                bad0.push(`${p} 泄漏幕后机制词「${w}」`);
        for (const c of childhoodViolations(v))
            bad0.push(`${p} 童年行为断言「${c}…」(从小只能接气质不能接行为)`);
        if (/你是\s*[EI][NS][TF][JP]\b/.test(v))
            bad0.push(`${p} 出现「你是X型」断言(须用最像/底盘)`);
        for (const m of v.match(/\b[EI][NS][TF][JP]\b/g) || [])
            if (!allowed.has(m))
                bad0.push(`${p} 出现盘外类型 ${m}(允许:${[...allowed].join('/')})`);
    });
    R['_全局'] = { status: bad0.length ? 'FAIL' : 'PASS', reasons: bad0 };
    for (const k of ['overview_html', 'sanguan_html', 'friends_html', 'love_html', 'work_html', 'family_html', 'hobbies_html']) {
        const v = a?.[k];
        const bad = [];
        if (v == null || v === '-') {
            R[k] = { status: 'FAIL', reasons: ['缺字段'] };
            continue;
        }
        const n = sentences(v).length;
        if (n < 4)
            bad.push(`应≥4句,实际${n}`);
        if (!/hl-good|class="hl"/.test(v))
            bad.push('无着色');
        R[k] = { status: bad.length ? 'FAIL' : 'PASS', reasons: bad };
    }
    const tested = String(a?.meta?.tested_mbti || '').trim();
    // v3.4 意象嫁接 + MBTI 主轴(用户定)
    {
        const dmGan = chart?.bazi?.siZhu?.day?.gan;
        const imgs = (dmGan && DM_IMG[dmGan]) || [];
        const hasImg = (txt) => imgs.some(k => String(txt || '').includes(k));
        if (imgs.length) {
            if (a?.mbti_tagline && !hasImg(a.mbti_tagline))
                bad0.push(`mbti_tagline 未落日主意象(意象嫁接:${dmGan}=${imgs[0]}…)`);
            if (tested && a?.diff_verdict && !hasImg(a.diff_verdict) && a?.diff_html && !hasImg(a.diff_html))
                bad0.push(`diff 判词与正文均未出现日主意象(意象嫁接铁律:${dmGan}=${imgs[0]}…)`);
        }
        const dom = chart?.bazi?.enrichment?.八维结构?.主导;
        const domDesc = { Te: '外向思维', Ti: '内向思维', Fe: '外向情感', Fi: '内向情感', Se: '外向感觉', Si: '内向感觉', Ne: '外向直觉', Ni: '收敛洞察' };
        if (dom && a?.overview_html && !String(a.overview_html).includes(dom) && !String(a.overview_html).includes(domDesc[dom] || '§'))
            bad0.push(`overview 未点名主导功能 ${dom}(叙事框架:MBTI 为主轴,八字为落锚)`);
    }
    if (tested) {
        const dv = strip(String(a?.diff_verdict || ''));
        const dvBad = [];
        if (!dv)
            dvBad.push('缺 diff_verdict 判词');
        else {
            if (!dv.startsWith('你是'))
                dvBad.push('判词须以「你是」开头');
            if (dv.length > 34)
                dvBad.push(`判词过长(${dv.length}>30字)`);
        }
        R['diff_verdict'] = { status: dvBad.length ? 'FAIL' : 'PASS', reasons: dvBad };
        const len = strip(String(a?.diff_html || '')).length;
        R['diff_html'] = { status: (len >= 400 && len <= 650) ? 'PASS' : 'FAIL', reasons: (len >= 400 && len <= 650) ? [] : [`差异版块应450~600字左右(400-650容差),实际${len}`] };
    }
    return R;
}
function main() {
    const args = {};
    for (const x of process.argv.slice(2)) {
        const m = x.match(/^--([^=]+)=(.*)$/);
        if (m)
            args[m[1]] = m[2];
    }
    if (!args.analysis || !args.chart) {
        console.error('Usage: node check-analysis.js --analysis=analysis.json --chart=chart.json [--currentYear=YYYY]');
        process.exit(1);
    }
    let a;
    try {
        a = JSON.parse(fs.readFileSync(args.analysis, 'utf-8'));
    }
    catch (e) {
        console.error(JSON.stringify({ _JSON合法性: { status: 'FAIL', reasons: [String(e.message)] } }));
        process.exit(1);
    }
    const chart = JSON.parse(fs.readFileSync(args.chart, 'utf-8'));
    const cy = args.currentYear ? +args.currentYear : new Date().getFullYear();
    const rep = (args.mode === 'mbti') ? checkMbti(a, chart) : checkAnalysis(a, chart, cy);
    const fails = Object.entries(rep).filter(([, r]) => r.status === 'FAIL');
    console.log(JSON.stringify({ 结论: fails.length ? `FAIL×${fails.length}(送回评审遍重生)` : 'ALL PASS', 明细: rep }, null, 2));
    process.exit(fails.length ? 1 : 0);
}
if (require.main === module)
    main();

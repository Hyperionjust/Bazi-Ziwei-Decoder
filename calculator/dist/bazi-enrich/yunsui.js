"use strict";
// yunsui.ts — 运岁引动:大运/流年 × 原局 + 岁运互动 v1
// ---------------------------------------------------------------------------
// 检测大运干支、流年干支与原局四柱(及流年与大运之间)的合冲刑害破穿、
// 凑局凑刑、填实虚拱,以及 岁运并临/天克地冲/伏吟/反吟 特殊标记。
// 只做中立检测+通则标注,作用取舍由解读层按流派处理。
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.gzVsChart = gzVsChart;
exports.suiVsYun = suiVsYun;
exports.analyzeYunSui = analyzeYunSui;
const tables_1 = require("./tables");
const LIU_CHONG = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' };
const LIU_HE = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };
const LIU_HAI = { 子: '未', 未: '子', 丑: '午', 午: '丑', 寅: '巳', 巳: '寅', 卯: '辰', 辰: '卯', 申: '亥', 亥: '申', 酉: '戌', 戌: '酉' };
const LIU_PO = { 子: '酉', 酉: '子', 午: '卯', 卯: '午', 辰: '丑', 丑: '辰', 戌: '未', 未: '戌', 巳: '申', 申: '巳', 寅: '亥', 亥: '寅' };
const GAN_HE = { 甲: '己', 己: '甲', 乙: '庚', 庚: '乙', 丙: '辛', 辛: '丙', 丁: '壬', 壬: '丁', 戊: '癸', 癸: '戊' };
const SAN_HE = [
    { zhi: ['申', '子', '辰'], wx: '水' }, { zhi: ['亥', '卯', '未'], wx: '木' },
    { zhi: ['寅', '午', '戌'], wx: '火' }, { zhi: ['巳', '酉', '丑'], wx: '金' }
];
const SAN_XING = [
    { zhi: ['寅', '巳', '申'], name: '恃势之刑' }, { zhi: ['丑', '戌', '未'], name: '无恩之刑' }
];
const ZI_XING = new Set(['辰', '午', '酉', '亥']);
const KU = new Set(['辰', '戌', '丑', '未']);
const GONG_HINT = { 年: '年柱(祖上/早年宫)', 月: '月柱(提纲·父母兄弟/事业宫)', 日: '日支(夫妻宫)', 时: '时柱(子女/晚年宫)' };
// 单个干支 vs 原局四柱
function gzVsChart(gz, siZhu, label) {
    const hits = [];
    const pillars = ['年', '月', '日', '时'];
    for (const p of pillars) {
        const o = siZhu[p];
        // 特殊整柱
        if (o.gan === gz.gan && o.zhi === gz.zhi) {
            hits.push({ vs: p + '柱', type: '伏吟', desc: `${label}${gz.gan}${gz.zhi}与${GONG_HINT[p]}干支全同,伏吟(呻吟反复之象)` });
            continue;
        }
        const ganKe = (0, tables_1.shengKe)(tables_1.GAN_WUXING[gz.gan], tables_1.GAN_WUXING[o.gan]) === '克' || (0, tables_1.shengKe)(tables_1.GAN_WUXING[o.gan], tables_1.GAN_WUXING[gz.gan]) === '克';
        if (ganKe && LIU_CHONG[gz.zhi] === o.zhi) {
            hits.push({ vs: p + '柱', type: '天克地冲', desc: `${label}${gz.gan}${gz.zhi}与${GONG_HINT[p]}天克地冲(反吟),动荡最烈` });
            continue;
        }
        // 天干
        if (GAN_HE[gz.gan] === o.gan)
            hits.push({ vs: p + '柱', type: '干合', desc: `${label}天干${gz.gan}合${p}干${o.gan}(合绊${p === '日' ? ',合动日主本人' : ''})` });
        // 地支
        if (LIU_CHONG[gz.zhi] === o.zhi) {
            const ku = KU.has(gz.zhi) && KU.has(o.zhi);
            hits.push({ vs: p + '柱', type: '支冲', desc: `${label}支${gz.zhi}冲${GONG_HINT[p]}${o.zhi}${p === '月' ? '——冲提纲,岁运大动' : ''}${ku ? '(库冲,主开/动库)' : ''}` });
        }
        if (LIU_HE[gz.zhi] === o.zhi)
            hits.push({ vs: p + '柱', type: '支合', desc: `${label}支${gz.zhi}合${GONG_HINT[p]}${o.zhi}(引动/合绊该宫)` });
        if (LIU_HAI[gz.zhi] === o.zhi)
            hits.push({ vs: p + '柱', type: '支害(穿)', desc: `${label}支${gz.zhi}害(穿)${GONG_HINT[p]}${o.zhi}` });
        if (LIU_PO[gz.zhi] === o.zhi)
            hits.push({ vs: p + '柱', type: '支破', desc: `${label}支${gz.zhi}破${GONG_HINT[p]}${o.zhi}(力轻)` });
        if (gz.zhi === o.zhi && ZI_XING.has(gz.zhi))
            hits.push({ vs: p + '柱', type: '自刑', desc: `${label}支${gz.zhi}与${p}支自刑` });
        if ((gz.zhi === '子' && o.zhi === '卯') || (gz.zhi === '卯' && o.zhi === '子'))
            hits.push({ vs: p + '柱', type: '相刑', desc: `${label}支${gz.zhi}刑${p}支${o.zhi}(无礼之刑)` });
    }
    // 凑三合局 / 凑全三刑(与原局任意二支)
    const chartZhis = pillars.map(p => siZhu[p].zhi);
    for (const sh of SAN_HE) {
        if (!sh.zhi.includes(gz.zhi))
            continue;
        const others = sh.zhi.filter(z => z !== gz.zhi);
        if (others.every(z => chartZhis.includes(z)))
            hits.push({ vs: '原局', type: '凑成三合', desc: `${label}支${gz.zhi}与原局${others.join('')}凑成三合${sh.wx}局(岁运结局,${sh.wx}势大增)` });
    }
    for (const sx of SAN_XING) {
        if (!sx.zhi.includes(gz.zhi))
            continue;
        const others = sx.zhi.filter(z => z !== gz.zhi);
        if (others.every(z => chartZhis.includes(z)) && !others.every(z => z === gz.zhi))
            hits.push({ vs: '原局', type: '凑全三刑', desc: `${label}支${gz.zhi}与原局${others.join('')}凑全${sx.name},刑动应期` });
    }
    return hits;
}
// 流年 vs 大运
function suiVsYun(liuNian, daYun) {
    const hits = [];
    if (liuNian.gan === daYun.gan && liuNian.zhi === daYun.zhi)
        hits.push({ vs: '大运', type: '岁运并临', desc: `流年${liuNian.gan}${liuNian.zhi}与大运干支全同,岁运并临(该年之象加倍,吉凶皆重)` });
    const ganKe = (0, tables_1.shengKe)(tables_1.GAN_WUXING[liuNian.gan], tables_1.GAN_WUXING[daYun.gan]) === '克' || (0, tables_1.shengKe)(tables_1.GAN_WUXING[daYun.gan], tables_1.GAN_WUXING[liuNian.gan]) === '克';
    if (ganKe && LIU_CHONG[liuNian.zhi] === daYun.zhi)
        hits.push({ vs: '大运', type: '天克地冲', desc: `流年与大运天克地冲,岁运交战,动荡之年` });
    else if (LIU_CHONG[liuNian.zhi] === daYun.zhi)
        hits.push({ vs: '大运', type: '支冲', desc: `流年支${liuNian.zhi}冲大运支${daYun.zhi}` });
    if (GAN_HE[liuNian.gan] === daYun.gan)
        hits.push({ vs: '大运', type: '干合', desc: `流年干${liuNian.gan}合大运干${daYun.gan}` });
    if (LIU_HE[liuNian.zhi] === daYun.zhi)
        hits.push({ vs: '大运', type: '支合', desc: `流年支${liuNian.zhi}合大运支${daYun.zhi}` });
    if (LIU_HAI[liuNian.zhi] === daYun.zhi)
        hits.push({ vs: '大运', type: '支害(穿)', desc: `流年支${liuNian.zhi}害(穿)大运支${daYun.zhi}` });
    return hits;
}
// 引动权重:重=天克地冲/伏吟/岁运并临/冲提纲; 中=支冲/自刑/凑局凑刑; 轻=其余
function hitWeight(h) {
    if (h.type === '天克地冲' || h.type === '伏吟' || h.type === '岁运并临')
        return '重';
    if (h.type === '支冲' && h.desc.includes('冲提纲'))
        return '重';
    if (h.type === '支冲' || h.type === '自刑' || h.type === '凑全三刑' || h.type === '凑成三合' || h.type === '相刑')
        return '中';
    return '轻';
}
const W_ORD = { 重: 0, 中: 1, 轻: 2 };
function analyzeYunSui(siZhu, dayun, currentYear) {
    const res = {
        说明: '运岁引动=大运/流年干支与原局(及岁运之间)的合冲刑害破穿、凑局凑刑与伏反吟。中立检测+通则标注;作用取舍与顺逆程度随所选流派与喜忌定,详见作用关系块与流派镜片。',
        大运引动: [], 当前大运流年: null, 建议节点: []
    };
    for (let i = 0; i < (dayun || []).length; i++) {
        const d = dayun[i];
        const gz = { gan: d.ganZhi.gan, zhi: d.ganZhi.zhi };
        const hits = gzVsChart(gz, siZhu, '大运');
        if (hits.length)
            res.大运引动.push({ 步: i + 1, 干支: gz.gan + gz.zhi, 年龄: `${d.startAge}-${d.endAge}岁(${d.startYear}-${d.endYear})`, hits });
    }
    const cur = (dayun || []).find(d => currentYear >= d.startYear && currentYear <= d.endYear);
    if (cur) {
        const dgz = { gan: cur.ganZhi.gan, zhi: cur.ganZhi.zhi };
        const years = (cur.liuNian || []).map((ln) => {
            const lgz = { gan: ln.ganZhi.gan, zhi: ln.ganZhi.zhi };
            return { 年: ln.year, 干支: lgz.gan + lgz.zhi, vs原局: gzVsChart(lgz, siZhu, '流年'), vs大运: suiVsYun(lgz, dgz) };
        }).filter((y) => y.vs原局.length || y.vs大运.length);
        res.当前大运流年 = { 大运: dgz.gan + dgz.zhi + `(${cur.startYear}-${cur.endYear})`, 流年: years };
    }
    // ---- v2.3 建议节点(timeline 选点白名单):每步大运取最重引动;当前大运重级流年单列 ----
    for (let i = 0; i < (dayun || []).length; i++) {
        const d = dayun[i];
        const hits = gzVsChart({ gan: d.ganZhi.gan, zhi: d.ganZhi.zhi }, siZhu, '大运');
        const best = hits.slice().sort((a, b) => W_ORD[hitWeight(a)] - W_ORD[hitWeight(b)])[0];
        res.建议节点.push({
            年: d.startYear, 岁: d.startAge, 载体: `大运${d.ganZhi.gan}${d.ganZhi.zhi}`,
            标记: best ? `${best.type}(${best.vs})` : '大运交接',
            权重: best ? hitWeight(best) : '轻',
        });
    }
    if (cur) {
        const dgz2 = { gan: cur.ganZhi.gan, zhi: cur.ganZhi.zhi };
        for (const ln of (cur.liuNian || [])) {
            const lgz = { gan: ln.ganZhi.gan, zhi: ln.ganZhi.zhi };
            const all = [...gzVsChart(lgz, siZhu, '流年'), ...suiVsYun(lgz, dgz2)];
            const heavy = all.filter(h => hitWeight(h) === '重');
            if (heavy.length)
                res.建议节点.push({
                    年: ln.year, 岁: ln.age ?? 0, 载体: `流年${lgz.gan}${lgz.zhi}`,
                    标记: heavy.map(h => h.type).join('+'), 权重: '重',
                });
        }
    }
    res.建议节点.sort((a, b) => a.年 - b.年);
    return res;
}

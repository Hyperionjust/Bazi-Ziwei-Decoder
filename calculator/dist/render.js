"use strict";
// 渲染脚本: 算法 JSON + 分析 JSON + 模板 → 单文件 HTML
//
// 用法:
//   npx tsx render.ts \
//     --chart=path/to/chart.json \
//     --analysis=path/to/analysis.json \
//     --template=../templates/report-zonghe-poster.html \
//     --output=path/to/output.html
//
// chart.json: run-chart.ts 的输出 (算法层)
// analysis.json: LLM 按 zonghe-poster.md schema 输出的 JSON
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
const fs = __importStar(require("fs"));
function parseArgs() {
    const args = {};
    for (const a of process.argv.slice(2)) {
        const m = a.match(/^--([^=]+)=(.*)$/);
        if (m)
            args[m[1]] = m[2];
    }
    return args;
}
const DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
function calcVirtualAge(birthYear, currentYear) {
    return currentYear - birthYear + 1;
}
function chartToFlat(chart, currentYear) {
    const out = {};
    const bi = chart.bazi.birthInfo;
    const bz = chart.bazi;
    const zw = chart.ziwei;
    currentYear = currentYear || new Date().getFullYear();
    const virtualAge = calcVirtualAge(bi.year, currentYear);
    // ============ META ============
    out['meta.solar_date'] = `${bi.year}-${String(bi.month).padStart(2, '0')}-${String(bi.day).padStart(2, '0')} ${String(bi.hour).padStart(2, '0')}:${String(bi.minute).padStart(2, '0')}`;
    if (zw.lunarDate) {
        out['meta.lunar_date'] = `${zw.lunarDate.year}年 ${zw.lunarDate.monthCn}月${zw.lunarDate.dayCn} ${zw.lunarDate.hourCn || ''}`.trim();
    }
    else {
        out['meta.lunar_date'] = '-';
    }
    out['meta.gender_full'] = bi.gender === 'male' ? '男（' + (zw.yinYang || '') + '）' : '女（' + (zw.yinYang || '') + '）';
    out['meta.age_virtual'] = virtualAge.toString();
    out['meta.current_year'] = currentYear.toString();
    const now = new Date();
    out['meta.gen_time'] = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    out['meta.yinyang'] = zw.yinYang || '-';
    // ============ ZIWEI META ============
    // Yiqi 没明确输出 命主/身主/子年斗君 — 从十二宫推导 / 留空
    // 简化: 默认根据命宫地支查命主, 身宫地支查身主
    const MING_ZHU = { '子': '贪狼', '丑': '巨门', '寅': '禄存', '卯': '文曲', '辰': '廉贞', '巳': '武曲', '午': '破军', '未': '武曲', '申': '廉贞', '酉': '文曲', '戌': '禄存', '亥': '巨门' };
    const SHEN_ZHU = { '子': '火星', '丑': '天相', '寅': '天梁', '卯': '天同', '辰': '文昌', '巳': '天机', '午': '火星', '未': '天相', '申': '天梁', '酉': '天同', '戌': '文昌', '亥': '天机' };
    const mingDizhi = zw.gongs[0].dizhi;
    const shenDizhi = DIZHI[zw.shenGongIndex];
    out['ziwei.ming_zhu'] = MING_ZHU[mingDizhi] || '-';
    out['ziwei.shen_zhu'] = SHEN_ZHU[shenDizhi] || '-';
    // 子年斗君: 简化处理, 按生月+生时推算复杂, 暂用身宫前后位作占位
    out['ziwei.zi_dou_jun'] = zw.ziDouJun || '-';
    out['ziwei.wuxing_ju'] = zw.wuXingJu?.name || '-';
    // ============ CORE DATA ============
    const en = bz.enrichment;
    out['core.geju'] = en?.格局?.primary || '-';
    out['core.geju_confidence'] = en?.格局?.confidence || '-';
    out['core.wangshuai_verdict'] = en?.旺衰?.verdict || '-';
    out['core.wangshuai_score'] = en?.旺衰?.score?.toString() || '-';
    // 把 score 映射到 0-100% (假设 score -10 ~ +10)
    const ws = en?.旺衰?.score ?? 0;
    out['core.wangshuai_pos_pct'] = Math.max(0, Math.min(100, Math.round((ws + 10) * 5))).toString();
    const tc = en?.调候用神 || [];
    out['core.tiaohou.0'] = tc[0] || '-';
    out['core.tiaohou.1'] = tc[1] || '-';
    out['core.tiaohou_confidence'] = '高';
    const yl = en?.五行旺相 || {};
    for (const k of ['木', '火', '土', '金', '水']) {
        out[`core.yueling.${k}`] = yl[k] || '-';
    }
    const wx = en?.五行统计?.withCangGan || en?.五行统计 || { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    for (const k of ['木', '火', '土', '金', '水'])
        out[`core.wuxing.${k}`] = wx[k] ?? '-';
    const wxMax = Math.max(...['木', '火', '土', '金', '水'].map(k => +wx[k] || 0)) || 1;
    for (const k of ['木', '火', '土', '金', '水'])
        out[`core.wuxing_pct.${k}`] = Math.round(((+wx[k] || 0) / wxMax) * 100);
    // ============ ZIWEI 12 GONGS ============
    const sihuaCharMap = { 化禄: '禄', 化权: '权', 化科: '科', 化忌: '忌' };
    for (const g of zw.gongs) {
        const mainStarsHtml = (g.mainStars && g.mainStars.length > 0)
            ? g.mainStars.map((s) => {
                const sh = (g.sihua || []).find((x) => x.star === s);
                if (sh) {
                    const huaChar = sihuaCharMap[sh.hua] || sh.hua.slice(-1);
                    return `<span class="sihua-${huaChar}">${s}<span class="sihua-tag">${huaChar}</span></span>`;
                }
                return s;
            }).join('·')
            : '<span style="color:var(--ink-faint)">无主星</span>';
        // 辅星同样要处理四化（右弼化科 / 文昌化忌 / 文曲化科 等常落辅星）
        const auxStarsHtml = (g.auxStars && g.auxStars.length > 0)
            ? g.auxStars.map((s) => {
                const sh = (g.sihua || []).find((x) => x.star === s);
                if (sh) {
                    const huaChar = sihuaCharMap[sh.hua] || sh.hua.slice(-1);
                    return `<span class="sihua-${huaChar}">${s}<span class="sihua-tag">${huaChar}</span></span>`;
                }
                return s;
            }).join('·')
            : '—';
        out[`gongs.${g.dizhi}.name`] = g.gong.endsWith('宫') ? g.gong : g.gong + '宫';
        out[`gongs.${g.dizhi}.ganzhi`] = g.tiangan + g.dizhi;
        out[`gongs.${g.dizhi}.mainStarsHtml`] = mainStarsHtml;
        out[`gongs.${g.dizhi}.auxStars`] = auxStarsHtml;
        out[`gongs.${g.dizhi}.smallStars`] = '';
        out[`gongs.${g.dizhi}.daxian_range`] = g.daXian ? `${g.daXian.startAge}-${g.daXian.endAge}` : '-';
        // 命宫红框 / 身宫徽标 / 当前大限高亮 — 数据驱动, 不硬编码到模板
        const flags = [];
        if (g.dizhi === mingDizhi)
            flags.push('ming');
        if (g.dizhi === shenDizhi)
            flags.push('shen');
        if (g.daXian && g.daXian.startAge <= virtualAge && virtualAge <= g.daXian.endAge)
            flags.push('current-daxian');
        out[`gongs.${g.dizhi}.flag`] = flags.join(' ');
        out[`gongs.${g.dizhi}.shenBadge`] = (g.dizhi === shenDizhi) ? '<span class="shen-badge">身</span>' : '';
    }
    // ============ BAZI 4 PILLARS ============
    const cangGanFmt = (arr) => (arr || []).map((x) => `${x.gan}(${x.shiShen})`).join(' ');
    const pillarKeyToCn = { year: '年', month: '月', day: '日', hour: '时' };
    for (const k of ['year', 'month', 'day', 'hour']) {
        out[`bazi.${k}.shiShen`] = bz.shiShen?.[k] || '-';
        out[`bazi.${k}.gan`] = bz.siZhu[k].gan;
        out[`bazi.${k}.zhi`] = bz.siZhu[k].zhi;
        out[`bazi.${k}.cangGanHtml`] = cangGanFmt(bz.cangGan?.[k] || []);
        out[`bazi.${k}.zhangSheng`] = bz.zhangSheng?.[k] || '-';
        out[`bazi.${k}.ziZuo`] = en?.自坐?.[pillarKeyToCn[k]] || en?.自坐?.[k] || '-';
        out[`bazi.${k}.naYin`] = bz.naYin?.[k] || '-';
    }
    out['bazi.dayunStart'] = bz.dayunStart?.toString() || '-';
    // ============ DAYUN 10 ============
    const dayunArr = (bz.dayun || []).slice(0, 10);
    let currentDayun = null;
    for (let i = 0; i < 10; i++) {
        const d = dayunArr[i];
        if (d && d.startAge <= virtualAge && virtualAge <= d.endAge)
            currentDayun = d;
    }
    for (let i = 0; i < 10; i++) {
        const d = dayunArr[i];
        if (!d) {
            ['gz', 'age_range', 'shishen', 'current_class'].forEach(f => out[`dayun.${i}.${f}`] = '-');
            continue;
        }
        out[`dayun.${i}.gz`] = d.ganZhi.gan + d.ganZhi.zhi;
        out[`dayun.${i}.age_range`] = `${d.startAge}-${d.endAge}`;
        const sg = (d.ganShiShen || '').slice(0, 1);
        const sz = (d.zhiShiShen || '').slice(0, 1);
        out[`dayun.${i}.shishen`] = sg + sz;
        out[`dayun.${i}.current_class`] = (currentDayun && d === currentDayun) ? 'current dayun' : '';
    }
    // ============ SECTION 02 阶段印证时间轴 (从 chart 算, 不靠 LLM) ============
    // 八字大运: 前 7 段
    const dayunForStage = dayunArr.slice(0, 7);
    for (let i = 0; i < 7; i++) {
        const d = dayunForStage[i];
        if (!d) {
            ['range', 'gz', 'shishen', 'current_class'].forEach(f => out[`section_02.bazi.${i}.${f}`] = '-');
            continue;
        }
        out[`section_02.bazi.${i}.range`] = `${d.startAge}-${d.endAge}`;
        out[`section_02.bazi.${i}.gz`] = d.ganZhi.gan + d.ganZhi.zhi;
        const sg = (d.ganShiShen || '').slice(0, 1);
        const sz = (d.zhiShiShen || '').slice(0, 1);
        out[`section_02.bazi.${i}.shishen`] = sg + sz;
        out[`section_02.bazi.${i}.current_class`] = (d.startAge <= virtualAge && virtualAge <= d.endAge) ? 'current' : '';
    }
    // 紫微大限: 按 startAge 排序取前 7 段
    const ziweiDaxian = zw.gongs
        .filter((g) => g.daXian)
        .map((g) => ({ startAge: g.daXian.startAge, endAge: g.daXian.endAge, gong: g.gong }))
        .sort((a, b) => a.startAge - b.startAge)
        .slice(0, 7);
    for (let i = 0; i < 7; i++) {
        const d = ziweiDaxian[i];
        if (!d) {
            ['range', 'current_class'].forEach(f => out[`section_02.ziwei.${i}.${f}`] = '-');
            continue;
        }
        out[`section_02.ziwei.${i}.range`] = `${d.startAge}-${d.endAge}`;
        out[`section_02.ziwei.${i}.current_class`] = (d.startAge <= virtualAge && virtualAge <= d.endAge) ? 'current' : '';
    }
    // ============ LIUNIAN 10 (current dayun) ============
    if (currentDayun) {
        out['liunian_dayun_label'] = `${currentDayun.ganZhi.gan}${currentDayun.ganZhi.zhi} ${currentDayun.startAge}-${currentDayun.endAge}`;
    }
    else {
        out['liunian_dayun_label'] = '-';
    }
    const liunianArr = ((currentDayun?.liuNian) || []).slice(0, 10);
    for (let i = 0; i < 10; i++) {
        const ln = liunianArr[i];
        if (!ln) {
            ['year', 'age', 'gz', 'shishen', 'current_class'].forEach(f => out[`liunian.${i}.${f}`] = '-');
            continue;
        }
        out[`liunian.${i}.year`] = ln.year;
        out[`liunian.${i}.age`] = ln.age;
        out[`liunian.${i}.gz`] = ln.ganZhi.gan + ln.ganZhi.zhi;
        out[`liunian.${i}.shishen`] = ln.ganShiShen ? (ln.ganShiShen.slice(0, 1) + (ln.zhiShiShen?.slice(0, 1) || '')) : '';
        out[`liunian.${i}.current_class`] = (ln.age === virtualAge) ? 'current' : '';
    }
    return out;
}
function analysisToFlat(analysis) {
    const out = {};
    // meta
    if (analysis.meta) {
        out['meta.archetype_name'] = analysis.meta.archetype_name;
        out['meta.axis_oneliner'] = analysis.meta.axis_oneliner;
    }
    // axes + consistency
    if (analysis.axes) {
        out['axes.bazi_main'] = analysis.axes.bazi_main;
        out['axes.ziwei_main'] = analysis.axes.ziwei_main;
    }
    if (analysis.consistency)
        out['ziwei.consistency'] = analysis.consistency;
    // strengths / weaknesses
    for (let i = 0; i < 3; i++) {
        const s = analysis.strengths?.[i] || {};
        out[`strengths.${i}.title`] = s.title || '-';
        out[`strengths.${i}.desc`] = s.desc || '-';
        const w = analysis.weaknesses?.[i] || {};
        out[`weaknesses.${i}.title`] = w.title || '-';
        out[`weaknesses.${i}.desc`] = w.desc || '-';
    }
    // section 01
    if (analysis.section_01) {
        out['section_01.text'] = analysis.section_01.text || '-';
        out['section_01.word_count'] = analysis.section_01.word_count || '-';
    }
    // section 02 - bazi/ziwei dayun ranges already from chart, only conclusion
    if (analysis.section_02) {
        out['section_02.conclusion'] = analysis.section_02.conclusion || '-';
    }
    // dim
    const dims = ['career', 'wealth', 'marriage', 'children', 'family', 'health'];
    for (const k of dims) {
        const d = analysis.dim?.[k] || {};
        out[`dim.${k}.bazi`] = d.bazi || '-';
        out[`dim.${k}.ziwei`] = d.ziwei || '-';
        out[`dim.${k}.verdict`] = d.verdict || '-';
        out[`dim.${k}.verdict_class`] = d.verdict_class || 'verdict-yes';
        out[`dim.${k}.fused`] = d.fused || '-';
    }
    // conflicts
    for (let i = 0; i < 3; i++) {
        const c = analysis.conflicts?.[i] || {};
        out[`conflicts.${i}.point`] = c.point || '-';
        out[`conflicts.${i}.bazi`] = c.bazi || '-';
        out[`conflicts.${i}.ziwei`] = c.ziwei || '-';
        out[`conflicts.${i}.impact`] = c.impact || '-';
        out[`conflicts.${i}.impact_class`] = c.impact_class || 'low';
        out[`conflicts.${i}.advice`] = c.advice || '-';
    }
    // final
    if (analysis.final) {
        out['final.life_axis'] = analysis.final.life_axis || '-';
        for (let i = 0; i < 5; i++) {
            const n = analysis.final.nodes?.[i] || {};
            out[`final.nodes.${i}.age`] = n.age || '-';
            out[`final.nodes.${i}.year`] = n.year || '-';
            out[`final.nodes.${i}.event`] = n.event || '-';
        }
        for (let i = 0; i < 3; i++) {
            const r = analysis.final.risks?.[i] || {};
            out[`final.risks.${i}.range`] = r.range || '-';
            out[`final.risks.${i}.desc`] = r.desc || '-';
        }
        for (let i = 0; i < 2; i++) {
            const l = analysis.final.leverage?.[i] || {};
            out[`final.leverage.${i}.title`] = l.title || '-';
            out[`final.leverage.${i}.desc`] = l.desc || '-';
        }
        for (let i = 0; i < 4; i++)
            out[`final.advice.${i}`] = analysis.final.advice?.[i] || '-';
    }
    // confidence
    if (analysis.confidence) {
        for (const k of ['bazi', 'ziwei', 'consistency', 'stability']) {
            out[`confidence.${k}_level`] = analysis.confidence[`${k}_level`] || '-';
            out[`confidence.${k}_score`] = analysis.confidence[`${k}_score`] || '-';
        }
        out['confidence.note'] = analysis.confidence.note || '-';
    }
    return out;
}
// ===================== BAZI-ONLY POSTER (--mode=bazi) =====================
const GAN_WX = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
const ZHI_WX = { 寅: '木', 卯: '木', 巳: '火', 午: '火', 申: '金', 酉: '金', 亥: '水', 子: '水', 辰: '土', 戌: '土', 丑: '土', 未: '土' };
const ZODIAC = { 子: '鼠', 丑: '牛', 寅: '虎', 卯: '兔', 辰: '龙', 巳: '蛇', 午: '马', 未: '羊', 申: '猴', 酉: '鸡', 戌: '狗', 亥: '猪' };
const SS_KEY = { 比肩: 'bijian', 劫财: 'jiecai', 食神: 'shishen', 伤官: 'shangguan', 偏财: 'piancai', 正财: 'zhengcai', 七杀: 'qisha', 七煞: 'qisha', 正官: 'zhengguan', 偏印: 'pianyin', 枭神: 'pianyin', 正印: 'zhengyin' };
const SS_POL = { 吉: 'good', '中性': 'neutral', 凶: 'warn' };
function shenshaByPillarBazi(chart) {
    const ss = chart.bazi?.enrichment?.神煞;
    const hits = (ss?.lineage?.hits) || ss?.hits || []; // 流派镜片优先(修:海报曾漏用中立全集)
    const m = { 年: [], 月: [], 日: [], 时: [] };
    for (const h of hits)
        for (const pl of (h.pillars || []))
            if (m[pl])
                m[pl].push(`<span class="ss-name ${SS_POL[h.polarity] || 'neutral'}">${h.name}</span>`);
    return m;
}
function chartToFlatBazi(chart, currentYear) {
    const out = {};
    const bi = chart.bazi.birthInfo, bz = chart.bazi, en = bz.enrichment || {}, zw = chart.ziwei || {};
    currentYear = currentYear || new Date().getFullYear();
    const virtualAge = currentYear - bi.year + 1;
    const p2 = (n) => String(n).padStart(2, '0');
    out['meta.solar_date'] = `${bi.year}-${p2(bi.month)}-${p2(bi.day)} ${p2(bi.hour)}:${p2(bi.minute)}`;
    out['meta.true_solar_time'] = out['meta.solar_date'];
    out['meta.solar_correction'] = '未做真太阳时校正（钟表时间）';
    out['meta.lunar_date'] = zw.lunarDate ? `${zw.lunarDate.year}年${zw.lunarDate.monthCn}月${zw.lunarDate.dayCn}` : '-';
    out['meta.gender'] = bi.gender === 'male' ? '男' : '女';
    out['meta.age_virtual'] = String(virtualAge);
    out['meta.current_year'] = String(currentYear);
    const now = new Date();
    out['meta.gen_time'] = `${now.getFullYear()}-${p2(now.getMonth() + 1)}-${p2(now.getDate())} ${p2(now.getHours())}:${p2(now.getMinutes())}`;
    out['meta.day_master'] = bz.dayMaster || bz.siZhu.day.gan;
    out['meta.zodiac'] = ZODIAC[bz.siZhu.year.zhi] || '-';
    out['meta.wangshuai'] = en.旺衰?.verdict || '-';
    out['meta.geju_full'] = en.格局?.primary || '-';
    out['meta.qiyun'] = bz.dayunStart != null ? `${bz.dayunStart}岁起运` : '-';
    out['meta.name'] = '命主';
    out['meta.birthplace'] = '-';
    out['meta.minggong'] = en.命宫 || '-';
    out['meta.taiyuan'] = en.胎元 || '-';
    out['meta.direction_note'] = '';
    const cangGanFmt = (arr) => (arr || []).map((x) => `${x.gan}(${x.shiShen || ''})`).join(' ');
    const cnMap = { year: '年', month: '月', day: '日', hour: '时' };
    const ssP = shenshaByPillarBazi(chart);
    for (const k of ['year', 'month', 'day', 'hour']) {
        const gz = bz.siZhu[k];
        out[`bazi.${k}.gan`] = gz.gan;
        out[`bazi.${k}.zhi`] = gz.zhi;
        out[`bazi.${k}.gan_wx`] = GAN_WX[gz.gan] || '-';
        out[`bazi.${k}.zhi_wx`] = ZHI_WX[gz.zhi] || '-';
        if (k !== 'day')
            out[`bazi.${k}.shiShen`] = bz.shiShen?.[k] || '-';
        out[`bazi.${k}.cangGanHtml`] = cangGanFmt(bz.cangGan?.[k]);
        out[`bazi.${k}.zhangSheng`] = bz.zhangSheng?.[k] || '-';
        out[`bazi.${k}.ziZuo`] = en.自坐?.[cnMap[k]] || en.自坐?.[k] || '-';
        out[`bazi.${k}.naYin`] = bz.naYin?.[k] || '-';
        out[`bazi.${k}.shenshaHtml`] = (ssP[cnMap[k]] || []).join(' ') || '—';
    }
    const wx = en.五行统计?.withCangGan || en.五行统计?.surface || en.五行统计 || {};
    const wxKeys = [['mu', '木'], ['huo', '火'], ['tu', '土'], ['jin', '金'], ['shui', '水']];
    let wxTotal = 0;
    for (const [, cn] of wxKeys)
        wxTotal += (+wx[cn] || 0);
    out['wuxing.total'] = String(wxTotal || 0);
    for (const [py, cn] of wxKeys) {
        const v = +wx[cn] || 0;
        out[`wuxing.${py}`] = String(v);
        out[`wuxing.${py}_pct`] = String(wxTotal ? Math.round(v / wxTotal * 100) : 0);
    }
    const tgCount = {};
    const addSS = (sx) => { if (!sx)
        return; const key = SS_KEY[sx]; if (key)
        tgCount[key] = (tgCount[key] || 0) + 1; };
    for (const k of ['year', 'month', 'hour'])
        addSS(bz.shiShen?.[k]);
    for (const k of ['year', 'month', 'day', 'hour'])
        for (const cg of (bz.cangGan?.[k] || []))
            addSS(cg.shiShen);
    const tgAll = ['bijian', 'jiecai', 'shishen', 'shangguan', 'piancai', 'zhengcai', 'qisha', 'zhengguan', 'pianyin', 'zhengyin'];
    let tgTotal = 0;
    for (const t of tgAll)
        tgTotal += (tgCount[t] || 0);
    for (const t of tgAll) {
        const n = tgCount[t] || 0;
        out[`tg.${t}_n`] = String(n);
        out[`tg.${t}_pct`] = String(tgTotal ? Math.round(n / tgTotal * 100) : 0);
    }
    const bd = en.旺衰?.breakdown || {};
    const mk = (v) => v ? ['yes', '✓'] : ['no', '✗'];
    const [dlc, dlm] = mk(bd.得令), [ddc, ddm] = mk(bd.得地), [dsc, dsm] = mk(bd.得势);
    out['dm.deling_class'] = dlc;
    out['dm.deling_mark'] = dlm;
    out['dm.dedi_class'] = ddc;
    out['dm.dedi_mark'] = ddm;
    out['dm.deshi_class'] = dsc;
    out['dm.deshi_mark'] = dsm;
    const sc = en.旺衰?.score ?? 0;
    out['dm.score_pct'] = String(Math.max(0, Math.min(100, Math.round((sc + 10) * 5))));
    out['dm.score_label'] = en.旺衰?.verdict || '-';
    out['dm.verdict'] = en.旺衰?.verdict || '-';
    out['geju.name'] = en.格局?.primary || '-';
    out['geju.confidence'] = en.格局?.confidence || '-';
    out['geju.chenge'] = en.格局?.chenge || (en.格局?.primary && en.格局.primary !== '-' ? '成格' : '-');
    const allHits = (en.神煞?.lineage?.hits) || en.神煞?.hits || []; // 流派镜片优先
    out['shensha.list_html'] = allHits.length ? allHits.map((h) => `<span class="ss-name ${SS_POL[h.polarity] || 'neutral'}">${h.name}</span>`).join(' ') : '—';
    // v1.6: 合冲刑害(作用关系)注入 — 有流派视图用流派视图,否则用 open 通则
    const ix = en.作用关系;
    const ixView = ix?.lineage || ix;
    out['hechong.policy'] = ix?.lineage ? `${ix.lineage.name}规则集` : (ix ? '通则(不限流派)' : '-');
    const stCls = (st) => (st === '生效' || st === '成局' || st === '合而化') ? 'st-on' : (st === '被解' || st === '被绊' || st === '合而不化(绊)') ? 'st-off' : 'st-mid';
    const ixItems = (ixView?.items) || [];
    out['hechong.rows_html'] = ixItems.length ? ixItems.map((r) => `<div class="hc-row"><span class="hc-type">${r.type}</span><span class="hc-mem">${(r.members || []).join('')}(${(r.pillars || []).join('-')}·${r.distance})</span><span class="hc-status ${stCls(r.status)}">【${r.status}】</span><span class="hc-cause">${r.cause || ''}</span></div>`).join('') : '<div class="hc-row"><span class="hc-cause">本盘干支之间无显著合冲刑害关系</span></div>';
    // v1.6: 运岁引动注入 — 大运引动全列 + 当前大运流年(有引动的年份)
    const ys = en.运岁引动;
    const ysRows = [];
    for (const dstep of (ys?.大运引动 || [])) {
        for (const h of (dstep.hits || []))
            ysRows.push(`<div class="hc-row"><span class="hc-type">${h.type}</span><span class="hc-mem">大运${dstep.干支} ${dstep.年龄}</span><span class="hc-cause">${h.desc}</span></div>`);
    }
    for (const y of (ys?.当前大运流年?.流年 || [])) {
        if (y.年 < currentYear || y.年 >= currentYear + 5)
            continue; // 【用户定】海报只看今年起未来5年
        const all = [...(y.vs原局 || []), ...(y.vs大运 || [])];
        if (all.length)
            ysRows.push(`<div class="hc-row"><span class="hc-type">流年</span><span class="hc-mem">${y.年} ${y.干支}</span><span class="hc-cause">${all.map((h) => `[${h.type}]`).join('')} ${all.map((h) => h.desc.replace(/^(大运|流年)/, '')).join(';')}</span></div>`);
    }
    out['yunsui.rows_html'] = ysRows.length ? ysRows.join('') : '<div class="hc-row"><span class="hc-cause">运岁与原局无显著引动</span></div>';
    out['hechong.reading_html'] = '-';
    out['yunsui.reading_html'] = '-';
    out['shensha.reading_html'] = '-';
    const dyArr = (bz.dayun || []).slice(0, 10);
    let curDy = null;
    for (const d of dyArr)
        if (d.startAge <= virtualAge && virtualAge <= d.endAge)
            curDy = d;
    for (let i = 0; i < 10; i++) {
        const d = dyArr[i];
        if (!d) {
            ['gz', 'age_range', 'shishen', 'start_year'].forEach(f => out[`dayun.${i}.${f}`] = '-');
            out[`dayun.${i}.current_class`] = '';
            out[`dayun.${i}.luck_class`] = 'luck-ping';
            continue;
        }
        out[`dayun.${i}.gz`] = d.ganZhi.gan + d.ganZhi.zhi;
        out[`dayun.${i}.age_range`] = `${d.startAge}-${d.endAge}`;
        out[`dayun.${i}.start_year`] = String(d.startYear || '-');
        out[`dayun.${i}.shishen`] = ((d.ganShiShen || '').slice(0, 1)) + ((d.zhiShiShen || '').slice(0, 1));
        out[`dayun.${i}.current_class`] = (curDy && d === curDy) ? 'current' : '';
        out[`dayun.${i}.luck_class`] = 'luck-ping';
    }
    out['dayun.head_note'] = '';
    // 未起运(当前年不在任何大运内):合成 currentYear 起 10 个流年干支,避免整条裸横杠
    const GAN10 = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'], ZHI12 = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    const gzOfYear = (y) => GAN10[(y - 4) % 10] + ZHI12[(y - 4) % 12];
    let lnSrc = (curDy?.liuNian) || [];
    let synth = false;
    if (!lnSrc.length) {
        synth = true;
        lnSrc = Array.from({ length: 10 }, (_, i) => ({ year: currentYear + i, ganZhi: { gan: gzOfYear(currentYear + i)[0], zhi: gzOfYear(currentYear + i)[1] }, age: (currentYear + i) - bi.year + 1 }));
    }
    const lnArr = lnSrc.slice(0, 10);
    if (synth)
        out['liunian.head_note'] = '尚未起运·列当前年起十年';
    for (let i = 0; i < 10; i++) {
        const ln = lnArr[i];
        if (!ln) {
            ['year', 'gz', 'shishen'].forEach(f => out[`liunian.${i}.${f}`] = '-');
            out[`liunian.${i}.current_class`] = '';
            out[`liunian.${i}.luck_class`] = 'luck-ping';
            continue;
        }
        out[`liunian.${i}.year`] = String(ln.year);
        out[`liunian.${i}.gz`] = ln.ganZhi.gan + ln.ganZhi.zhi;
        out[`liunian.${i}.shishen`] = ln.ganShiShen ? ((ln.ganShiShen.slice(0, 1)) + ((ln.zhiShiShen?.slice(0, 1)) || '')) : '';
        out[`liunian.${i}.current_class`] = (ln.age === virtualAge) ? 'current' : '';
        out[`liunian.${i}.luck_class`] = 'luck-ping';
    }
    if (!synth)
        out['liunian.head_note'] = '';
    return out;
}
// v1.6.1: 用/忌/喜/调候字段的干支五行元素自动加色块(连续同五行字符并为一个 chip)
function wxChip(s) {
    if (!s || typeof s !== 'string' || s.includes('wx-chip'))
        return s;
    return s.replace(/[甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥木火土金水]+/g, (run) => {
        const wxOf = (ch) => GAN_WX[ch] || ZHI_WX[ch] || ('木火土金水'.includes(ch) ? ch : '');
        const first = wxOf(run[0]);
        if (first && [...run].every(c => wxOf(c) === first)) {
            return `<span class="wx-chip wx-${first}">${run}</span>`;
        }
        return [...run].map(c => { const w = wxOf(c); return w ? `<span class="wx-chip wx-${w}">${c}</span>` : c; }).join('');
    });
}
function analysisToFlatBazi(a) {
    const out = {};
    if (a.meta) {
        if (a.meta.archetype_name)
            out['meta.archetype_name'] = a.meta.archetype_name;
        if (a.meta.axis_oneliner)
            out['meta.axis_oneliner'] = a.meta.axis_oneliner;
        if (a.meta.name)
            out['meta.name'] = a.meta.name;
        if (a.meta.direction_note)
            out['meta.direction_note'] = a.meta.direction_note;
    }
    if (a.dm?.desc_html)
        out['dm.desc_html'] = a.dm.desc_html;
    if (a.geju?.sub_html)
        out['geju.sub_html'] = a.geju.sub_html;
    if (a.wuxing?.note_html)
        out['wuxing.note_html'] = a.wuxing.note_html;
    if (a.tg) {
        if (a.tg.mech_html)
            out['tg.mech_html'] = a.tg.mech_html;
        if (a.tg.plain_html)
            out['tg.plain_html'] = a.tg.plain_html;
    }
    if (a.yongshen)
        for (const k of ['yong_html', 'ji_html', 'xi_text', 'tiaohou_html'])
            if (a.yongshen[k] != null)
                out[`yongshen.${k}`] = wxChip(a.yongshen[k]);
    if (a.yongshen?.note_html != null)
        out['yongshen.note_html'] = a.yongshen.note_html;
    if (a.interp)
        for (const k of ['personality_html', 'career_html', 'marriage_html', 'health_html'])
            if (a.interp[k] != null)
                out[`interp.${k}`] = a.interp[k];
    if (a.kaiyun)
        for (const k of ['fang_html', 'se_html', 'shu_html', 'ye', 'place_html', 'item_html', 'skill_html', 'note_html'])
            if (a.kaiyun[k] != null)
                out[`kaiyun.${k}`] = a.kaiyun[k];
    for (const k of ['tiaohou_html', 'yong_html'])
        if (a.kaiyun?.[k] != null)
            out[`kaiyun.${k}`] = wxChip(a.kaiyun[k]);
    if (a.hechong?.reading_html)
        out['hechong.reading_html'] = a.hechong.reading_html;
    if (a.yunsui?.reading_html)
        out['yunsui.reading_html'] = a.yunsui.reading_html;
    if (a.shensha?.reading_html)
        out['shensha.reading_html'] = a.shensha.reading_html;
    if (Array.isArray(a.timeline))
        for (let i = 0; i < 5; i++) {
            const t = a.timeline[i] || {};
            for (const f of ['age', 'year', 'run', 'run_class', 'desc', 'marker_class'])
                out[`timeline.${i}.${f}`] = t[f] != null ? t[f] : '-';
        }
    if (a.dayun_head_note)
        out['dayun.head_note'] = a.dayun_head_note;
    if (a.liunian_head_note)
        out['liunian.head_note'] = a.liunian_head_note;
    if (Array.isArray(a.dayun_luck))
        a.dayun_luck.forEach((v, i) => { if (i < 10 && v)
            out[`dayun.${i}.luck_class`] = v; });
    if (Array.isArray(a.liunian_luck))
        a.liunian_luck.forEach((v, i) => { if (i < 10 && v)
            out[`liunian.${i}.luck_class`] = v; });
    return out;
}
function renderTemplate(template, data) {
    let html = template;
    // 第一轮: 精确替换
    for (const k of Object.keys(data)) {
        const re = new RegExp(`\\{\\{${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g');
        html = html.replace(re, String(data[k]));
    }
    // 兜底: 剩余未匹配占位符替换为 '-'
    html = html.replace(/\{\{[a-zA-Z0-9_.]+\}\}/g, '-');
    return html;
}
function main() {
    const args = parseArgs();
    if (!args.chart || !args.template) {
        console.error('Usage: npx tsx render.ts --chart=chart.json [--analysis=analysis.json] --template=path/to/template.html [--output=out.html] [--mode=zonghe|bazi] [--currentYear=YYYY] [--name=命主姓名]');
        process.exit(1);
    }
    const chart = JSON.parse(fs.readFileSync(args.chart, 'utf-8'));
    const analysis = args.analysis ? JSON.parse(fs.readFileSync(args.analysis, 'utf-8')) : {};
    const template = fs.readFileSync(args.template, 'utf-8');
    const mode = args.mode || 'zonghe';
    let data;
    if (mode === 'bazi') {
        data = { ...chartToFlatBazi(chart, args.currentYear ? +args.currentYear : undefined), ...analysisToFlatBazi(analysis) };
    }
    else {
        data = { ...chartToFlat(chart, args.currentYear ? +args.currentYear : undefined), ...analysisToFlat(analysis) };
    }
    if (args.name)
        data['meta.name'] = args.name; // --name 兜底(analysis 未给姓名时)
    // 规格对齐校验:dayun_luck/liunian_luck 长度与数据源不一致时给 warning(不中断)
    if (mode === 'bazi') {
        const steps = (chart.bazi?.dayun || []).length;
        if (Array.isArray(analysis.dayun_luck) && analysis.dayun_luck.length !== steps)
            console.error(`[render][warn] dayun_luck 项数(${analysis.dayun_luck.length}) ≠ 算法层大运步数(${steps}),多余项忽略/缺项按 luck-ping`);
        if (Array.isArray(analysis.liunian_luck) && analysis.liunian_luck.length !== 10)
            console.error(`[render][warn] liunian_luck 项数(${analysis.liunian_luck.length}) ≠ 10,多余项忽略/缺项按 luck-ping`);
    }
    const html = renderTemplate(template, data);
    if (args.output) {
        fs.writeFileSync(args.output, html, 'utf-8');
        console.error(`Rendered HTML written to ${args.output}`);
    }
    else {
        process.stdout.write(html);
    }
}
main();

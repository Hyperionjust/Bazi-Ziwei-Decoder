"use strict";
// 排盘单一入口 — 输入生辰, 输出完整 JSON (Yiqi createChart + enrichBazi + 神煞)
//
// 用法:
//   npx tsx run-chart.ts --year=2000 --month=1 --day=1 --hour=12 --minute=0 --gender=male
//   可选: --isLunar=true --timeZone=8 --output=path/to/file.json
//   可选: --lineage=ziping|ditian|shenfeng|mangpai|duanshi|open
//          (流派仅用于"出文镜片"——过滤+权重展示, 绝不改排盘; 不传则只写中立全集)
//
// 不指定 --output 则打印到 stdout
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
const index_1 = require("./yiqi-core/index");
const bazi_1 = require("./yiqi-core/bazi");
const enrich_1 = require("./bazi-enrich/enrich");
const shensha_1 = require("./shensha");
const interactions_1 = require("./bazi-enrich/interactions");
const yunsui_1 = require("./bazi-enrich/yunsui");
const rare_1 = require("./bazi-enrich/rare");
const zhengyuan_1 = require("./bazi-enrich/zhengyuan");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function parseArgs() {
    const args = {};
    for (const a of process.argv.slice(2)) {
        const m = a.match(/^--([^=]+)=(.*)$/);
        if (m)
            args[m[1]] = m[2];
    }
    return args;
}
// 数据文件(shensha.json/lineages.json)解析: 兼容 tsx(calculator/) 与 node dist/(dist/.. = calculator/)
function resolveData(name) {
    const cands = [path.join(__dirname, name), path.join(__dirname, '..', name)];
    for (const c of cands)
        if (fs.existsSync(c))
            return c;
    return cands[0];
}
function main() {
    const args = parseArgs();
    const required = ['year', 'month', 'day', 'hour', 'minute', 'gender'];
    for (const k of required) {
        if (!args[k]) {
            console.error(`Missing required arg: --${k}=...`);
            console.error('Usage: npx tsx run-chart.ts --year=2000 --month=1 --day=1 --hour=12 --minute=0 --gender=male');
            process.exit(1);
        }
    }
    const gender = args.gender === 'male' || args.gender === 'female' ? args.gender : (args.gender === '男' ? 'male' : 'female');
    const birthInfo = {
        year: +args.year,
        month: +args.month,
        day: +args.day,
        hour: +args.hour,
        minute: +args.minute,
        isLunar: args.isLunar === 'true',
        gender: gender,
        timeZone: args.timeZone ? +args.timeZone : 8,
    };
    // v2.0.1: 输入校验 — 防 2/30 之类无效日期被 JS Date 静默滚动成合法盘(一步错满盘垮)
    const fail = (msg) => { console.error(`[input] ${msg}`); process.exit(1); };
    const bi = birthInfo;
    if (!Number.isInteger(bi.year) || bi.year < 1900 || bi.year > 2100)
        fail(`year 无效或超范围(1900-2100): ${args.year}`);
    if (!Number.isInteger(bi.month) || bi.month < 1 || bi.month > 12)
        fail(`month 无效(1-12): ${args.month}`);
    if (!Number.isInteger(bi.hour) || bi.hour < 0 || bi.hour > 23)
        fail(`hour 无效(0-23): ${args.hour}`);
    if (!Number.isInteger(bi.minute) || bi.minute < 0 || bi.minute > 59)
        fail(`minute 无效(0-59): ${args.minute}`);
    if (!Number.isInteger(bi.day) || bi.day < 1)
        fail(`day 无效: ${args.day}`);
    if (!bi.isLunar) {
        const daysInMonth = new Date(bi.year, bi.month, 0).getDate();
        if (bi.day > daysInMonth)
            fail(`无效公历日期: ${bi.year}-${bi.month}-${bi.day}(该月只有 ${daysInMonth} 天)`);
    }
    else {
        if (bi.day > 30)
            fail(`无效农历日期: 农历日最大 30, 得到 ${bi.day}`);
    }
    // Step 1: Yiqi 算法层 — 四柱+紫微+大运+流年
    const chart = (0, index_1.createChart)(birthInfo);
    // 附加地支藏干 (含十神)
    const dm = chart.bazi.dayMaster;
    const z = chart.bazi.siZhu;
    chart.bazi.cangGan = {
        year: (0, bazi_1.getZhiCangGanFull)(z.year.zhi, dm),
        month: (0, bazi_1.getZhiCangGanFull)(z.month.zhi, dm),
        day: (0, bazi_1.getZhiCangGanFull)(z.day.zhi, dm),
        hour: (0, bazi_1.getZhiCangGanFull)(z.hour.zhi, dm),
    };
    // 补 endAge 字段 (Yiqi 只给了 startAge/endYear, OpenClaw 等下游脚本会查 endAge)
    if (chart.bazi.dayun && Array.isArray(chart.bazi.dayun)) {
        for (const d of chart.bazi.dayun) {
            if (d.startAge !== undefined && d.endAge === undefined) {
                d.endAge = d.startAge + 9;
            }
        }
    }
    // Step 2: enrichBazi 补层 — 格局/旺衰/调候/刑冲合害/盖头
    const siZhuForEnrich = {
        '年': chart.bazi.siZhu.year,
        '月': chart.bazi.siZhu.month,
        '日': chart.bazi.siZhu.day,
        '时': chart.bazi.siZhu.hour,
    };
    chart.bazi.enrichment = (0, enrich_1.enrichBazi)(siZhuForEnrich);
    // Step 3: 神煞补层 — 算法层算"全集"(流派中立, 用 open 派 policy), 写进 bazi.enrichment.神煞
    //          流派权重/过滤是"解读层镜片", 仅在传 --lineage 时附加一份过滤视图, 绝不改四柱排盘。
    try {
        const defs = JSON.parse(fs.readFileSync(resolveData('shensha.json'), 'utf-8'));
        const lin = JSON.parse(fs.readFileSync(resolveData('lineages.json'), 'utf-8'));
        const shenChart = { siZhu: chart.bazi.siZhu, gender: birthInfo.gender };
        const fullHits = (0, shensha_1.computeShensha)(shenChart, defs, lin.lineages['open'].shensha_policy);
        // v1.6: 每个命中附「派系侧重」(各传统流派对该神煞的使用权重),供 open 模式解读时标注强弱分歧
        const LK_CN = { ziping: '子平', ditian: '滴天髓', shenfeng: '神峰', mangpai: '盲派(含段氏)' }; // v2.0 段氏并入盲派
        const defById = {};
        for (const sd of defs.shensha)
            defById[sd.id] = sd;
        for (const h of fullHits) {
            const lw = {};
            for (const [lk, cn] of Object.entries(LK_CN)) {
                const pol = lin.lineages[lk]?.shensha_policy;
                if (!pol)
                    continue;
                let w = 0;
                if (!(pol.blacklist || []).includes(h.id)) {
                    const raw = pol.whitelist?.[h.id];
                    const tier = defById[h.id]?.tier;
                    if (tier === 'MODERN')
                        w = typeof raw === 'number' ? raw : 0;
                    else if (typeof raw === 'number')
                        w = raw;
                    else if (typeof raw === 'string')
                        w = 0;
                    else
                        w = pol.default_weight || 0;
                }
                lw[cn] = w;
            }
            h.lineage_weights = lw;
        }
        const enr = chart.bazi.enrichment || (chart.bazi.enrichment = {});
        enr.神煞 = { policy: 'open(全集·流派中立)', hits: fullHits };
        const lineageKey = args.lineage === 'duanshi' ? 'mangpai' : args.lineage; // v2.0 段氏并入盲派(别名兼容)
        if (args.lineage === 'duanshi')
            console.error('[lineage] 段氏已并入盲派镜片(段氏特有技法在解读中标注〔段氏〕),按 mangpai 计算');
        if (lineageKey && lin.lineages[lineageKey]) {
            const L = lin.lineages[lineageKey];
            const pol = L.shensha_policy || { default_weight: 0, whitelist: {}, blacklist: [] };
            // open 镜片直接复用全集(含派系侧重字段);其余派重算过滤视图
            const linHits = lineageKey === 'open' ? fullHits : (0, shensha_1.computeShensha)(shenChart, defs, pol);
            enr.神煞.lineage = { id: lineageKey, name: L.name, hits: linHits };
            chart.meta = Object.assign({}, chart.meta, { lineage: lineageKey, lineageName: L.name });
        }
        else if (lineageKey) {
            console.error(`[shensha] 未知流派 '${lineageKey}', 已忽略(仅写中立全集)`);
        }
        // Step 3.5: 合冲刑害作用裁决(v1.5) — 中立视图按 open 通则(带分歧标注),
        //           传 --lineage 时另附该派规则集裁决视图;运岁引动为中立检测。
        try {
            const siZhuCN = {
                年: chart.bazi.siZhu.year, 月: chart.bazi.siZhu.month,
                日: chart.bazi.siZhu.day, 时: chart.bazi.siZhu.hour,
            };
            const openIP = lin.lineages['open'].interaction_policy;
            if (openIP) {
                enr.作用关系 = { policy: 'open(通则+分歧标注)', ...(0, interactions_1.adjudicateInteractions)(siZhuCN, openIP) };
                const lk = args.lineage === 'duanshi' ? 'mangpai' : args.lineage;
                if (lk && lin.lineages[lk] && lk !== 'open' && lin.lineages[lk].interaction_policy) {
                    enr.作用关系.lineage = { id: lk, name: lin.lineages[lk].name,
                        ...(0, interactions_1.adjudicateInteractions)(siZhuCN, lin.lineages[lk].interaction_policy) };
                }
            }
            const curYear = args.currentYear ? parseInt(args.currentYear, 10) : new Date().getFullYear();
            enr.运岁引动 = (0, yunsui_1.analyzeYunSui)(siZhuCN, chart.bazi.dayun || [], curYear);
            // v2.5: 罕象检测(四库全/德秀满盘/三德会聚等) — 罕见度由算法定义,解读层优先讲解
            enr.罕象 = (0, rare_1.detectRarePatterns)(siZhuCN, fullHits, enr.地支关系 || [], enr.天干关系 || []);
            // v2.6: 正缘倾向判定(年长/年轻/同龄) — 通行断法确定性计算,画像年龄照抄不裁量
            enr.正缘倾向 = (0, zhengyuan_1.judgeSpouseProfile)(siZhuCN, birthInfo.gender);
            // v1.6.2: 胎元(月干进一,月支进三) + 命宫(14/26 减月时支数,五虎遁取干)
            const GAN10 = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
            const ZHI12 = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
            const mGan = chart.bazi.siZhu.month.gan, mZhi = chart.bazi.siZhu.month.zhi, hZhi = chart.bazi.siZhu.hour.zhi;
            const taiGan = GAN10[(GAN10.indexOf(mGan) + 1) % 10];
            const taiZhi = ZHI12[(ZHI12.indexOf(mZhi) + 3) % 12];
            enr.胎元 = taiGan + taiZhi;
            // 支数以寅=1…丑=12
            const numOf = (z) => ((ZHI12.indexOf(z) - 2 + 12) % 12) + 1;
            const sum = numOf(mZhi) + numOf(hZhi);
            const n = (sum < 14 ? 14 : 26) - sum; // 命宫支数(寅=1)
            const mgZhi = ZHI12[(n - 1 + 2) % 12];
            // 五虎遁:年干起寅月干,顺数至命宫支
            const WUHU = { 甲: '丙', 己: '丙', 乙: '戊', 庚: '戊', 丙: '庚', 辛: '庚', 丁: '壬', 壬: '壬', 戊: '甲', 癸: '甲' };
            const yinGan = WUHU[chart.bazi.siZhu.year.gan];
            const steps = (ZHI12.indexOf(mgZhi) - 2 + 12) % 12; // 从寅数到命宫支
            const mgGan = GAN10[(GAN10.indexOf(yinGan) + steps) % 10];
            enr.命宫 = mgGan + mgZhi;
        }
        catch (e) {
            console.error('[interactions] 计算跳过(非致命):', e?.message || e);
        }
    }
    catch (e) {
        console.error('[shensha] 计算跳过(非致命):', e?.message || e);
    }
    const json = JSON.stringify(chart, null, 2);
    if (args.output) {
        fs.writeFileSync(args.output, json, 'utf-8');
        console.error(`Chart written to ${args.output}`);
    }
    else {
        process.stdout.write(json);
    }
}
main();

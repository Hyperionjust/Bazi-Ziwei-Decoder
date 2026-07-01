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
        const enr = chart.bazi.enrichment || (chart.bazi.enrichment = {});
        enr.神煞 = { policy: 'open(全集·流派中立)', hits: fullHits };
        const lineageKey = args.lineage;
        if (lineageKey && lin.lineages[lineageKey]) {
            const L = lin.lineages[lineageKey];
            const pol = L.shensha_policy || { default_weight: 0, whitelist: {}, blacklist: [] };
            const linHits = (0, shensha_1.computeShensha)(shenChart, defs, pol);
            enr.神煞.lineage = { id: lineageKey, name: L.name, hits: linHits };
            chart.meta = Object.assign({}, chart.meta, { lineage: lineageKey, lineageName: L.name });
        }
        else if (lineageKey) {
            console.error(`[shensha] 未知流派 '${lineageKey}', 已忽略(仅写中立全集)`);
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

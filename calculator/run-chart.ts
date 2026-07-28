// 排盘单一入口 — 输入生辰, 输出完整 JSON (Yiqi createChart + enrichBazi + 神煞)
//
// 用法:
//   npx tsx run-chart.ts --year=2000 --month=1 --day=1 --hour=12 --minute=0 --gender=male
//   可选: --isLunar=true (农历输入, v3.5 起真正生效; 闰月传负月, 如 --month=-2 表示闰二月)
//   可选: --timeZone=8 (出生时时区, v3.5 起真正换算为东八区; 支持半时区如 5.5)
//   可选: --output=path/to/file.json
//   可选: --lineage=ziping|ditian|shenfeng|mangpai|duanshi|open
//          (流派仅用于"出文镜片"——过滤+权重展示, 绝不改排盘; 不传则只写中立全集)
//
// 不指定 --output 则打印到 stdout

import { createChart, resolveSolarClock } from './yiqi-core/index';
import { getZhiCangGanFull } from './yiqi-core/bazi';
import { enrichBazi } from './bazi-enrich/enrich';
import { detectShichenBoundary, zishiConventionNote } from './bazi-enrich/shichen-boundary';
import { aggregateConfidenceTier } from './bazi-enrich/confidence';
import { computeShensha } from './shensha';
import { adjudicateInteractions } from './bazi-enrich/interactions';
import { analyzeYunSui } from './bazi-enrich/yunsui';
import { detectRarePatterns } from './bazi-enrich/rare';
import { judgeSpouseProfile } from './bazi-enrich/zhengyuan';
import { judgeBaWei } from './bazi-enrich/bawei';
import { Lunar } from 'lunar-typescript';
import * as fs from 'fs';
import * as path from 'path';

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  for (const a of process.argv.slice(2)) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  }
  return args;
}

// 数据文件(shensha.json/lineages.json)解析: 兼容 tsx(calculator/) 与 node dist/(dist/.. = calculator/)
function resolveData(name: string): string {
  const cands = [path.join(__dirname, name), path.join(__dirname, '..', name)];
  for (const c of cands) if (fs.existsSync(c)) return c;
  return cands[0];
}

function main() {
  const args = parseArgs();
  const required = ['year','month','day','hour','minute','gender'];
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
    gender: gender as 'male'|'female',
    timeZone: args.timeZone ? +args.timeZone : 8,
    ...(args.longitude !== undefined ? { longitude: +args.longitude } : {}), // v3.8 真太阳时可选校正(默认关)
  };

  // v2.0.1: 输入校验 — 防 2/30 之类无效日期被 JS Date 静默滚动成合法盘(一步错满盘垮)
  const fail = (msg: string) => { console.error(`[input] ${msg}`); process.exit(1); };
  const bi = birthInfo;
  if (!Number.isInteger(bi.year) || bi.year < 1900 || bi.year > 2100) fail(`year 无效或超范围(1900-2100): ${args.year}`);
  // v3.5: 农历允许负月(闰月, 如 --month=-2 表示闰二月); 公历必须 1-12
  if (!Number.isInteger(bi.month) || bi.month === 0 || bi.month < -12 || bi.month > 12) fail(`month 无效: ${args.month}`);
  if (!bi.isLunar && (bi.month < 1 || bi.month > 12)) fail(`month 无效(公历 1-12): ${args.month}`);
  if (bi.isLunar && bi.month < 0) console.error(`[input] 农历闰月输入: 按闰${-bi.month}月处理`);
  if (!Number.isInteger(bi.hour) || bi.hour < 0 || bi.hour > 23) fail(`hour 无效(0-23): ${args.hour}`);
  if (!Number.isInteger(bi.minute) || bi.minute < 0 || bi.minute > 59) fail(`minute 无效(0-59): ${args.minute}`);
  if (args.timeZone !== undefined && (Number.isNaN(+args.timeZone) || +args.timeZone < -12 || +args.timeZone > 14))
    fail(`timeZone 无效(-12 ~ +14, 支持半时区如 5.5): ${args.timeZone}`);
  if (args.longitude !== undefined) {
    if (Number.isNaN(+args.longitude) || +args.longitude < -180 || +args.longitude > 180) fail(`longitude 无效(-180 ~ 180, 东经为正): ${args.longitude}`);
    console.error(`[input] 真太阳时校正开启: 经度 ${+args.longitude}°(经度差+均时差, 口径见 CHANGELOG)`);
  }
  if (!Number.isInteger(bi.day) || bi.day < 1) fail(`day 无效: ${args.day}`);
  if (!bi.isLunar) {
    const daysInMonth = new Date(bi.year, bi.month, 0).getDate();
    if (bi.day > daysInMonth) fail(`无效公历日期: ${bi.year}-${bi.month}-${bi.day}(该月只有 ${daysInMonth} 天)`);
  } else {
    if (bi.day > 30) fail(`无效农历日期: 农历日最大 30, 得到 ${bi.day}`);
    // v3.5: 农历日期合法性回验(如「正月三十」在无三十的年份应报错, 防静默错盘)
    try {
      const L = Lunar.fromYmd(bi.year, bi.month, bi.day);
      if (L.getMonth() !== bi.month || L.getDay() !== bi.day)
        fail(`无效农历日期: ${bi.year} 年${bi.month < 0 ? '闰' : ''}${Math.abs(bi.month)}月没有 ${bi.day} 日`);
    } catch (e: any) { fail(`无效农历日期: ${e?.message || e}`); }
  }

  // Step 1: Yiqi 算法层 — 四柱+紫微+大运+流年
  const chart: any = createChart(birthInfo);

  // 附加地支藏干 (含十神)
  const dm = chart.bazi.dayMaster;
  const z = chart.bazi.siZhu;
  chart.bazi.cangGan = {
    year: getZhiCangGanFull(z.year.zhi, dm),
    month: getZhiCangGanFull(z.month.zhi, dm),
    day:   getZhiCangGanFull(z.day.zhi, dm),
    hour:  getZhiCangGanFull(z.hour.zhi, dm),
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
  chart.bazi.enrichment = enrichBazi(siZhuForEnrich);

  // Step 2.5: 时辰边界检测(P0-A) — 时辰输入错一格则时柱/紫微命宫/大限全错。
  //   按归一化后的排盘时刻(农历→公历、时区→东八、经度校正若有)判定距时辰交界的分钟差,
  //   |Δ|≤20 分钟 → boundary:true,附相邻候选时辰;核盘流程见 SKILL.md 阻断性分支。
  try {
    const eff = resolveSolarClock(birthInfo);
    (chart.bazi.enrichment as any).时辰边界 = detectShichenBoundary(eff.hour, eff.minute, {
      corrected: birthInfo.longitude != null && Number.isFinite(+birthInfo.longitude),
    });
    // P0-B: 晚子时约定显式披露(仅出生时刻 ∈ [23:00,24:00) 时输出;实测确认引擎为换日约定)
    const zc = zishiConventionNote(eff.hour);
    if (zc) chart.bazi.zishi_convention = zc;
  } catch (e) {
    console.error('[shichen] 时辰边界检测跳过(非致命):', (e as Error)?.message || e);
  }

  // Step 3: 神煞补层 — 算法层算"全集"(流派中立, 用 open 派 policy), 写进 bazi.enrichment.神煞
  //          流派权重/过滤是"解读层镜片", 仅在传 --lineage 时附加一份过滤视图, 绝不改四柱排盘。
  try {
    const defs = JSON.parse(fs.readFileSync(resolveData('shensha.json'), 'utf-8'));
    const lin  = JSON.parse(fs.readFileSync(resolveData('lineages.json'), 'utf-8'));
    const shenChart = { siZhu: chart.bazi.siZhu, gender: birthInfo.gender };

    const fullHits = computeShensha(shenChart, defs, lin.lineages['open'].shensha_policy);
    // v1.6: 每个命中附「派系侧重」(各传统流派对该神煞的使用权重),供 open 模式解读时标注强弱分歧
    const LK_CN: Record<string, string> = { ziping: '子平', ditian: '滴天髓', shenfeng: '神峰', mangpai: '盲派(含段氏)' }; // v2.0 段氏并入盲派
    const defById: Record<string, any> = {};
    for (const sd of defs.shensha) defById[sd.id] = sd;
    for (const h of fullHits as any[]) {
      const lw: Record<string, number> = {};
      for (const [lk, cn] of Object.entries(LK_CN)) {
        const pol = lin.lineages[lk]?.shensha_policy;
        if (!pol) continue;
        let w = 0;
        if (!(pol.blacklist || []).includes(h.id)) {
          const raw = pol.whitelist?.[h.id];
          const tier = defById[h.id]?.tier;
          if (tier === 'MODERN') w = typeof raw === 'number' ? raw : 0;
          else if (typeof raw === 'number') w = raw;
          else if (typeof raw === 'string') w = 0;
          else w = pol.default_weight || 0;
        }
        lw[cn] = w;
      }
      h.lineage_weights = lw;
    }
    const enr: any = chart.bazi.enrichment || (chart.bazi.enrichment = {});
    enr.神煞 = { policy: 'open(全集·流派中立)', hits: fullHits };

    const lineageKey = args.lineage === 'duanshi' ? 'mangpai' : args.lineage; // v2.0 段氏并入盲派(别名兼容)
    if (args.lineage === 'duanshi') console.error('[lineage] 段氏已并入盲派镜片(段氏特有技法在解读中标注〔段氏〕),按 mangpai 计算');
    if (lineageKey && lin.lineages[lineageKey]) {
      const L = lin.lineages[lineageKey];
      const pol = L.shensha_policy || { default_weight: 0, whitelist: {}, blacklist: [] };
      // open 镜片直接复用全集(含派系侧重字段);其余派重算过滤视图
      const linHits = lineageKey === 'open' ? fullHits : computeShensha(shenChart, defs, pol);
      enr.神煞.lineage = { id: lineageKey, name: L.name, hits: linHits };
      chart.meta = Object.assign({}, chart.meta, { lineage: lineageKey, lineageName: L.name });
    } else if (lineageKey) {
      console.error(`[shensha] 未知流派 '${lineageKey}', 已忽略(仅写中立全集)`);
    }

    // Step 3.5: 合冲刑害作用裁决(v1.5) — 中立视图按 open 通则(带分歧标注),
    //           传 --lineage 时另附该派规则集裁决视图;运岁引动为中立检测。
    try {
      const siZhuCN: any = {
        年: chart.bazi.siZhu.year, 月: chart.bazi.siZhu.month,
        日: chart.bazi.siZhu.day, 时: chart.bazi.siZhu.hour,
      };
      const openIP = lin.lineages['open'].interaction_policy;
      if (openIP) {
        enr.作用关系 = { policy: 'open(通则+分歧标注)', ...adjudicateInteractions(siZhuCN, openIP) };
        const lk = args.lineage === 'duanshi' ? 'mangpai' : args.lineage;
        if (lk && lin.lineages[lk] && lk !== 'open' && lin.lineages[lk].interaction_policy) {
          enr.作用关系.lineage = { id: lk, name: lin.lineages[lk].name,
            ...adjudicateInteractions(siZhuCN, lin.lineages[lk].interaction_policy) };
        }
      }
      const curYear = args.currentYear ? parseInt(args.currentYear, 10) : new Date().getFullYear();
      enr.运岁引动 = analyzeYunSui(siZhuCN, chart.bazi.dayun || [], curYear);

      // v2.5: 罕象检测(四库全/德秀满盘/三德会聚等) — 罕见度由算法定义,解读层优先讲解
      enr.罕象 = detectRarePatterns(siZhuCN, fullHits as any[], enr.地支关系 || [], enr.天干关系 || []);

      // v2.6: 正缘倾向判定(年长/年轻/同龄) — 通行断法确定性计算,画像年龄照抄不裁量
      enr.正缘倾向 = judgeSpouseProfile(siZhuCN, birthInfo.gender);


      // v1.6.2: 胎元(月干进一,月支进三) + 命宫(14/26 减月时支数,五虎遁取干)
      const GAN10 = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
      const ZHI12 = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
      const mGan = chart.bazi.siZhu.month.gan, mZhi = chart.bazi.siZhu.month.zhi, hZhi = chart.bazi.siZhu.hour.zhi;
      const taiGan = GAN10[(GAN10.indexOf(mGan) + 1) % 10];
      const taiZhi = ZHI12[(ZHI12.indexOf(mZhi) + 3) % 12];
      enr.胎元 = taiGan + taiZhi;
      // 支数以寅=1…丑=12
      const numOf = (z: string) => ((ZHI12.indexOf(z) - 2 + 12) % 12) + 1;
      const sum = numOf(mZhi) + numOf(hZhi);
      const n = (sum < 14 ? 14 : 26) - sum;              // 命宫支数(寅=1)
      const mgZhi = ZHI12[(n - 1 + 2) % 12];
      // 五虎遁:年干起寅月干,顺数至命宫支
      const WUHU: Record<string, string> = { 甲: '丙', 己: '丙', 乙: '戊', 庚: '戊', 丙: '庚', 辛: '庚', 丁: '壬', 壬: '壬', 戊: '甲', 癸: '甲' };
      const yinGan = WUHU[chart.bazi.siZhu.year.gan];
      const steps = (ZHI12.indexOf(mgZhi) - 2 + 12) % 12; // 从寅数到命宫支
      const mgGan = GAN10[(GAN10.indexOf(yinGan) + steps) % 10];
      enr.命宫 = mgGan + mgZhi;

      // v2.8/v3.1/v3.3: 荣格八维能量结构 — 「最像类型」照抄不裁量;--rubric=v2|v3|v4(默认v4:
      //   R1-R4 神煞计数制 + R5格局复合 + R6忌神折向 + R7身弱E轴,忌神/旺衰来自算法层出口)
      enr.八维结构 = judgeBaWei(siZhuCN, birthInfo.gender, {
        rubric: args.rubric === 'v2' ? 'v2' : args.rubric === 'v3' ? 'v3' : 'v4',
        shenshaHits: fullHits as any[],
        rare: enr.罕象 || [],
        taiYuan: enr.胎元,
        mingGong: enr.命宫,
        // v3.4.1(用户定): R6 忌神折向优先取扶抑线原始忌神——出口.忌神经过开运/喜神冲突过滤,
        //   格局喜水会把水从忌神剥掉;但满盘皆水时水就是克身之忌(大水冲了龙王庙),八维看的是承压事实,不看格局取用
        jiShen: (enr as any).用神建议?.扶抑?.忌 || (enr as any).用神建议?.出口?.忌神 || [],
        wangShuai: (enr as any).旺衰?.verdict || '',
      });

    } catch (e) {
      console.error('[interactions] 计算跳过(非致命):', (e as Error)?.message || e);
    }
  } catch (e) {
    console.error('[shensha] 计算跳过(非致命):', (e as Error)?.message || e);
  }

  // Step 4: 全局置信度聚合(P0-C) — 收敛/边界盘/时辰临界 → confidence_tier(high/medium/low),
  //   聚合规则见 bazi-enrich/confidence.ts 头注;low 档措辞约束由 bazi-prompt「置信度传播」+
  //   check-analysis longform 红线共同执行。
  try {
    (chart.bazi.enrichment as any).confidence_tier = aggregateConfidenceTier(chart.bazi.enrichment);
  } catch (e) {
    console.error('[confidence] 置信度聚合跳过(非致命):', (e as Error)?.message || e);
  }

  const json = JSON.stringify(chart, null, 2);

  if (args.output) {
    fs.writeFileSync(args.output, json, 'utf-8');
    console.error(`Chart written to ${args.output}`);
  } else {
    process.stdout.write(json);
  }
}

main();

var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// render.ts
var fs = __toESM(require("fs"));
function parseArgs() {
  const args = {};
  for (const a of process.argv.slice(2)) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  }
  return args;
}
var DIZHI = ["\u5B50", "\u4E11", "\u5BC5", "\u536F", "\u8FB0", "\u5DF3", "\u5348", "\u672A", "\u7533", "\u9149", "\u620C", "\u4EA5"];
function calcVirtualAge(birthYear, currentYear) {
  return currentYear - birthYear + 1;
}
function chartToFlat(chart, currentYear) {
  const out = {};
  const bi = chart.bazi.birthInfo;
  const bz = chart.bazi;
  const zw = chart.ziwei;
  currentYear = currentYear || (/* @__PURE__ */ new Date()).getFullYear();
  const virtualAge = calcVirtualAge(bi.year, currentYear);
  out["meta.solar_date"] = `${bi.year}-${String(bi.month).padStart(2, "0")}-${String(bi.day).padStart(2, "0")} ${String(bi.hour).padStart(2, "0")}:${String(bi.minute).padStart(2, "0")}`;
  if (zw.lunarDate) {
    out["meta.lunar_date"] = `${zw.lunarDate.year}\u5E74 ${zw.lunarDate.monthCn}\u6708${zw.lunarDate.dayCn} ${zw.lunarDate.hourCn || ""}`.trim();
  } else {
    out["meta.lunar_date"] = "-";
  }
  out["meta.gender_full"] = bi.gender === "male" ? "\u7537\uFF08" + (zw.yinYang || "") + "\uFF09" : "\u5973\uFF08" + (zw.yinYang || "") + "\uFF09";
  out["meta.age_virtual"] = virtualAge.toString();
  out["meta.current_year"] = currentYear.toString();
  const now = /* @__PURE__ */ new Date();
  out["meta.gen_time"] = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  out["meta.yinyang"] = zw.yinYang || "-";
  const MING_ZHU = { "\u5B50": "\u8D2A\u72FC", "\u4E11": "\u5DE8\u95E8", "\u5BC5": "\u7984\u5B58", "\u536F": "\u6587\u66F2", "\u8FB0": "\u5EC9\u8D1E", "\u5DF3": "\u6B66\u66F2", "\u5348": "\u7834\u519B", "\u672A": "\u6B66\u66F2", "\u7533": "\u5EC9\u8D1E", "\u9149": "\u6587\u66F2", "\u620C": "\u7984\u5B58", "\u4EA5": "\u5DE8\u95E8" };
  const SHEN_ZHU = { "\u5B50": "\u706B\u661F", "\u4E11": "\u5929\u76F8", "\u5BC5": "\u5929\u6881", "\u536F": "\u5929\u540C", "\u8FB0": "\u6587\u660C", "\u5DF3": "\u5929\u673A", "\u5348": "\u706B\u661F", "\u672A": "\u5929\u76F8", "\u7533": "\u5929\u6881", "\u9149": "\u5929\u540C", "\u620C": "\u6587\u660C", "\u4EA5": "\u5929\u673A" };
  const mingDizhi = zw.gongs[0].dizhi;
  const shenDizhi = DIZHI[zw.shenGongIndex];
  out["ziwei.ming_zhu"] = MING_ZHU[mingDizhi] || "-";
  out["ziwei.shen_zhu"] = SHEN_ZHU[shenDizhi] || "-";
  out["ziwei.zi_dou_jun"] = zw.ziDouJun || "-";
  out["ziwei.wuxing_ju"] = zw.wuXingJu?.name || "-";
  const en = bz.enrichment;
  out["core.geju"] = en?.\u683C\u5C40?.primary || "-";
  out["core.geju_confidence"] = en?.\u683C\u5C40?.confidence || "-";
  out["core.wangshuai_verdict"] = en?.\u65FA\u8870?.verdict || "-";
  out["core.wangshuai_score"] = en?.\u65FA\u8870?.score?.toString() || "-";
  const ws = en?.\u65FA\u8870?.score ?? 0;
  out["core.wangshuai_pos_pct"] = Math.max(0, Math.min(100, Math.round((ws + 10) * 5))).toString();
  const tc = en?.\u8C03\u5019\u7528\u795E || [];
  out["core.tiaohou.0"] = tc[0] || "-";
  out["core.tiaohou.1"] = tc[1] || "-";
  out["core.tiaohou_confidence"] = "\u9AD8";
  const yl = en?.\u4E94\u884C\u65FA\u76F8 || {};
  for (const k of ["\u6728", "\u706B", "\u571F", "\u91D1", "\u6C34"]) {
    out[`core.yueling.${k}`] = yl[k] || "-";
  }
  const wx = en?.\u4E94\u884C\u7EDF\u8BA1?.withCangGan || en?.\u4E94\u884C\u7EDF\u8BA1 || { \u6728: 0, \u706B: 0, \u571F: 0, \u91D1: 0, \u6C34: 0 };
  for (const k of ["\u6728", "\u706B", "\u571F", "\u91D1", "\u6C34"]) out[`core.wuxing.${k}`] = wx[k] ?? "-";
  const wxMax = Math.max(...["\u6728", "\u706B", "\u571F", "\u91D1", "\u6C34"].map((k) => +wx[k] || 0)) || 1;
  for (const k of ["\u6728", "\u706B", "\u571F", "\u91D1", "\u6C34"]) out[`core.wuxing_pct.${k}`] = Math.round((+wx[k] || 0) / wxMax * 100);
  const sihuaCharMap = { \u5316\u7984: "\u7984", \u5316\u6743: "\u6743", \u5316\u79D1: "\u79D1", \u5316\u5FCC: "\u5FCC" };
  for (const g of zw.gongs) {
    const mainStarsHtml = g.mainStars && g.mainStars.length > 0 ? g.mainStars.map((s) => {
      const sh = (g.sihua || []).find((x) => x.star === s);
      if (sh) {
        const huaChar = sihuaCharMap[sh.hua] || sh.hua.slice(-1);
        return `<span class="sihua-${huaChar}">${s}<span class="sihua-tag">${huaChar}</span></span>`;
      }
      return s;
    }).join("\xB7") : '<span style="color:var(--ink-faint)">\u65E0\u4E3B\u661F</span>';
    const auxStarsHtml = g.auxStars && g.auxStars.length > 0 ? g.auxStars.map((s) => {
      const sh = (g.sihua || []).find((x) => x.star === s);
      if (sh) {
        const huaChar = sihuaCharMap[sh.hua] || sh.hua.slice(-1);
        return `<span class="sihua-${huaChar}">${s}<span class="sihua-tag">${huaChar}</span></span>`;
      }
      return s;
    }).join("\xB7") : "\u2014";
    out[`gongs.${g.dizhi}.name`] = g.gong.endsWith("\u5BAB") ? g.gong : g.gong + "\u5BAB";
    out[`gongs.${g.dizhi}.ganzhi`] = g.tiangan + g.dizhi;
    out[`gongs.${g.dizhi}.mainStarsHtml`] = mainStarsHtml;
    out[`gongs.${g.dizhi}.auxStars`] = auxStarsHtml;
    out[`gongs.${g.dizhi}.smallStars`] = "";
    out[`gongs.${g.dizhi}.daxian_range`] = g.daXian ? `${g.daXian.startAge}-${g.daXian.endAge}` : "-";
    const flags = [];
    if (g.dizhi === mingDizhi) flags.push("ming");
    if (g.dizhi === shenDizhi) flags.push("shen");
    if (g.daXian && g.daXian.startAge <= virtualAge && virtualAge <= g.daXian.endAge) flags.push("current-daxian");
    out[`gongs.${g.dizhi}.flag`] = flags.join(" ");
    out[`gongs.${g.dizhi}.shenBadge`] = g.dizhi === shenDizhi ? '<span class="shen-badge">\u8EAB</span>' : "";
  }
  const cangGanFmt = (arr) => (arr || []).map((x) => `${x.gan}(${x.shiShen})`).join(" ");
  const pillarKeyToCn = { year: "\u5E74", month: "\u6708", day: "\u65E5", hour: "\u65F6" };
  for (const k of ["year", "month", "day", "hour"]) {
    out[`bazi.${k}.shiShen`] = bz.shiShen?.[k] || "-";
    out[`bazi.${k}.gan`] = bz.siZhu[k].gan;
    out[`bazi.${k}.zhi`] = bz.siZhu[k].zhi;
    out[`bazi.${k}.cangGanHtml`] = cangGanFmt(bz.cangGan?.[k] || []);
    out[`bazi.${k}.zhangSheng`] = bz.zhangSheng?.[k] || "-";
    out[`bazi.${k}.ziZuo`] = en?.\u81EA\u5750?.[pillarKeyToCn[k]] || en?.\u81EA\u5750?.[k] || "-";
    out[`bazi.${k}.naYin`] = bz.naYin?.[k] || "-";
  }
  out["bazi.dayunStart"] = bz.dayunStart?.toString() || "-";
  const dayunArr = (bz.dayun || []).slice(0, 10);
  let currentDayun = null;
  for (let i = 0; i < 10; i++) {
    const d = dayunArr[i];
    if (d && d.startAge <= virtualAge && virtualAge <= d.endAge) currentDayun = d;
  }
  for (let i = 0; i < 10; i++) {
    const d = dayunArr[i];
    if (!d) {
      ["gz", "age_range", "shishen", "current_class"].forEach((f) => out[`dayun.${i}.${f}`] = "-");
      continue;
    }
    out[`dayun.${i}.gz`] = d.ganZhi.gan + d.ganZhi.zhi;
    out[`dayun.${i}.age_range`] = `${d.startAge}-${d.endAge}`;
    const sg = (d.ganShiShen || "").slice(0, 1);
    const sz = (d.zhiShiShen || "").slice(0, 1);
    out[`dayun.${i}.shishen`] = sg + sz;
    out[`dayun.${i}.current_class`] = currentDayun && d === currentDayun ? "current dayun" : "";
  }
  const dayunForStage = dayunArr.slice(0, 7);
  for (let i = 0; i < 7; i++) {
    const d = dayunForStage[i];
    if (!d) {
      ["range", "gz", "shishen", "current_class"].forEach((f) => out[`section_02.bazi.${i}.${f}`] = "-");
      continue;
    }
    out[`section_02.bazi.${i}.range`] = `${d.startAge}-${d.endAge}`;
    out[`section_02.bazi.${i}.gz`] = d.ganZhi.gan + d.ganZhi.zhi;
    const sg = (d.ganShiShen || "").slice(0, 1);
    const sz = (d.zhiShiShen || "").slice(0, 1);
    out[`section_02.bazi.${i}.shishen`] = sg + sz;
    out[`section_02.bazi.${i}.current_class`] = d.startAge <= virtualAge && virtualAge <= d.endAge ? "current" : "";
  }
  const ziweiDaxian = zw.gongs.filter((g) => g.daXian).map((g) => ({ startAge: g.daXian.startAge, endAge: g.daXian.endAge, gong: g.gong })).sort((a, b) => a.startAge - b.startAge).slice(0, 7);
  for (let i = 0; i < 7; i++) {
    const d = ziweiDaxian[i];
    if (!d) {
      ["range", "current_class"].forEach((f) => out[`section_02.ziwei.${i}.${f}`] = "-");
      continue;
    }
    out[`section_02.ziwei.${i}.range`] = `${d.startAge}-${d.endAge}`;
    out[`section_02.ziwei.${i}.current_class`] = d.startAge <= virtualAge && virtualAge <= d.endAge ? "current" : "";
  }
  if (currentDayun) {
    out["liunian_dayun_label"] = `${currentDayun.ganZhi.gan}${currentDayun.ganZhi.zhi} ${currentDayun.startAge}-${currentDayun.endAge}`;
  } else {
    out["liunian_dayun_label"] = "-";
  }
  const liunianArr = (currentDayun?.liuNian || []).slice(0, 10);
  for (let i = 0; i < 10; i++) {
    const ln = liunianArr[i];
    if (!ln) {
      ["year", "age", "gz", "shishen", "current_class"].forEach((f) => out[`liunian.${i}.${f}`] = "-");
      continue;
    }
    out[`liunian.${i}.year`] = ln.year;
    out[`liunian.${i}.age`] = ln.age;
    out[`liunian.${i}.gz`] = ln.ganZhi.gan + ln.ganZhi.zhi;
    out[`liunian.${i}.shishen`] = ln.ganShiShen ? ln.ganShiShen.slice(0, 1) + (ln.zhiShiShen?.slice(0, 1) || "") : "";
    out[`liunian.${i}.current_class`] = ln.age === virtualAge ? "current" : "";
  }
  return out;
}
function analysisToFlat(analysis) {
  const out = {};
  if (analysis.meta) {
    out["meta.archetype_name"] = analysis.meta.archetype_name;
    out["meta.axis_oneliner"] = analysis.meta.axis_oneliner;
  }
  if (analysis.axes) {
    out["axes.bazi_main"] = analysis.axes.bazi_main;
    out["axes.ziwei_main"] = analysis.axes.ziwei_main;
  }
  if (analysis.consistency) out["ziwei.consistency"] = analysis.consistency;
  for (let i = 0; i < 3; i++) {
    const s = analysis.strengths?.[i] || {};
    out[`strengths.${i}.title`] = s.title || "-";
    out[`strengths.${i}.desc`] = s.desc || "-";
    const w = analysis.weaknesses?.[i] || {};
    out[`weaknesses.${i}.title`] = w.title || "-";
    out[`weaknesses.${i}.desc`] = w.desc || "-";
  }
  if (analysis.section_01) {
    out["section_01.text"] = analysis.section_01.text || "-";
    out["section_01.word_count"] = analysis.section_01.word_count || "-";
  }
  if (analysis.section_02) {
    out["section_02.conclusion"] = analysis.section_02.conclusion || "-";
  }
  const dims = ["career", "wealth", "marriage", "children", "family", "health"];
  for (const k of dims) {
    const d = analysis.dim?.[k] || {};
    out[`dim.${k}.bazi`] = d.bazi || "-";
    out[`dim.${k}.ziwei`] = d.ziwei || "-";
    out[`dim.${k}.verdict`] = d.verdict || "-";
    out[`dim.${k}.verdict_class`] = d.verdict_class || "verdict-yes";
    out[`dim.${k}.fused`] = d.fused || "-";
  }
  for (let i = 0; i < 3; i++) {
    const c = analysis.conflicts?.[i] || {};
    out[`conflicts.${i}.point`] = c.point || "-";
    out[`conflicts.${i}.bazi`] = c.bazi || "-";
    out[`conflicts.${i}.ziwei`] = c.ziwei || "-";
    out[`conflicts.${i}.impact`] = c.impact || "-";
    out[`conflicts.${i}.impact_class`] = c.impact_class || "low";
    out[`conflicts.${i}.advice`] = c.advice || "-";
  }
  if (analysis.final) {
    out["final.life_axis"] = analysis.final.life_axis || "-";
    for (let i = 0; i < 5; i++) {
      const n = analysis.final.nodes?.[i] || {};
      out[`final.nodes.${i}.age`] = n.age || "-";
      out[`final.nodes.${i}.year`] = n.year || "-";
      out[`final.nodes.${i}.event`] = n.event || "-";
    }
    for (let i = 0; i < 3; i++) {
      const r = analysis.final.risks?.[i] || {};
      out[`final.risks.${i}.range`] = r.range || "-";
      out[`final.risks.${i}.desc`] = r.desc || "-";
    }
    for (let i = 0; i < 2; i++) {
      const l = analysis.final.leverage?.[i] || {};
      out[`final.leverage.${i}.title`] = l.title || "-";
      out[`final.leverage.${i}.desc`] = l.desc || "-";
    }
    for (let i = 0; i < 4; i++) out[`final.advice.${i}`] = analysis.final.advice?.[i] || "-";
  }
  if (analysis.confidence) {
    for (const k of ["bazi", "ziwei", "consistency", "stability"]) {
      out[`confidence.${k}_level`] = analysis.confidence[`${k}_level`] || "-";
      out[`confidence.${k}_score`] = analysis.confidence[`${k}_score`] || "-";
    }
    out["confidence.note"] = analysis.confidence.note || "-";
  }
  return out;
}
var GAN_WX = { \u7532: "\u6728", \u4E59: "\u6728", \u4E19: "\u706B", \u4E01: "\u706B", \u620A: "\u571F", \u5DF1: "\u571F", \u5E9A: "\u91D1", \u8F9B: "\u91D1", \u58EC: "\u6C34", \u7678: "\u6C34" };
var ZHI_WX = { \u5BC5: "\u6728", \u536F: "\u6728", \u5DF3: "\u706B", \u5348: "\u706B", \u7533: "\u91D1", \u9149: "\u91D1", \u4EA5: "\u6C34", \u5B50: "\u6C34", \u8FB0: "\u571F", \u620C: "\u571F", \u4E11: "\u571F", \u672A: "\u571F" };
var ZODIAC = { \u5B50: "\u9F20", \u4E11: "\u725B", \u5BC5: "\u864E", \u536F: "\u5154", \u8FB0: "\u9F99", \u5DF3: "\u86C7", \u5348: "\u9A6C", \u672A: "\u7F8A", \u7533: "\u7334", \u9149: "\u9E21", \u620C: "\u72D7", \u4EA5: "\u732A" };
var SS_KEY = { \u6BD4\u80A9: "bijian", \u52AB\u8D22: "jiecai", \u98DF\u795E: "shishen", \u4F24\u5B98: "shangguan", \u504F\u8D22: "piancai", \u6B63\u8D22: "zhengcai", \u4E03\u6740: "qisha", \u4E03\u715E: "qisha", \u6B63\u5B98: "zhengguan", \u504F\u5370: "pianyin", \u67AD\u795E: "pianyin", \u6B63\u5370: "zhengyin" };
var SS_POL = { \u5409: "good", "\u4E2D\u6027": "neutral", \u51F6: "warn" };
function shenshaByPillarBazi(chart) {
  const ss = chart.bazi?.enrichment?.\u795E\u715E;
  const hits = ss?.lineage?.hits || ss?.hits || [];
  const m = { \u5E74: [], \u6708: [], \u65E5: [], \u65F6: [] };
  for (const h of hits) for (const pl of h.pillars || []) if (m[pl]) m[pl].push(`<span class="ss-name ${SS_POL[h.polarity] || "neutral"}">${h.name}</span>`);
  return m;
}
function chartToFlatBazi(chart, currentYear) {
  const out = {};
  const bi = chart.bazi.birthInfo, bz = chart.bazi, en = bz.enrichment || {}, zw = chart.ziwei || {};
  currentYear = currentYear || (/* @__PURE__ */ new Date()).getFullYear();
  const virtualAge = currentYear - bi.year + 1;
  const p2 = (n) => String(n).padStart(2, "0");
  out["meta.solar_date"] = `${bi.year}-${p2(bi.month)}-${p2(bi.day)} ${p2(bi.hour)}:${p2(bi.minute)}`;
  out["meta.true_solar_time"] = out["meta.solar_date"];
  out["meta.solar_correction"] = "\u672A\u505A\u771F\u592A\u9633\u65F6\u6821\u6B63\uFF08\u949F\u8868\u65F6\u95F4\uFF09";
  out["meta.lunar_date"] = zw.lunarDate ? `${zw.lunarDate.year}\u5E74${zw.lunarDate.monthCn}\u6708${zw.lunarDate.dayCn}` : "-";
  out["meta.gender"] = bi.gender === "male" ? "\u7537" : "\u5973";
  out["meta.age_virtual"] = String(virtualAge);
  out["meta.current_year"] = String(currentYear);
  const now = /* @__PURE__ */ new Date();
  out["meta.gen_time"] = `${now.getFullYear()}-${p2(now.getMonth() + 1)}-${p2(now.getDate())} ${p2(now.getHours())}:${p2(now.getMinutes())}`;
  out["meta.day_master"] = bz.dayMaster || bz.siZhu.day.gan;
  out["meta.zodiac"] = ZODIAC[bz.siZhu.year.zhi] || "-";
  out["meta.wangshuai"] = en.\u65FA\u8870?.verdict || "-";
  out["meta.geju_full"] = en.\u683C\u5C40?.primary || "-";
  out["meta.qiyun"] = bz.dayunStart != null ? `${bz.dayunStart}\u5C81\u8D77\u8FD0` : "-";
  out["meta.name"] = "\u547D\u4E3B";
  out["meta.birthplace"] = "-";
  out["meta.minggong"] = en.\u547D\u5BAB || "-";
  out["meta.taiyuan"] = en.\u80CE\u5143 || "-";
  out["meta.direction_note"] = "";
  const cangGanFmt = (arr) => (arr || []).map((x) => `${x.gan}(${x.shiShen || ""})`).join(" ");
  const cnMap = { year: "\u5E74", month: "\u6708", day: "\u65E5", hour: "\u65F6" };
  const ssP = shenshaByPillarBazi(chart);
  for (const k of ["year", "month", "day", "hour"]) {
    const gz = bz.siZhu[k];
    out[`bazi.${k}.gan`] = gz.gan;
    out[`bazi.${k}.zhi`] = gz.zhi;
    out[`bazi.${k}.gan_wx`] = GAN_WX[gz.gan] || "-";
    out[`bazi.${k}.zhi_wx`] = ZHI_WX[gz.zhi] || "-";
    if (k !== "day") out[`bazi.${k}.shiShen`] = bz.shiShen?.[k] || "-";
    out[`bazi.${k}.cangGanHtml`] = cangGanFmt(bz.cangGan?.[k]);
    out[`bazi.${k}.zhangSheng`] = bz.zhangSheng?.[k] || "-";
    out[`bazi.${k}.ziZuo`] = en.\u81EA\u5750?.[cnMap[k]] || en.\u81EA\u5750?.[k] || "-";
    out[`bazi.${k}.naYin`] = bz.naYin?.[k] || "-";
    out[`bazi.${k}.shenshaHtml`] = (ssP[cnMap[k]] || []).join(" ") || "\u2014";
  }
  const wx = en.\u4E94\u884C\u7EDF\u8BA1?.withCangGan || en.\u4E94\u884C\u7EDF\u8BA1?.surface || en.\u4E94\u884C\u7EDF\u8BA1 || {};
  const wxKeys = [["mu", "\u6728"], ["huo", "\u706B"], ["tu", "\u571F"], ["jin", "\u91D1"], ["shui", "\u6C34"]];
  let wxTotal = 0;
  for (const [, cn] of wxKeys) wxTotal += +wx[cn] || 0;
  out["wuxing.total"] = String(wxTotal || 0);
  for (const [py, cn] of wxKeys) {
    const v = +wx[cn] || 0;
    out[`wuxing.${py}`] = String(v);
    out[`wuxing.${py}_pct`] = String(wxTotal ? Math.round(v / wxTotal * 100) : 0);
  }
  const tgCount = {};
  const addSS = (sx) => {
    if (!sx) return;
    const key = SS_KEY[sx];
    if (key) tgCount[key] = (tgCount[key] || 0) + 1;
  };
  for (const k of ["year", "month", "hour"]) addSS(bz.shiShen?.[k]);
  for (const k of ["year", "month", "day", "hour"]) for (const cg of bz.cangGan?.[k] || []) addSS(cg.shiShen);
  const tgAll = ["bijian", "jiecai", "shishen", "shangguan", "piancai", "zhengcai", "qisha", "zhengguan", "pianyin", "zhengyin"];
  let tgTotal = 0;
  for (const t of tgAll) tgTotal += tgCount[t] || 0;
  for (const t of tgAll) {
    const n = tgCount[t] || 0;
    out[`tg.${t}_n`] = String(n);
    out[`tg.${t}_pct`] = String(tgTotal ? Math.round(n / tgTotal * 100) : 0);
  }
  const bd = en.\u65FA\u8870?.breakdown || {};
  const mk = (v) => v ? ["yes", "\u2713"] : ["no", "\u2717"];
  const [dlc, dlm] = mk(bd.\u5F97\u4EE4), [ddc, ddm] = mk(bd.\u5F97\u5730), [dsc, dsm] = mk(bd.\u5F97\u52BF);
  out["dm.deling_class"] = dlc;
  out["dm.deling_mark"] = dlm;
  out["dm.dedi_class"] = ddc;
  out["dm.dedi_mark"] = ddm;
  out["dm.deshi_class"] = dsc;
  out["dm.deshi_mark"] = dsm;
  const sc = en.\u65FA\u8870?.score ?? 0;
  out["dm.score_pct"] = String(Math.max(0, Math.min(100, Math.round((sc + 10) * 5))));
  out["dm.score_label"] = en.\u65FA\u8870?.verdict || "-";
  out["dm.verdict"] = en.\u65FA\u8870?.verdict || "-";
  out["geju.name"] = en.\u683C\u5C40?.primary || "-";
  out["geju.confidence"] = en.\u683C\u5C40?.confidence || "-";
  out["geju.chenge"] = en.\u683C\u5C40?.chenge || (en.\u683C\u5C40?.primary && en.\u683C\u5C40.primary !== "-" ? "\u6210\u683C" : "-");
  const allHits = en.\u795E\u715E?.lineage?.hits || en.\u795E\u715E?.hits || [];
  out["shensha.list_html"] = allHits.length ? allHits.map((h) => `<span class="ss-name ${SS_POL[h.polarity] || "neutral"}">${h.name}</span>`).join(" ") : "\u2014";
  const ix = en.\u4F5C\u7528\u5173\u7CFB;
  const ixView = ix?.lineage || ix;
  out["hechong.policy"] = ix?.lineage ? `${ix.lineage.name}\u89C4\u5219\u96C6` : ix ? "\u901A\u5219(\u4E0D\u9650\u6D41\u6D3E)" : "-";
  const stCls = (st) => st === "\u751F\u6548" || st === "\u6210\u5C40" || st === "\u5408\u800C\u5316" ? "st-on" : st === "\u88AB\u89E3" || st === "\u88AB\u7ECA" || st === "\u5408\u800C\u4E0D\u5316(\u7ECA)" ? "st-off" : "st-mid";
  const ixItems = ixView?.items || [];
  out["hechong.rows_html"] = ixItems.length ? ixItems.map(
    (r) => `<div class="hc-row"><span class="hc-type">${r.type}</span><span class="hc-mem">${(r.members || []).join("")}(${(r.pillars || []).join("-")}\xB7${r.distance})</span><span class="hc-status ${stCls(r.status)}">\u3010${r.status}\u3011</span><span class="hc-cause">${r.cause || ""}</span></div>`
  ).join("") : '<div class="hc-row"><span class="hc-cause">\u672C\u76D8\u5E72\u652F\u4E4B\u95F4\u65E0\u663E\u8457\u5408\u51B2\u5211\u5BB3\u5173\u7CFB</span></div>';
  const ys = en.\u8FD0\u5C81\u5F15\u52A8;
  const ysRows = [];
  for (const dstep of ys?.\u5927\u8FD0\u5F15\u52A8 || []) {
    for (const h of dstep.hits || []) ysRows.push(
      `<div class="hc-row"><span class="hc-type">${h.type}</span><span class="hc-mem">\u5927\u8FD0${dstep.\u5E72\u652F} ${dstep.\u5E74\u9F84}</span><span class="hc-cause">${h.desc}</span></div>`
    );
  }
  for (const y of ys?.\u5F53\u524D\u5927\u8FD0\u6D41\u5E74?.\u6D41\u5E74 || []) {
    if (y.\u5E74 < currentYear || y.\u5E74 >= currentYear + 5) continue;
    const all = [...y.vs\u539F\u5C40 || [], ...y.vs\u5927\u8FD0 || []];
    if (all.length) ysRows.push(
      `<div class="hc-row"><span class="hc-type">\u6D41\u5E74</span><span class="hc-mem">${y.\u5E74} ${y.\u5E72\u652F}</span><span class="hc-cause">${all.map((h) => `[${h.type}]`).join("")} ${all.map((h) => h.desc.replace(/^(大运|流年)/, "")).join(";")}</span></div>`
    );
  }
  out["yunsui.rows_html"] = ysRows.length ? ysRows.join("") : '<div class="hc-row"><span class="hc-cause">\u8FD0\u5C81\u4E0E\u539F\u5C40\u65E0\u663E\u8457\u5F15\u52A8</span></div>';
  out["hechong.reading_html"] = "-";
  out["yunsui.reading_html"] = "-";
  out["shensha.reading_html"] = "-";
  const dyArr = (bz.dayun || []).slice(0, 10);
  let curDy = null;
  for (const d of dyArr) if (d.startAge <= virtualAge && virtualAge <= d.endAge) curDy = d;
  for (let i = 0; i < 10; i++) {
    const d = dyArr[i];
    if (!d) {
      ["gz", "age_range", "shishen", "start_year"].forEach((f) => out[`dayun.${i}.${f}`] = "-");
      out[`dayun.${i}.current_class`] = "";
      out[`dayun.${i}.luck_class`] = "luck-ping";
      continue;
    }
    out[`dayun.${i}.gz`] = d.ganZhi.gan + d.ganZhi.zhi;
    out[`dayun.${i}.age_range`] = `${d.startAge}-${d.endAge}`;
    out[`dayun.${i}.start_year`] = String(d.startYear || "-");
    out[`dayun.${i}.shishen`] = (d.ganShiShen || "").slice(0, 1) + (d.zhiShiShen || "").slice(0, 1);
    out[`dayun.${i}.current_class`] = curDy && d === curDy ? "current" : "";
    out[`dayun.${i}.luck_class`] = "luck-ping";
  }
  out["dayun.head_note"] = "";
  const GAN10 = ["\u7532", "\u4E59", "\u4E19", "\u4E01", "\u620A", "\u5DF1", "\u5E9A", "\u8F9B", "\u58EC", "\u7678"], ZHI12 = ["\u5B50", "\u4E11", "\u5BC5", "\u536F", "\u8FB0", "\u5DF3", "\u5348", "\u672A", "\u7533", "\u9149", "\u620C", "\u4EA5"];
  const gzOfYear = (y) => GAN10[(y - 4) % 10] + ZHI12[(y - 4) % 12];
  let lnSrc = curDy?.liuNian || [];
  let synth = false;
  if (!lnSrc.length) {
    synth = true;
    lnSrc = Array.from({ length: 10 }, (_, i) => ({ year: currentYear + i, ganZhi: { gan: gzOfYear(currentYear + i)[0], zhi: gzOfYear(currentYear + i)[1] }, age: currentYear + i - bi.year + 1 }));
  }
  const lnArr = lnSrc.slice(0, 10);
  if (synth) out["liunian.head_note"] = "\u5C1A\u672A\u8D77\u8FD0\xB7\u5217\u5F53\u524D\u5E74\u8D77\u5341\u5E74";
  for (let i = 0; i < 10; i++) {
    const ln = lnArr[i];
    if (!ln) {
      ["year", "gz", "shishen"].forEach((f) => out[`liunian.${i}.${f}`] = "-");
      out[`liunian.${i}.current_class`] = "";
      out[`liunian.${i}.luck_class`] = "luck-ping";
      continue;
    }
    out[`liunian.${i}.year`] = String(ln.year);
    out[`liunian.${i}.gz`] = ln.ganZhi.gan + ln.ganZhi.zhi;
    out[`liunian.${i}.shishen`] = ln.ganShiShen ? ln.ganShiShen.slice(0, 1) + (ln.zhiShiShen?.slice(0, 1) || "") : "";
    out[`liunian.${i}.current_class`] = ln.age === virtualAge ? "current" : "";
    out[`liunian.${i}.luck_class`] = "luck-ping";
  }
  if (!synth) out["liunian.head_note"] = "";
  return out;
}
function wxChip(s) {
  if (!s || typeof s !== "string" || s.includes("wx-chip")) return s;
  return s.replace(/[甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥木火土金水]+/g, (run) => {
    const wxOf = (ch) => GAN_WX[ch] || ZHI_WX[ch] || ("\u6728\u706B\u571F\u91D1\u6C34".includes(ch) ? ch : "");
    const first = wxOf(run[0]);
    if (first && [...run].every((c) => wxOf(c) === first)) {
      return `<span class="wx-chip wx-${first}">${run}</span>`;
    }
    return [...run].map((c) => {
      const w = wxOf(c);
      return w ? `<span class="wx-chip wx-${w}">${c}</span>` : c;
    }).join("");
  });
}
function analysisToFlatBazi(a) {
  const out = {};
  if (a.meta) {
    if (a.meta.archetype_name) out["meta.archetype_name"] = a.meta.archetype_name;
    if (a.meta.axis_oneliner) out["meta.axis_oneliner"] = a.meta.axis_oneliner;
    if (a.meta.name) out["meta.name"] = a.meta.name;
    if (a.meta.direction_note) out["meta.direction_note"] = a.meta.direction_note;
  }
  if (a.dm?.desc_html) out["dm.desc_html"] = a.dm.desc_html;
  if (a.geju?.sub_html) out["geju.sub_html"] = a.geju.sub_html;
  if (a.wuxing?.note_html) out["wuxing.note_html"] = a.wuxing.note_html;
  if (a.tg) {
    if (a.tg.mech_html) out["tg.mech_html"] = a.tg.mech_html;
    if (a.tg.plain_html) out["tg.plain_html"] = a.tg.plain_html;
  }
  if (a.yongshen) {
    for (const k of ["yong_html", "ji_html", "xi_text", "tiaohou_html"]) if (a.yongshen[k] != null) out[`yongshen.${k}`] = wxChip(a.yongshen[k]);
  }
  if (a.yongshen?.note_html != null) out["yongshen.note_html"] = a.yongshen.note_html;
  if (a.interp) {
    for (const k of ["personality_html", "career_html", "marriage_html", "health_html"]) if (a.interp[k] != null) out[`interp.${k}`] = a.interp[k];
  }
  if (a.kaiyun) {
    for (const k of ["fang_html", "se_html", "shu_html", "ye", "place_html", "item_html", "skill_html", "note_html"]) if (a.kaiyun[k] != null) out[`kaiyun.${k}`] = a.kaiyun[k];
  }
  for (const k of ["tiaohou_html", "yong_html"]) if (a.kaiyun?.[k] != null) out[`kaiyun.${k}`] = wxChip(a.kaiyun[k]);
  if (a.hechong?.reading_html) out["hechong.reading_html"] = a.hechong.reading_html;
  if (a.yunsui?.reading_html) out["yunsui.reading_html"] = a.yunsui.reading_html;
  if (a.shensha?.reading_html) out["shensha.reading_html"] = a.shensha.reading_html;
  if (Array.isArray(a.timeline)) for (let i = 0; i < 5; i++) {
    const t = a.timeline[i] || {};
    for (const f of ["age", "year", "run", "run_class", "desc", "marker_class"]) out[`timeline.${i}.${f}`] = t[f] != null ? t[f] : "-";
  }
  if (a.dayun_head_note) out["dayun.head_note"] = a.dayun_head_note;
  if (a.liunian_head_note) out["liunian.head_note"] = a.liunian_head_note;
  if (Array.isArray(a.dayun_luck)) a.dayun_luck.forEach((v, i) => {
    if (i < 10 && v) out[`dayun.${i}.luck_class`] = v;
  });
  if (Array.isArray(a.liunian_luck)) a.liunian_luck.forEach((v, i) => {
    if (i < 10 && v) out[`liunian.${i}.luck_class`] = v;
  });
  return out;
}
function renderTemplate(template, data) {
  let html = template;
  for (const k of Object.keys(data)) {
    const re = new RegExp(`\\{\\{${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\}\\}`, "g");
    html = html.replace(re, String(data[k]));
  }
  html = html.replace(/\{\{[a-zA-Z0-9_.]+\}\}/g, "-");
  return html;
}
function main() {
  const args = parseArgs();
  if (!args.chart || !args.template) {
    console.error("Usage: npx tsx render.ts --chart=chart.json [--analysis=analysis.json] --template=path/to/template.html [--output=out.html] [--mode=zonghe|bazi] [--currentYear=YYYY] [--name=\u547D\u4E3B\u59D3\u540D]");
    process.exit(1);
  }
  const chart = JSON.parse(fs.readFileSync(args.chart, "utf-8"));
  const analysis = args.analysis ? JSON.parse(fs.readFileSync(args.analysis, "utf-8")) : {};
  const template = fs.readFileSync(args.template, "utf-8");
  const mode = args.mode || "zonghe";
  let data;
  if (mode === "bazi") {
    data = { ...chartToFlatBazi(chart, args.currentYear ? +args.currentYear : void 0), ...analysisToFlatBazi(analysis) };
  } else {
    data = { ...chartToFlat(chart, args.currentYear ? +args.currentYear : void 0), ...analysisToFlat(analysis) };
  }
  if (args.name) data["meta.name"] = args.name;
  if (mode === "bazi") {
    const steps = (chart.bazi?.dayun || []).length;
    if (Array.isArray(analysis.dayun_luck) && analysis.dayun_luck.length !== steps)
      console.error(`[render][warn] dayun_luck \u9879\u6570(${analysis.dayun_luck.length}) \u2260 \u7B97\u6CD5\u5C42\u5927\u8FD0\u6B65\u6570(${steps}),\u591A\u4F59\u9879\u5FFD\u7565/\u7F3A\u9879\u6309 luck-ping`);
    if (Array.isArray(analysis.liunian_luck) && analysis.liunian_luck.length !== 10)
      console.error(`[render][warn] liunian_luck \u9879\u6570(${analysis.liunian_luck.length}) \u2260 10,\u591A\u4F59\u9879\u5FFD\u7565/\u7F3A\u9879\u6309 luck-ping`);
  }
  const html = renderTemplate(template, data);
  if (args.output) {
    fs.writeFileSync(args.output, html, "utf-8");
    console.error(`Rendered HTML written to ${args.output}`);
  } else {
    process.stdout.write(html);
  }
}
main();

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
  const yaX = en.\u7528\u795E\u5EFA\u8BAE;
  if (yaX?.\u51FA\u53E3) {
    const ck = yaX.\u51FA\u53E3;
    out["yongshen.yong_html"] = wxChip(yaX.\u8FB9\u754C\u76D8 || !yaX.\u6536\u655B ? `\u62A4\u4F53:${(yaX.\u8C03\u5019?.\u53D6\u5E72 || []).join("")}<br>\u53D1\u7528:${(yaX.\u683C\u5C40?.\u53D6 || []).join("\u3001")}` : (yaX.\u5171\u8BC6\u7528\u795E || []).join("\u3001"));
    out["yongshen.xi_text"] = wxChip((ck.\u559C\u795E || []).join("\u3001"));
    out["yongshen.ji_html"] = (ck.\u5FCC\u795E || []).length ? wxChip(ck.\u5FCC\u795E.join("\u3001")) : "\u65E0\u660E\u663E\u5FCC\u795E(\u4E34\u754C\u76D8,\u4EE5\u6D41\u901A\u4E3A\u8981)";
    out["yongshen.tiaohou_html"] = wxChip(ck.\u8C03\u5019\u63D0\u793A || "-");
    out["yongshen.divergence_note"] = [ck.divergence, ck.\u7F3A\u8865\u8BF4\u660E].filter(Boolean).join("\u3000");
    out["kaiyun.yong_html"] = wxChip((ck.\u5F00\u8FD0\u7528\u795E || []).join("\u3001"));
    out["kaiyun.fang_html"] = (ck.\u5409\u65B9 || []).join("\xB7");
    out["kaiyun.se_html"] = (ck.\u5409\u8272 || []).join("\xB7");
    out["kaiyun.shu_html"] = (ck.\u5409\u6570 || []).join("\u3001");
    out["kaiyun.tiaohou_html"] = wxChip(ck.\u8C03\u5019\u63D0\u793A || "-");
    out["__algo_yongshen"] = "1";
  }
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
  const bw = en.\u516B\u7EF4\u7ED3\u6784;
  if (bw) {
    out["mbti.type"] = bw.\u6700\u50CF\u7C7B\u578B;
    out["mbti.alt"] = bw.\u5907\u9009\u7C7B\u578B;
    out["mbti.alt2"] = bw.\u5907\u90092 || "\u2014";
    out["mbti.conf"] = bw.\u7F6E\u4FE1;
    out["mbti.dom"] = bw.\u4E3B\u5BFC;
    out["mbti.aux"] = bw.\u8F85\u52A9;
    out["mbti.bars_html"] = (bw.\u516B\u7EF4 || []).slice(0, 4).map((x) => `<span><b>${x.\u529F\u80FD}</b> ${x.\u767E\u5206\u6BD4}%</span>`).join(" ");
  } else {
    out["mbti.type"] = "-";
    out["mbti.alt"] = "-";
    out["mbti.conf"] = "-";
    out["mbti.dom"] = "-";
    out["mbti.aux"] = "-";
    out["mbti.bars_html"] = "";
  }
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
  if (yaX?.\u51FA\u53E3) {
    const likes = /* @__PURE__ */ new Set([...yaX.\u51FA\u53E3.\u5F00\u8FD0\u7528\u795E || [], ...yaX.\u51FA\u53E3.\u559C\u795E || []]);
    const dislikes = new Set(yaX.\u51FA\u53E3.\u5FCC\u795E || []);
    const gzScore = (gan, zhi) => {
      let sc2 = 0;
      for (const wx2 of [GAN_WX[gan], ZHI_WX[zhi]]) {
        if (likes.has(wx2)) sc2++;
        else if (dislikes.has(wx2)) sc2--;
      }
      return sc2;
    };
    const downgrade = (cls) => cls === "luck-ji" ? "luck-ping" : "luck-xiong";
    const heavyByStep = {};
    for (const st of en.\u8FD0\u5C81\u5F15\u52A8?.\u5927\u8FD0\u5F15\u52A8 || [])
      heavyByStep[st.\u6B65 - 1] = (st.hits || []).some((h) => h.type === "\u5929\u514B\u5730\u51B2" || h.type === "\u4F0F\u541F");
    for (let i = 0; i < 10; i++) {
      const d = dyArr[i];
      if (!d) continue;
      let cls = (() => {
        const sc2 = gzScore(d.ganZhi.gan, d.ganZhi.zhi);
        return sc2 >= 1 ? "luck-ji" : sc2 <= -1 ? "luck-xiong" : "luck-ping";
      })();
      if (heavyByStep[i]) cls = downgrade(cls);
      out[`dayun.${i}.luck_class`] = cls;
    }
    const heavyYear = {};
    for (const y of en.\u8FD0\u5C81\u5F15\u52A8?.\u5F53\u524D\u5927\u8FD0\u6D41\u5E74?.\u6D41\u5E74 || []) {
      const all = [...y.vs\u539F\u5C40 || [], ...y.vs\u5927\u8FD0 || []];
      heavyYear[y.\u5E74] = all.some((h) => h.type === "\u5929\u514B\u5730\u51B2" || h.type === "\u4F0F\u541F" || h.type === "\u5C81\u8FD0\u5E76\u4E34");
    }
    for (let i = 0; i < 10; i++) {
      const ln = lnArr[i];
      if (!ln) continue;
      let cls = (() => {
        const sc2 = gzScore(ln.ganZhi.gan, ln.ganZhi.zhi);
        return sc2 >= 1 ? "luck-ji" : sc2 <= -1 ? "luck-xiong" : "luck-ping";
      })();
      if (heavyYear[ln.year]) cls = downgrade(cls);
      out[`liunian.${i}.luck_class`] = cls;
    }
    out["__algo_luck"] = "1";
  }
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
function guFengCharSvg(type, gender) {
  const t = (type || "XXXX").toUpperCase();
  const F = gender === "female" || gender === "\u5973";
  const N = t[1] === "N", T = t[2] === "T", J = t[3] === "J", E = t[0] === "E";
  const grp = N ? T ? "NT" : "NF" : J ? "SJ" : "SP";
  const C = {
    NT: { m: "#6b5b8e", d: "#544672", dd: "#41365c", l: "#8d7db0", acc: "#b7a9d6", label: "\u519B\u5E08" },
    NF: { m: "#4a7c4e", d: "#3a633d", dd: "#2c4e2f", l: "#699e6d", acc: "#a9cbaa", label: "\u6587\u58EB" },
    SJ: { m: "#2a4a72", d: "#1f3a5c", dd: "#162c47", l: "#476a94", acc: "#9db6d4", label: "\u671D\u5B98" },
    SP: { m: "#a0672a", d: "#835420", dd: "#684218", l: "#c08544", acc: "#e0b97f", label: "\u6E38\u4FA0" }
  }[grp];
  const RM = E ? C.m : C.d;
  const RL = E ? C.l : C.m;
  const RD = E ? C.d : C.dd;
  const skin = "#f2d9bd", skinD = "#e3c19e", hair = "#3a3430", hairL = "#57504a", paper = "#f3ead7", paperD = "#ded2b6";
  const eyes = E ? `<circle cx="52.5" cy="38" r="2" fill="${hair}"/><circle cx="67.5" cy="38" r="2" fill="${hair}"/>` : `<path d="M49,38 Q52.5,40.6 56,38" stroke="${hair}" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M64,38 Q67.5,40.6 71,38" stroke="${hair}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  const smile = F ? E ? `<path d="M55.5,46 Q60,49.5 64.5,46" stroke="#b8524a" stroke-width="2" fill="none" stroke-linecap="round"/>` : `<path d="M57,46.8 Q60,48.8 63,46.8" stroke="#b8524a" stroke-width="1.8" fill="none" stroke-linecap="round"/>` : E ? `<path d="M54,45.5 Q60,50 66,45.5" stroke="${hair}" stroke-width="1.8" fill="none" stroke-linecap="round"/>` : `<path d="M56,46.5 Q60,49 64,46.5" stroke="${hair}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  let headwear = "";
  if (F) {
    if (grp === "SJ") {
      headwear = `<circle cx="60" cy="8" r="5.5" fill="${hair}"/><circle cx="62.5" cy="6" r="2" fill="${hairL}"/>
        <line x1="60" y1="6.5" x2="72" y2="2" stroke="#c9b96a" stroke-width="1.6" stroke-linecap="round"/>
        <line x1="72" y1="2" x2="73" y2="9" stroke="#c9b96a" stroke-width="1"/>
        <circle cx="73" cy="10.5" r="1.5" fill="#c9b96a"/><circle cx="73.4" cy="14" r="1.1" fill="#c9b96a"/>`;
    } else if (N && J) {
      headwear = `<circle cx="60" cy="8" r="5" fill="${hair}"/><circle cx="62" cy="6.5" r="1.8" fill="${hairL}"/>
        <line x1="49" y1="7" x2="73" y2="9.5" stroke="#79a88b" stroke-width="2" stroke-linecap="round"/>
        <circle cx="48" cy="6.8" r="1.7" fill="#79a88b"/>`;
    } else if (N && !J) {
      headwear = `<circle cx="52" cy="8" r="4.4" fill="none" stroke="${hair}" stroke-width="3"/>
        <circle cx="68" cy="8" r="4.4" fill="none" stroke="${hair}" stroke-width="3"/>
        <polygon points="70,7 88,3 90,8 71,11" fill="${C.acc}" opacity="0.9"/>`;
    } else {
      headwear = `<polygon points="60,2 67,9 60,15 53,9" fill="${hair}"/><polygon points="60,2 67,9 60,12" fill="${hairL}"/>
        <line x1="54.5" y1="11" x2="65.5" y2="11" stroke="#c1432f" stroke-width="1.8" stroke-linecap="round"/>
        <polygon points="78,26 108,30 92,52 80,44" fill="#c9a86a"/><polygon points="78,26 92,52 84,50 76,36" fill="#b08e50"/>
        <line x1="82" y1="30" x2="70" y2="60" stroke="#8b6f47" stroke-width="1.6"/>`;
    }
  } else if (grp === "SJ") {
    headwear = `<polygon points="47,21 73,21 70,9 50,9" fill="${hair}"/><polygon points="60,9 70,9 73,21 60,21" fill="${hairL}"/>
      <polygon points="43,21 77,21 75,26 45,26" fill="${hair}"/>
      <polygon points="18,19 42,18 42,24 20,25" fill="${hair}"/><polygon points="78,18 102,19 100,25 78,24" fill="${hairL}"/>`;
  } else if (N && J) {
    headwear = `<polygon points="52,14 68,14 66,4 54,4" fill="${C.dd}"/><polygon points="60,4 66,4 68,14 60,14" fill="${C.d}"/>
      <polygon points="50,14 70,14 69,18 51,18" fill="${C.acc}"/>
      <line x1="47" y1="16" x2="73" y2="16" stroke="${hairL}" stroke-width="1.2"/>`;
  } else if (N && !J) {
    headwear = `<polygon points="60,3 68,10 60,16 52,10" fill="${hair}"/><polygon points="60,3 68,10 60,13" fill="${hairL}"/>
      <polygon points="66,8 82,5 94,10 90,14 80,10 68,13" fill="${C.acc}"/>
      <line x1="53" y1="10" x2="61" y2="12" stroke="${C.acc}" stroke-width="2.2" stroke-linecap="round"/>`;
  } else {
    headwear = `<polygon points="60,3 68,10 60,16 52,10" fill="${hair}"/><polygon points="60,3 68,10 60,13" fill="${hairL}"/>
      <polygon points="78,26 108,30 92,52 80,44" fill="#c9a86a"/><polygon points="78,26 92,52 84,50 76,36" fill="#b08e50"/>
      <line x1="82" y1="30" x2="70" y2="60" stroke="#8b6f47" stroke-width="1.6"/>`;
  }
  const waist = T ? `<g transform="rotate(20 31 106)"><circle cx="31" cy="95" r="2" fill="#c9b96a"/><polygon points="29,96 33,96 32,105 30,105" fill="#6b5b46"/><polygon points="25,104 37,103 36,107 26,108" fill="#c9b96a"/></g>` : `<circle cx="33" cy="112" r="3.8" fill="none" stroke="#79a88b" stroke-width="2.2"/><line x1="33" y1="116" x2="31" y2="126" stroke="#79a88b" stroke-width="1.5"/><line x1="33" y1="116" x2="35" y2="125" stroke="#79a88b" stroke-width="1.5"/><line x1="33" y1="116" x2="33" y2="127" stroke="#c1432f" stroke-width="1.5"/>`;
  const sash = E ? `<polygon points="44,68 50,70 43,104 37,102" fill="${C.acc}" opacity="0.85"/><polygon points="76,68 70,70 77,104 83,102" fill="${C.acc}" opacity="0.85"/>` : "";
  const prop = {
    NT: `<g transform="rotate(14 92 98)"><polygon points="92,96 82,74 92,70 102,74" fill="#fbf7ee" stroke="${C.d}" stroke-width="1.2"/><polygon points="92,96 92,70 102,74" fill="${paperD}"/><line x1="92" y1="96" x2="92" y2="107" stroke="#8b6f47" stroke-width="2.8" stroke-linecap="round"/></g>`,
    NF: `<g><polygon points="46,96 74,94 75,103 47,105" fill="${paper}"/><polygon points="60,95 74,94 75,103 60,104" fill="${paperD}"/><polygon points="43,95 48,95 48,106 43,106" fill="#cbbc9c"/><polygon points="72,94 77,94 77,104 72,104" fill="#cbbc9c"/></g>`,
    SJ: `<g transform="rotate(-6 60 100)"><polygon points="55,91 65,90 67,110 53,111" fill="${paper}"/><polygon points="60,90.5 65,90 67,110 60,110.5" fill="${paperD}"/></g>`,
    SP: `<g><polygon points="90,86 95,92 90,97 85,92" fill="#b5651d"/><polygon points="90,95 97,102 90,109 83,102" fill="#b5651d"/><polygon points="90,95 97,102 90,109" fill="#9a5518"/><line x1="90" y1="88" x2="82" y2="79" stroke="#c1432f" stroke-width="1.6"/></g>`
  };
  return `<svg viewBox="0 0 120 150" width="118" height="148" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${t}\xB7${C.label}">
  <ellipse cx="60" cy="142" rx="34" ry="5.5" fill="rgba(0,0,0,0.09)"/>
  <polygon points="12,58 22,50 30,56 40,51 44,59 28,64" fill="${C.acc}" opacity="0.30"/>
  <polygon points="84,42 94,35 101,41 110,37 112,45 96,49" fill="${C.acc}" opacity="0.22"/>
  <polygon points="60,62 80,72 86,132 60,140" fill="${RD}"/>
  <polygon points="60,62 40,72 34,132 60,140" fill="${RM}"/>
  <polygon points="40,72 34,132 22,127 32,79" fill="${RD}"/>
  <polygon points="80,72 86,132 98,127 88,79" fill="${RL}"/>
  ${F ? `<polygon points="34,132 60,140 86,132 91,139 60,147 29,139" fill="${RD}"/><polygon points="60,140 86,132 91,139 60,147" fill="${RM}" opacity="0.55"/>` : ""}
  ${sash}
  <polygon points="50,66 60,86 60,72 54,65" fill="${paper}"/>
  <polygon points="70,66 60,86 60,72 66,65" fill="${paperD}"/>
  <polygon points="36,78 20,98 33,112 52,103 46,86" fill="${RD}"/>
  <polygon points="36,78 46,86 52,103 42,100" fill="${RM}"/>
  <polygon points="84,78 100,98 87,112 68,103 74,86" fill="${RL}"/>
  <polygon points="84,78 74,86 68,103 78,100" fill="${RM}"/>
  <polygon points="47,96 73,96 69,109 51,109" fill="${RD}"/>
  <polygon points="37,106 83,106 85,114 35,114" fill="${C.acc}"/>
  <polygon points="56,106 64,106 66,114 54,114" fill="${paper}"/>
  ${waist}
  ${prop[grp]}
  <polygon points="60,17 77,28 74,50 60,58" fill="${skinD}"/>
  <polygon points="60,17 43,28 46,50 60,58" fill="${skin}"/>
  <polygon points="57,40 60,34 63,40 60,47" fill="${skinD}"/>
  <polygon points="43,29 60,17 77,29 74,22 60,11 46,22" fill="${hair}"/>
  <polygon points="60,11 74,22 77,29 60,19" fill="${hairL}"/>
  ${headwear}
  ${eyes}
  ${smile}
  ${F ? `<polygon points="44,29 47,29 46,44 44,40" fill="${hair}"/><polygon points="76,29 73,29 74,44 76,40" fill="${hair}"/>
  <line x1="46" y1="50" x2="46" y2="53.5" stroke="#c9b96a" stroke-width="1"/><circle cx="46" cy="54.6" r="1.3" fill="#79a88b"/>
  <line x1="74" y1="50" x2="74" y2="53.5" stroke="#c9b96a" stroke-width="1"/><circle cx="74" cy="54.6" r="1.3" fill="#79a88b"/>
  <polygon points="60,22.5 61.6,25 60,27.5 58.4,25" fill="#c1432f" opacity="0.65"/>` : ""}
  <polygon points="45,43 50,42 49,47" fill="#e8a898" opacity="0.6"/>
  <polygon points="75,43 70,42 71,47" fill="#e8a898" opacity="0.6"/>
</svg>`;
}
var DM_LABEL = { \u7532: "\u53C2\u5929\u5927\u6811\xB7\u7532\u6728\u4EBA", \u4E59: "\u82B1\u8349\u85E4\u8513\xB7\u4E59\u6728\u4EBA", \u4E19: "\u592A\u9633\u4E4B\u706B\xB7\u4E19\u706B\u4EBA", \u4E01: "\u70DB\u706B\u661F\u5149\xB7\u4E01\u706B\u4EBA", \u620A: "\u9AD8\u5C71\u539A\u571F\xB7\u620A\u571F\u4EBA", \u5DF1: "\u7530\u56ED\u4E4B\u571F\xB7\u5DF1\u571F\u4EBA", \u5E9A: "\u5200\u5251\u4E4B\u91D1\xB7\u5E9A\u91D1\u4EBA", \u8F9B: "\u73E0\u7389\u4E4B\u91D1\xB7\u8F9B\u91D1\u4EBA", \u58EC: "\u6C5F\u6CB3\u4E4B\u6C34\xB7\u58EC\u6C34\u4EBA", \u7678: "\u96E8\u9732\u4E4B\u6C34\xB7\u7678\u6C34\u4EBA" };
function chartToFlatMbti(chart, currentYear) {
  const out = {};
  const bi = chart.bazi.birthInfo, bz = chart.bazi, en = bz.enrichment || {};
  const p2 = (n) => String(n).padStart(2, "0");
  out["meta.solar_date"] = `${bi.year}-${p2(bi.month)}-${p2(bi.day)} ${p2(bi.hour)}:${p2(bi.minute)}`;
  out["meta.gender"] = bi.gender === "male" ? "\u7537" : "\u5973";
  out["meta.name"] = "\u547D\u4E3B";
  for (const k of ["year", "month", "day", "hour"]) {
    const gz = bz.siZhu[k];
    out[`bazi.${k}.gan`] = gz.gan;
    out[`bazi.${k}.zhi`] = gz.zhi;
    out[`bazi.${k}.gan_wx`] = GAN_WX[gz.gan] || "-";
    out[`bazi.${k}.zhi_wx`] = ZHI_WX[gz.zhi] || "-";
  }
  const bw = en.\u516B\u7EF4\u7ED3\u6784;
  out["mbti.type"] = bw?.\u6700\u50CF\u7C7B\u578B || "-";
  out["mbti.alt"] = bw?.\u5907\u9009\u7C7B\u578B || "-";
  out["mbti.alt2"] = bw?.\u5907\u90092 || "\u2014";
  out["mbti.conf"] = bw?.\u7F6E\u4FE1 || "-";
  out["mbti.dom"] = bw?.\u4E3B\u5BFC || "-";
  out["mbti.aux"] = bw?.\u8F85\u52A9 || "-";
  out["mbti.dm_label"] = DM_LABEL[bz.siZhu.day.gan] || "\u547D\u4E3B";
  const top = (bw?.\u516B\u7EF4 || [])[0];
  out["mbti.bars_rows_html"] = (bw?.\u516B\u7EF4 || []).map((x, i) => `<div class="bar-row${i === 0 ? " top" : ""}"><span class="fn">${x.\u529F\u80FD}</span><span class="desc">${x.\u8BF4\u660E}</span><span class="track"><span class="fill" style="width:${Math.min(100, x.\u767E\u5206\u6BD4 * 3)}%"></span></span><span class="pct">${x.\u767E\u5206\u6BD4}%</span></div>`).join("");
  out["mbti.tagline"] = "-";
  out["mbti.diff_section_html"] = "";
  out["mbti.char_svg"] = guFengCharSvg(bw?.\u6700\u50CF\u7C7B\u578B || "XXXX", bi.gender);
  return out;
}
function analysisToFlatMbti(a, chart) {
  const out = {};
  if (a?.meta?.name) out["meta.name"] = a.meta.name;
  if (a?.mbti_tagline) out["mbti.tagline"] = a.mbti_tagline;
  for (const k of ["overview_html", "sanguan_html", "friends_html", "love_html", "work_html", "family_html", "hobbies_html"])
    out[`m.${k}`] = a?.[k] != null ? a[k] : "-";
  const tested = (a?.meta?.tested_mbti || "").toUpperCase().trim();
  const type = chart?.bazi?.enrichment?.\u516B\u7EF4\u7ED3\u6784?.\u6700\u50CF\u7C7B\u578B || "";
  if (/^[EI][NS][TF][JP]$/.test(tested) && a?.diff_html) {
    const dv = a?.diff_verdict || "";
    out["mbti.diff_section_html"] = `<section class="section"><h2><span class="num-box">09</span><svg class="sec-ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12,3 a4.5,4.5 0 0 0 0,9 a4.5,4.5 0 0 1 0,9"/><circle cx="12" cy="7.5" r="1.2" fill="var(--indigo)" stroke="none"/><circle cx="12" cy="16.5" r="1.2" stroke="none" fill="var(--paper)"/></svg>\u5F53\u5B9E\u6D4B\u9047\u4E0A\u5E95\u76D8 <small>\uFF08\u4F60\u63D0\u4F9B\u7684\u5B9E\u6D4B\u7C7B\u578B \xD7 \u76D8\u9762\u7ED3\u6784\uFF09</small></h2><div class="diff-hero"><span class="dt num">${tested}</span><span class="dx">\xD7</span><span class="dt dt2 num">${type}</span></div>${dv ? `<div class="diff-verdict">${dv}</div>` : ""}<div class="prose">${a.diff_html}</div></section>`;
  }
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
    console.error("Usage: npx tsx render.ts --chart=chart.json [--analysis=analysis.json] --template=path/to/template.html [--output=out.html] [--mode=zonghe|bazi|mbti] [--currentYear=YYYY] [--name=\u547D\u4E3B\u59D3\u540D] [--testedMBTI=XXXX]");
    process.exit(1);
  }
  const chart = JSON.parse(fs.readFileSync(args.chart, "utf-8"));
  const analysis = args.analysis ? JSON.parse(fs.readFileSync(args.analysis, "utf-8")) : {};
  const template = fs.readFileSync(args.template, "utf-8");
  const mode = args.mode || "zonghe";
  let data;
  if (mode === "mbti") {
    data = { ...chartToFlatMbti(chart, args.currentYear ? +args.currentYear : void 0), ...analysisToFlatMbti(analysis, chart) };
    if (args.testedMBTI && !data["mbti.diff_section_html"] && analysis?.diff_html) {
      const t = String(args.testedMBTI).toUpperCase();
      if (/^[EI][NS][TF][JP]$/.test(t)) data["mbti.diff_section_html"] = `<section class="section"><h2><span class="num-box">09</span><svg class="sec-ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12,3 a4.5,4.5 0 0 0 0,9 a4.5,4.5 0 0 1 0,9"/><circle cx="12" cy="7.5" r="1.2" fill="var(--indigo)" stroke="none"/><circle cx="12" cy="16.5" r="1.2" stroke="none" fill="var(--paper)"/></svg>\u5F53\u5B9E\u6D4B\u9047\u4E0A\u5E95\u76D8</h2><div class="diff-hero"><span class="dt num">${t}</span><span class="dx">\xD7</span><span class="dt dt2 num">${data["mbti.type"]}</span></div>${analysis.diff_verdict ? `<div class="diff-verdict">${analysis.diff_verdict}</div>` : ""}<div class="prose">${analysis.diff_html}</div></section>`;
    }
  } else if (mode === "bazi") {
    const chartFlat = chartToFlatBazi(chart, args.currentYear ? +args.currentYear : void 0);
    const analysisFlat = analysisToFlatBazi(analysis);
    if (chartFlat["__algo_yongshen"]) {
      for (const k of [
        "yongshen.yong_html",
        "yongshen.xi_text",
        "yongshen.ji_html",
        "yongshen.tiaohou_html",
        "yongshen.divergence_note",
        "kaiyun.yong_html",
        "kaiyun.fang_html",
        "kaiyun.se_html",
        "kaiyun.shu_html",
        "kaiyun.tiaohou_html"
      ]) delete analysisFlat[k];
      delete chartFlat["__algo_yongshen"];
    }
    if (chartFlat["__algo_luck"]) {
      for (const k of Object.keys(analysisFlat)) if (/\.(luck_class)$/.test(k)) delete analysisFlat[k];
      delete chartFlat["__algo_luck"];
    }
    data = { ...chartFlat, ...analysisFlat };
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

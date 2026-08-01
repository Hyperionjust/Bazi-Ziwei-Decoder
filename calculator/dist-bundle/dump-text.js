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

// dump-text.ts
var fs = __toESM(require("fs"));
function parseArgs() {
  const args = {};
  for (const a of process.argv.slice(2)) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  }
  return args;
}
function dumpShichenBoundary(b) {
  const sb = b?.enrichment?.\u65F6\u8FB0\u8FB9\u754C;
  if (!sb || !sb.boundary) return [];
  const lines = [];
  const dir = sb.\u8DDD\u4EA4\u754C\u5206\u949F >= 0 ? `\u4EA4\u754C\u540E ${sb.\u8DDD\u4EA4\u754C\u5206\u949F} \u5206\u949F` : `\u4EA4\u754C\u524D ${-sb.\u8DDD\u4EA4\u754C\u5206\u949F} \u5206\u949F`;
  lines.push("\u26A0 \u65F6\u8FB0\u4E34\u754C\u3014\u5E55\u540E\u65BD\u5DE5\u56FE:\u672A\u6838\u76D8\u524D\u4E0D\u8FDB\u5165\u89E3\u8BFB\u2014\u2014\u6309 SKILL.md\u300C\u65F6\u8FB0\u4E34\u754C\u6838\u76D8\u300D\u5206\u652F\u5904\u7406\u3015");
  lines.push(`\u2502 \u251C\u6392\u76D8\u65F6\u523B ${sb.\u6392\u76D8\u65F6\u523B} \u8DDD\u65F6\u8FB0\u4EA4\u754C ${sb.\u6700\u8FD1\u4EA4\u754C} \u4EC5 ${Math.abs(sb.\u8DDD\u4EA4\u754C\u5206\u949F)} \u5206\u949F(${dir})`);
  lines.push(`\u2502 \u251C\u5019\u9009\u65F6\u8FB0A(\u5F53\u524D\u76D8) : ${sb.\u5F53\u524D\u65F6\u8FB0}`);
  if (sb.\u5019\u9009\u65F6\u8FB0) lines.push(`\u2502 \u251C\u5019\u9009\u65F6\u8FB0B : ${sb.\u5019\u9009\u65F6\u8FB0.\u540D}(${sb.\u5019\u9009\u65F6\u8FB0.\u533A\u95F4}) \u2014 ${sb.\u5019\u9009\u65F6\u8FB0.\u8BF4\u660E}`);
  lines.push(`\u2502 \u251C\u5224\u5B9A\u53E3\u5F84 : ${sb.\u53E3\u5F84}`);
  if (sb.solar_note) lines.push(`\u2502 \u251Csolar_note : ${sb.solar_note}`);
  lines.push("\u2502 \u2514\u5904\u7406 : \u2460\u8FFD\u95EE\u51FA\u751F\u5730(\u57CE\u5E02\u5373\u53EF)\u6362\u7B97\u7ECF\u5EA6\u91CD\u6392;\u6216\u2461\u6309\u4E24\u4E2A\u5019\u9009\u65F6\u8FB0\u5404\u6392\u4E00\u76D8,\u8BF7\u7528\u6237\u62A5 2~3 \u4E2A\u8FC7\u5F80\u5927\u4E8B\u5E74\u4EFD,\u7528\u8FD0\u5C81\u5F15\u52A8\u5BF9\u7167\u9009\u76D8\u3002\u7528\u6237\u660E\u786E\u575A\u6301\u5F53\u524D\u65F6\u95F4\u5219\u7EE7\u7EED,\u7F6E\u4FE1\u5EA6\u6309\u4F4E\u6863\u5904\u7406\u3002");
  lines.push("");
  return lines;
}
function dumpZiwei(z, bi) {
  const lines = [];
  lines.push("\u7D2B\u5FAE\u6597\u6570\u547D\u76D8");
  lines.push("\u2502");
  lines.push("\u251C\u57FA\u672C\u4FE1\u606F");
  lines.push(`\u2502 \u251C\u6027\u522B : ${bi.gender === "male" ? "\u7537" : "\u5973"}`);
  lines.push(`\u2502 \u251C\u9633\u5386 : ${bi.year}-${String(bi.month).padStart(2, "0")}-${String(bi.day).padStart(2, "0")} ${String(bi.hour).padStart(2, "0")}:${String(bi.minute).padStart(2, "0")}`);
  if (z.lunarDate) {
    lines.push(`\u2502 \u251C\u519C\u5386 : ${z.lunarDate.year}\u5E74${z.lunarDate.monthCn}\u6708${z.lunarDate.dayCn}`);
  }
  if (z.siZhu) {
    const sz = z.siZhu;
    lines.push(`\u2502 \u251C\u8282\u6C14\u56DB\u67F1 : ${sz.year.gan}${sz.year.zhi} ${sz.month.gan}${sz.month.zhi} ${sz.day.gan}${sz.day.zhi} ${sz.hour.gan}${sz.hour.zhi}`);
  }
  lines.push(`\u2502 \u251C\u9634\u9633 : ${z.yinYang || ""}`);
  lines.push(`\u2502 \u251C\u4E94\u884C\u5C40 : ${z.wuXingJu?.name || ""}`);
  const DIZHI = ["\u5B50", "\u4E11", "\u5BC5", "\u536F", "\u8FB0", "\u5DF3", "\u5348", "\u672A", "\u7533", "\u9149", "\u620C", "\u4EA5"];
  const mingDizhi = z.gongs[0]?.dizhi;
  const shenDizhi = DIZHI[z.shenGongIndex];
  lines.push(`\u2502 \u2514\u547D\u5BAB=${mingDizhi}  \u8EAB\u5BAB=${shenDizhi}`);
  lines.push("\u2502");
  const allSihua = [];
  for (const g of z.gongs) {
    for (const s of g.sihua || []) {
      allSihua.push(`${s.star}${s.hua}`);
    }
  }
  if (allSihua.length > 0) {
    lines.push("\u251C\u751F\u5E74\u56DB\u5316");
    lines.push(`\u2502 \u2514${allSihua.join(" \xB7 ")}`);
    lines.push("\u2502");
  }
  lines.push("\u251C\u547D\u76D8\u5341\u4E8C\u5BAB");
  z.gongs.forEach((g, idx) => {
    const isLast = idx === z.gongs.length - 1;
    const prefix = isLast ? "\u2502 \u2514" : "\u2502 \u251C";
    const childPrefix = isLast ? "\u2502   " : "\u2502 \u2502 ";
    const isMing = g.gong === "\u547D\u5BAB";
    const isShen = g.dizhi === shenDizhi;
    const marks = [];
    if (isMing) marks.push("[\u547D]");
    if (isShen && !isMing) marks.push("[\u8EAB]");
    const gongName = g.gong.endsWith("\u5BAB") ? g.gong : g.gong + "\u5BAB";
    lines.push(`${prefix}${gongName}[${g.tiangan}${g.dizhi}]${marks.join("")}`);
    const main2 = g.mainStars && g.mainStars.length > 0 ? g.mainStars.join("\xB7") : "\u65E0\u4E3B\u661F";
    lines.push(`${childPrefix}\u251C\u4E3B\u661F : ${main2}`);
    const aux = g.auxStars && g.auxStars.length > 0 ? g.auxStars.join("\xB7") : "\u65E0";
    lines.push(`${childPrefix}\u251C\u8F85\u661F : ${aux}`);
    if (g.sihua && g.sihua.length > 0) {
      lines.push(`${childPrefix}\u251C\u751F\u5E74\u56DB\u5316 : ${g.sihua.map((s) => s.star + s.hua).join("\xB7")}`);
    }
    if (g.daXian) {
      const dxMark = g.daXian.isCurrent ? "\u2605\u5F53\u524D" : "";
      lines.push(`${childPrefix}\u251C\u5927\u9650 : ${g.daXian.startAge}-${g.daXian.endAge}\u865A\u5C81${dxMark ? " " + dxMark : ""}`);
    }
    if (g.liuNian && g.liuNian.length > 0) {
      lines.push(`${childPrefix}\u2514\u6D41\u5E74 : ${g.liuNian[0]}-${g.liuNian[g.liuNian.length - 1]}\u865A\u5C81\u9010\u5E74\u843D\u6B64\u5BAB`);
    }
    if (!isLast) lines.push("\u2502 \u2502");
  });
  return lines;
}
function dumpBazi(b, bi) {
  const lines = [];
  lines.push("");
  lines.push("\u516B\u5B57\u547D\u76D8");
  lines.push("\u2502");
  const zc = b.zishi_convention;
  if (zc) {
    lines.push(`\u251C\u26A0\u665A\u5B50\u65F6\u7EA6\u5B9A\u3014\u987B\u5411\u7528\u6237\u767D\u8BDD\u62AB\u9732\u3015: \u51FA\u751F\u4E8E ${zc.window},\u672C\u76D8\u6309\u3010${zc.\u7EA6\u5B9A}\u3011\u6392\u76D8`);
    lines.push(`\u2502 \u2514${zc.\u8BF4\u660E}`);
    lines.push("\u2502");
  }
  const sz = b.siZhu;
  const ss = b.shiShen;
  const zs = b.zhangSheng || {};
  const zz = b.enrichment?.\u81EA\u5750 || {};
  const ny = b.naYin || {};
  const cg = b.cangGan || {};
  lines.push("\u251C\u56DB\u67F1");
  const cols = ["\u5E74", "\u6708", "\u65E5", "\u65F6"];
  const pillarKeys = ["year", "month", "day", "hour"];
  const cangGanFmt = (pk) => {
    const arr = cg[pk];
    if (!Array.isArray(arr)) return "";
    return arr.map((x) => `${x.gan}(${x.shiShen || ""})`).join(" ");
  };
  for (let i = 0; i < 4; i++) {
    const isLast = i === 3;
    const pre = isLast ? "\u2502 \u2514" : "\u2502 \u251C";
    const subPre = isLast ? "\u2502   " : "\u2502 \u2502 ";
    const pk = pillarKeys[i];
    const sx = ss[pk] || "";
    const isDay = pk === "day";
    const tag = isDay ? `[\u65E5\u4E3B]` : `[${sx}]`;
    lines.push(`${pre}${cols[i]}\u67F1 : ${sz[pk].gan}${sz[pk].zhi} ${tag}`);
    if (cg[pk]) lines.push(`${subPre}\u251C\u85CF\u5E72 : ${cangGanFmt(pk)}`);
    lines.push(`${subPre}\u251C\u661F\u8FD0 : ${zs[pk] || "-"}`);
    lines.push(`${subPre}\u251C\u81EA\u5750 : ${zz[cols[i]] || zz[pk] || "-"}`);
    lines.push(`${subPre}\u2514\u7EB3\u97F3 : ${ny[pk] || "-"}`);
    if (!isLast) lines.push("\u2502 \u2502");
  }
  lines.push("\u2502");
  if (b.dayun && b.dayun.length > 0) {
    lines.push(`\u251C\u5927\u8FD0 (\u8D77\u8FD0 ${b.dayunStart}\u5C81 \xB7 \u9762\u5411\u7528\u6237\u63D0\u53CA\u5927\u8FD0\u8FB9\u754C\u65F6\u7167\u6284\u4E0B\u884C\u300C\u8D77\u5E74-\u6B62\u5E74 \u5E74(\u7EA6X-X\u5C81)\u300D\u5E74\u4EFD\u4E3A\u4E3B\u683C\u5F0F)`);
    b.dayun.slice(0, 10).forEach((d, i) => {
      const isLast = i === Math.min(9, b.dayun.length - 1);
      const pre = isLast ? "\u2502 \u2514" : "\u2502 \u251C";
      const dxTag = `${d.ganShiShen || ""}/${d.zhiShiShen || ""}`;
      lines.push(`${pre}${d.startYear}-${d.endYear} \u5E74(\u7EA6${d.startAge}-${d.endAge}\u5C81)  ${d.ganZhi.gan}${d.ganZhi.zhi}  (${dxTag})`);
    });
    lines.push("\u2502");
  }
  const rare = b.enrichment?.\u7F55\u8C61;
  if (rare && Array.isArray(rare) && rare.length > 0) {
    lines.push(`\u251C\u7F55\u8C61 \u2B50(${rare.length}\u9879\xB7\u795E\u715E\u4E0E\u5408\u51B2\u5211\u5BB3\u7AE0\u987B\u4F18\u5148\u8BB2\u89E3,\u6309\u7F55\u89C1\u5EA6\u964D\u5E8F)`);
    rare.forEach((r, i) => {
      const last = i === rare.length - 1;
      lines.push(`${last ? "\u2502 \u2514" : "\u2502 \u251C"}\u3010${r.\u7F55\u89C1\u5EA6}\u3011${r.\u540D} \u2014 ${r.\u6D89\u53CA} \u2014 ${r.\u8BF4\u660E}`);
    });
    lines.push("\u2502");
  }
  const ss2 = b.enrichment?.\u795E\u715E;
  if (ss2) {
    const active = (ss2.lineage ? ss2.lineage.hits : ss2.hits) || [];
    const title = ss2.lineage ? `\u251C\u795E\u715E (\u6309\u3010${ss2.lineage.name}\u3011\u955C\u7247 \xB7 ${active.length}\u9879; \u4E2D\u7ACB\u5168\u96C6 ${(ss2.hits || []).length}\u9879)` : `\u251C\u795E\u715E (\u5168\u96C6\xB7\u6D41\u6D3E\u4E2D\u7ACB \xB7 ${active.length}\u9879)`;
    lines.push(title);
    const polCn = { "\u5409": "\u5409", "\u51F6": "\u51F6", "\u4E2D\u6027": "\u4E2D" };
    const review = [];
    if (active.length === 0) {
      lines.push("\u2502 \u2514(\u672C\u76D8\u6309\u5F53\u524D\u955C\u7247\u65E0\u547D\u4E2D\u795E\u715E)");
    } else {
      active.forEach((h, i) => {
        const last = i === active.length - 1;
        const pre = last ? "\u2502 \u2514" : "\u2502 \u251C";
        const where = (h.pillars || []).join("") || "-";
        const via = h.via ? `  (via ${h.via})` : "";
        const flag = h.needs_review ? "  \u26A0\u8D77\u6CD5\u5F85\u6838" : "";
        let lwStr = "";
        if (h.lineage_weights) {
          const zh = [], can = [], no = [];
          for (const [cn, w] of Object.entries(h.lineage_weights)) {
            if (w >= 2) zh.push(cn);
            else if (w >= 1) can.push(cn);
            else no.push(cn);
          }
          const seg = [];
          if (zh.length) seg.push(`\u91CD\u7528:${zh.join("\xB7")}`);
          if (can.length) seg.push(`\u53C2\u7528:${can.join("\xB7")}`);
          if (no.length) seg.push(no.length >= 4 ? "\u56DB\u6D3E\u5747\u4E0D\u7528" : `\u4E0D\u7528:${no.join("\xB7")}`);
          lwStr = `  \u3014\u6D3E\u7CFB\u4FA7\u91CD ${seg.join(" / ")}\u3015`;
        }
        lines.push(`${pre}${h.name} [${h.tier}\xB7${polCn[h.polarity] || h.polarity}] @${where}${via}${flag}${lwStr}`);
        if (h.classical_check) lines.push(`\u2502   \u21B3 ${h.classical_check}`);
        if (h.needs_review) review.push(h.name);
      });
      if (review.length) lines.push(`\u2502   \u26A0 \u8D77\u6CD5\u5F85\u6838(\u843D\u5730\u524D\u4EE5\u6587\u732E\u5B9A\u7248): ${review.join("\u3001")}`);
    }
    lines.push("\u2502");
  }
  const en = b.enrichment;
  if (en) {
    lines.push("\u251C\u7B97\u6CD5\u8865\u5C42 \u3014\u5E55\u540E\u65BD\u5DE5\u56FE:\u4EE5\u4E0B\u673A\u5236\u4FE1\u606F(\u4F9D\u636E/\u5BA1\u8BA1/\u534F\u8BAE/\u4FA7\u91CD/rubric)\u4EC5\u4F9B\u4F60\u63A8\u7406,\u4E25\u7981\u5411\u7528\u6237\u5C55\u793A\u6216\u89E3\u91CA;\u7528\u6237\u53EA\u770B\u7ED3\u8BBA\u3015");
    const ct = en.confidence_tier;
    if (ct) {
      lines.push(`\u2502 \u251C\u5168\u5C40\u7F6E\u4FE1\u5EA6(confidence_tier\xB7\u9884\u6D4B\u6027\u7AE0\u8282\u6309\u6B64\u6863\u5B9A\u63AA\u8F9E) : ${ct.tier} \u2014 ${(ct.\u4F9D\u636E || []).join(";")}`);
      const dims = ct.\u7EF4\u5EA6;
      if (dims) {
        const KEYS = ["\u65FA\u8870", "\u683C\u5C40", "\u8C03\u5019", "\u5E94\u671F"];
        const dimStr = KEYS.map((k) => `${k}:${dims[k]}`).join(" ");
        const notHigh = KEYS.filter((k) => dims[k] !== "high");
        const why = notHigh.length ? ` \u2014 ${notHigh.map((k) => `${k}=${(ct.\u7EF4\u5EA6\u4F9D\u636E || {})[k] || ""}`).join(";")}` : "";
        lines.push(`\u2502 \u2502 ${ct.tier === "low" ? "\u251C" : "\u2514"}\u5206\u7EF4(\u6309\u8BBA\u65AD\u7C7B\u578B\u53D6\u6863:\u65FA\u8870\u2192\u6027\u683C\u5F3A\u5F31/\u7CBE\u529B,\u683C\u5C40\u2192\u5C42\u6B21/\u4E8B\u4E1A\u7ED3\u6784,\u8C03\u5019\u2192\u5B63\u8282\u4F53\u611F/\u5BD2\u71E5\u8C03\u7406,\u5E94\u671F\u2192\u5E74\u4EFD\u7A97\u53E3) : ${dimStr}${why}`);
      }
      if (ct.tier === "low") lines.push("\u2502 \u2502 \u2514\u26A0 low \u6863\u5F3A\u5236: \u4E8B\u4E1A/\u8D22\u8FD0/\u5A5A\u604B/\u5927\u8FD0\u6D41\u5E74\u591A\u7528\u6761\u4EF6\u53E5,\u5E94\u671F\u7ED9\u533A\u95F4\u4E0D\u7ED9\u5355\u5E74,\u7981\u300C\u5FC5\u7136/\u4E00\u5B9A\u4F1A/\u80AF\u5B9A\u4F1A/\u94C1\u5B9A\u300D\u7C7B\u65AD\u8BED;\u951A\u70B9\u767D\u8BDD\u58F0\u660E\u4E00\u6B21\u4FDD\u5B88\u53E3\u5F84;\u5206\u7EF4\u4E3A high \u7684\u8BBA\u65AD\u7C7B\u578B\u53EF\u4FDD\u6301\u6B63\u5E38\u9510\u5EA6(\u951A\u70B9\u58F0\u660E\u4ECD\u51FA)");
    }
    const ya = en.\u7528\u795E\u5EFA\u8BAE;
    if (ya) {
      lines.push("\u2502 \u251C\u7528\u795E\u5EFA\u8BAE(\u7B97\u6CD5\u5C42\u4E09\u7EBF\u88C1\u51B3\xB7\u89E3\u8BFB\u53EA\u8F6C\u8FF0\u4E0D\u5F97\u81EA\u521B)");
      lines.push(`\u2502 \u2502 \u251C\u6276\u6291\u7EBF : \u53D6[${(ya.\u6276\u6291?.\u53D6 || []).join("")}] \u5FCC[${(ya.\u6276\u6291?.\u5FCC || []).join("")}] \u2014 ${ya.\u6276\u6291?.\u4F9D\u636E || ""}${ya.\u6276\u6291?.\u4E34\u754C ? " \u26A0\u4E34\u754C" : ""}`);
      lines.push(`\u2502 \u2502 \u251C\u8C03\u5019\u7EBF : \u53D6[${(ya.\u8C03\u5019?.\u53D6 || []).join("")}](${(ya.\u8C03\u5019?.\u53D6\u5E72 || []).join("")}) \u2014 ${ya.\u8C03\u5019?.\u4F9D\u636E || ""}`);
      lines.push(`\u2502 \u2502 \u251C\u683C\u5C40\u7EBF : \u53D6[${(ya.\u683C\u5C40?.\u53D6 || []).join("")}] \u2014 ${ya.\u683C\u5C40?.\u4F9D\u636E || ""}(\u7F6E\u4FE1\u5EA6:${ya.\u683C\u5C40?.\u7F6E\u4FE1\u5EA6 || "-"})`);
      lines.push(`\u2502 \u2502 \u251C\u6536\u655B : ${ya.\u6536\u655B ? "\u2713 \u5171\u8BC6\u7528\u795E[" + (ya.\u5171\u8BC6\u7528\u795E || []).join("") + "]" : "\u2717 \u4E0D\u6536\u655B"} | \u8FB9\u754C\u76D8 : ${ya.\u8FB9\u754C\u76D8 ? "\u662F" : "\u5426"}`);
      if (ya.\u51FA\u53E3) lines.push(`\u2502 \u2502 \u251C\u51FA\u53E3(\u5355\u503C\u88C1\u51B3) : \u5F00\u8FD0\u7528\u795E[${(ya.\u51FA\u53E3.\u5F00\u8FD0\u7528\u795E || []).join("")}] \u559C[${(ya.\u51FA\u53E3.\u559C\u795E || []).join("")}] \u5FCC[${(ya.\u51FA\u53E3.\u5FCC\u795E || []).join("") || "\u65E0(\u4E34\u754C)"}] \u8C03\u5019[${ya.\u51FA\u53E3.\u8C03\u5019\u63D0\u793A || "-"}]${ya.\u51FA\u53E3.divergence ? "  " + ya.\u51FA\u53E3.divergence : ""}${ya.\u51FA\u53E3.\u7F3A\u8865\u8BF4\u660E ? "  \u3014" + ya.\u51FA\u53E3.\u7F3A\u8865\u8BF4\u660E + "\u3015" : ""}`);
      const zc2 = ya.\u51FA\u53E3?.\u8F74\u51B2\u7A81;
      if (zc2) {
        lines.push(`\u2502 \u2502 \u251C\u26A0\u8F74\u51B2\u7A81\u3014\u8C03\u5019\u2229\u51FA\u53E3\u5FCC\u3015: ${zc2.\u4E94\u884C.join("\u3001")} \u2014 \u540C\u4E00\u4E2A\u4E94\u884C\u5728\u4E24\u6761\u7EBF\u4E0A\u5531\u53CD\u8C03`);
        lines.push(`\u2502 \u2502 \u2502 \u251C\u8C03\u5019\u4FA7 : ${zc2.\u8C03\u5019\u4FA7}`);
        lines.push(`\u2502 \u2502 \u2502 \u251C\u6276\u6291\u4FA7 : ${zc2.\u6276\u6291\u4FA7}`);
        lines.push(`\u2502 \u2502 \u2502 \u2514\u51FA\u6587\u8981\u6C42 : ${zc2.\u51FA\u6587\u8981\u6C42}`);
      }
      const cj = ya.\u51FA\u53E3?.\u76F8\u795E\u88C1\u51B3;
      if (cj) {
        lines.push(`\u2502 \u2502 \u251C\u2696\u76F8\u795E\u88C1\u51B3\u3014S1-3\xB7\u683C\u5C40\u76F8\u795E/\u6276\u6291\u5FCC\u3015: \u76F8\u795E[${cj.\u683C\u5C40\u76F8\u795E.join("\u3001")}] \u2014 \u91CD\u795E:${cj.\u91CD\u795E}`);
        lines.push(`\u2502 \u2502 \u2502 \u251C\u6539\u6CD5 : ${cj.\u6539\u6CD5}${cj.\u81EA\u6276\u6291\u5FCC\u6551\u56DE.length ? `(${cj.\u81EA\u6276\u6291\u5FCC\u6551\u56DE.join("\u3001")}\u81EA\u6276\u6291\u5FCC\u6E05\u5355\u6551\u56DE)` : ""}`);
        lines.push(`\u2502 \u2502 \u2502 \u251C\u6240\u5236\u4E4B\u795E : ${cj.\u6240\u5236\u4E4B\u795E.\u4E94\u884C} \u2014 ${cj.\u6240\u5236\u4E4B\u795E.\u5904\u7F6E}`);
        if (cj.\u6BD4\u52AB\u5904\u7F6E) lines.push(`\u2502 \u2502 \u2502 \u251C\u6BD4\u52AB\u5904\u7F6E : ${cj.\u6BD4\u52AB\u5904\u7F6E}`);
        lines.push(`\u2502 \u2502 \u2502 \u251C\u4F9D\u636E : ${cj.\u4F9D\u636E}`);
        lines.push(`\u2502 \u2502 \u2502 \u2514\u51FA\u6587\u8981\u6C42 : ${cj.\u51FA\u6587\u8981\u6C42}`);
      }
      lines.push(`\u2502 \u2502 \u2514\u51FA\u6587\u534F\u8BAE : ${ya.\u51FA\u6587\u534F\u8BAE || ""}`);
    }
    const bw = en.\u516B\u7EF4\u7ED3\u6784;
    if (bw) {
      lines.push(`\u2502 \u251C\u516B\u7EF4\u7ED3\u6784(\u8363\u683C\u516B\u7EF4\xB7MBTI\u6620\u5C04\u53C2\u8003\xB7\u7C7B\u578B\u7167\u6284) : \u6700\u50CF\u3010${bw.\u6700\u50CF\u7C7B\u578B}\u3011\u5907\u9009\u3010${bw.\u5907\u9009\u7C7B\u578B}\u3011\u7F6E\u4FE1${bw.\u7F6E\u4FE1} \u2014 \u4E3B\u5BFC${bw.\u4E3B\u5BFC}/\u8F85\u52A9${bw.\u8F85\u52A9}`);
      lines.push(`\u2502 \u2502 \u251C\u516B\u7EF4: ${bw.\u516B\u7EF4.map((x) => `${x.\u529F\u80FD}${x.\u767E\u5206\u6BD4}%`).join(" ")}`);
      if (bw.\u4F9D\u636E) lines.push(`\u2502 \u2502 \u251C\u4F9D\u636E: ${bw.\u4F9D\u636E}`);
      lines.push(`\u2502 \u2502 \u2514\u58F0\u660E: ${bw.\u58F0\u660E}`);
    }
    const zy = en.\u6B63\u7F18\u503E\u5411;
    if (zy) {
      lines.push(`\u2502 \u251C\u6B63\u7F18\u503E\u5411(\u7B97\u6CD5\u5224\u5B9A\xB7\u753B\u50CF\u5E74\u9F84\u7167\u6284) : \u3010${zy.\u5E74\u9F84\u503E\u5411}\u3011\u7F6E\u4FE1${zy.\u7F6E\u4FE1} \u2014 ${zy.\u592B\u59BB\u661F}:${zy.\u661F\u4F4D};\u5BAB\u5750${zy.\u5BAB\u5750} \u2014 ${zy.\u4F9D\u636E}`);
    }
    lines.push(`\u2502 \u251C\u683C\u5C40 : ${en.\u683C\u5C40?.primary || "-"}  (\u7F6E\u4FE1\u5EA6: ${en.\u683C\u5C40?.confidence || "-"})`);
    if (en.\u683C\u5C40?.basis) lines.push(`\u2502 \u2502 \u2514\u4F9D\u636E : ${en.\u683C\u5C40.basis}`);
    if (en.\u683C\u5C40?.notes && en.\u683C\u5C40.notes.length) {
      for (const note of en.\u683C\u5C40.notes) lines.push(`\u2502 \u2502 \u2514\u5907\u6CE8 : ${note}`);
    }
    const ws = en.\u65FA\u8870;
    if (ws) {
      const lvl = ws.verdict || ws.level || "-";
      const score = ws.score !== void 0 ? `score=${ws.score}` : "";
      lines.push(`\u2502 \u251C\u65FA\u8870 : ${lvl}  (${score}, \u7F6E\u4FE1\u5EA6: ${ws.confidence || "-"})`);
      if (ws.breakdown) {
        const b2 = ws.breakdown;
        lines.push(`\u2502 \u2502 \u2514\u4E03\u9879\u8D26\u672C : \u5F97\u4EE4${b2.\u5F97\u4EE4 ?? 0} \u957F\u751F${b2.\u957F\u751F ?? 0} \u5F97\u5730${b2.\u5F97\u5730 ?? 0} \u5F97\u52BF${b2.\u5F97\u52BF ?? 0} \u4F1A\u5C40${b2.\u4F1A\u5C40 ?? 0} \u8017\u65B9\u7FA4\u52BF${b2.\u8017\u65B9\u7FA4\u52BF ?? 0} \u51B2\u6839\u4FEE\u6B63${b2.\u51B2\u6839\u4FEE\u6B63 ?? 0}`);
      }
    }
    if (en.\u8C03\u5019\u7528\u795E) lines.push(`\u2502 \u251C\u8C03\u5019\u7528\u795E : ${en.\u8C03\u5019\u7528\u795E.join("\u3001")}`);
    const tl = en.\u8C03\u5019\u6761\u4F8B;
    if (tl?.\u6709\u6761\u4F8B) {
      lines.push(`\u2502 \u251C\u8C03\u5019\u6761\u4F8B\u3014${tl.\u683C}\xB7${tl.\u7EA7\u522B || "\u5F85\u6838"}\u3015 : \u547D\u4E2D ${tl.\u547D\u4E2D.length}/${tl.\u547D\u4E2D.length + tl.\u672A\u547D\u4E2D} \u6761  \u4E0A${tl.\u6863\u4F4D\u8BA1.\u4E0A} \u4E2D${tl.\u6863\u4F4D\u8BA1.\u4E2D} \u4E0B${tl.\u6863\u4F4D\u8BA1.\u4E0B} \u5FCC${tl.\u6863\u4F4D\u8BA1.\u5FCC}`);
      if (tl.\u547D\u4E2D.length === 0) lines.push("\u2502 \u2502 \u251C(\u672C\u76D8\u672A\u547D\u4E2D\u4EFB\u4F55\u6761\u4F8B \u2014 \u89E3\u8BFB\u5C42\u4E0D\u5F97\u5F15\u7528\u4EFB\u4F55\u6761\u4F8B\u540D)");
      for (const h of tl.\u547D\u4E2D) {
        lines.push(`\u2502 \u2502 \u251C[${h.\u6863}] ${h.\u663E\u793A\u540D} : ${h.\u5219}`);
        const \u7EC6 = h.\u7EC6\u5316\u4E8E ? `  (\u7EC6\u5316\u4E8E ${h.\u7EC6\u5316\u4E8E}${h.\u5173\u7CFB === "\u4E92\u65A5" ? "\xB7\u4E92\u65A5:\u662F\u6BCD\u6761\u7684\u4F8B\u5916,\u6BCD\u6761\u6B64\u65F6\u672A\u547D\u4E2D" : h.\u5173\u7CFB === "\u5B50\u96C6" ? "\xB7\u5B50\u96C6:\u4E0E\u6BCD\u6761\u8BB2\u540C\u4E00\u4EF6\u4E8B,\u52FF\u91CD\u590D\u8BA1" : ""})` : "";
        lines.push(`\u2502 \u2502 \u2502 \u251C\u82E5 : ${h.\u82E5}${\u7EC6}`);
        if (h.\u8574\u542B?.length) lines.push(`\u2502 \u2502 \u2502 \u251C\u8574\u542B : \u672C\u6761\u547D\u4E2D\u5219\u5FC5\u540C\u65F6\u547D\u4E2D ${h.\u8574\u542B.join("\u3001")} \u2014 \u540C\u4E00\u4EF6\u4E8B,\u6863\u4F4D\u8BA1\u5DF2\u5404\u8BA1\u4E00\u6B21,\u53D9\u8FF0\u52FF\u91CD\u590D`);
        if (h.\u610F\u8C61) lines.push(`\u2502 \u2502 \u2502 \u251C\u610F\u8C61\u7D20\u6750 : ${h.\u610F\u8C61}   \u26A0\u6982\u5FF5\u7EA7\u7D20\u6750,\u975E\u53E5\u5F0F\u6A21\u677F;\u987B\u7ED3\u5408\u672C\u76D8\u683C\u5C40/\u5341\u795E/\u5927\u8FD0\u8BED\u5883\u91CD\u5199`);
        if (h.\u5224\u5B9A\u5907\u6CE8) lines.push(`\u2502 \u2502 \u2502 \u251C\u5224\u5B9A\u5907\u6CE8 : ${h.\u5224\u5B9A\u5907\u6CE8}`);
        if (h.\u4E24\u7CFB\u5206\u6B67) lines.push(`\u2502 \u2502 \u2502 \u251C\u2696\u4E24\u7CFB\u5206\u6B67 : ${h.\u4E24\u7CFB\u5206\u6B67}`);
        lines.push(`\u2502 \u2502 \u2502 \u2514id : ${h.id}`);
      }
      for (const b2 of tl.\u75C5 || []) {
        if (b2.\u5728\u76D8) lines.push(`\u2502 \u2502 \u251C\u75C5\u3014\u5178\u7C4D\u660E\u6307\u3015: ${b2.\u5B57}${b2.\u900F ? "(\u900F\u5E72)" : "(\u85CF\u652F)"} \u2014 ${b2.\u4F9D\u636E}`);
      }
      if (tl.\u4E24\u7CFB\u5206\u6B67?.length) for (const dv of tl.\u4E24\u7CFB\u5206\u6B67) lines.push(`\u2502 \u2502 \u251C\u2696\u672C\u683C\u4E24\u7CFB\u5206\u6B67 : ${dv}`);
      lines.push(`\u2502 \u2502 \u2514\u6863\u4F4D\u53E3\u5F84 : \u4E0A/\u4E2D/\u4E0B/\u5FCC\u662F\u5178\u7C4D\u7684\u5224\u65AD,\u4E0D\u662F\u5B9E\u8BC1;\u89E3\u8BFB\u987B\u8F6C\u5199\u4E3A\u503E\u5411\u6027\u8868\u8FF0,\u4E0D\u5F97\u5199\u6210\u5BBF\u547D\u65AD\u8BED`);
    } else if (tl) {
      lines.push(`\u2502 \u251C\u8C03\u5019\u6761\u4F8B\u3014${tl.\u683C}\u3015 : \u8BE5\u683C\u5C1A\u672A\u5438\u6536(\u9020\u5316\u5143\u94A5\u5438\u6536\u5DE5\u7A0B\u5206\u6279\u8FDB\u884C,\u89C1 docs/\u5DE5\u5355-v3.11) \u2014 \u89E3\u8BFB\u5C42\u4E0D\u5F97\u51ED\u7A7A\u5F15\u7528\u6761\u4F8B\u540D`);
    }
    if (en.\u4E94\u884C\u65FA\u76F8) {
      const ws5 = en.\u4E94\u884C\u65FA\u76F8;
      lines.push(`\u2502 \u251C\u4E94\u884C\u65FA\u76F8 : \u6728${ws5.\u6728} \u706B${ws5.\u706B} \u571F${ws5.\u571F} \u91D1${ws5.\u91D1} \u6C34${ws5.\u6C34}`);
    }
    if (en.\u4E94\u884C\u7EDF\u8BA1) {
      const s = en.\u4E94\u884C\u7EDF\u8BA1.surface || en.\u4E94\u884C\u7EDF\u8BA1;
      const w = en.\u4E94\u884C\u7EDF\u8BA1.withCangGan;
      if (s) lines.push(`\u2502 \u251C\u4E94\u884C\u7EDF\u8BA1(surface) : \u6728${s.\u6728 || 0} \u706B${s.\u706B || 0} \u571F${s.\u571F || 0} \u91D1${s.\u91D1 || 0} \u6C34${s.\u6C34 || 0}`);
      const f1 = (x) => +(+x || 0).toFixed(1);
      if (w) lines.push(`\u2502 \u251C\u4E94\u884C\u7EDF\u8BA1(\u542B\u85CF\u5E72) : \u6728${f1(w.\u6728)} \u706B${f1(w.\u706B)} \u571F${f1(w.\u571F)} \u91D1${f1(w.\u91D1)} \u6C34${f1(w.\u6C34)}`);
    }
    const gr = en.\u5929\u5E72\u5173\u7CFB;
    if (gr && Array.isArray(gr) && gr.length > 0) {
      lines.push("\u2502 \u251C\u5929\u5E72\u5173\u7CFB");
      gr.forEach((r, i) => {
        const last = i === gr.length - 1;
        const pair = (r.gans || []).join("");
        const pillars = (r.pillars || []).join("-");
        lines.push(`\u2502 \u2502 ${last ? "\u2514" : "\u251C"}${r.type} : ${pair}  (${pillars}\u67F1)`);
      });
    }
    const zr = en.\u5730\u652F\u5173\u7CFB;
    if (zr && Array.isArray(zr) && zr.length > 0) {
      lines.push("\u2502 \u251C\u5730\u652F\u5173\u7CFB");
      zr.forEach((r, i) => {
        const last = i === zr.length - 1;
        const pair = (r.zhi || []).join("");
        const pillars = (r.pillars || []).join("-");
        const extra = r.detail ? `  ${r.detail}` : "";
        lines.push(`\u2502 \u2502 ${last ? "\u2514" : "\u251C"}${r.type} : ${pair}  (${pillars}\u67F1)${extra}`);
      });
    }
    const zp = en.\u6574\u67F1;
    if (zp && Array.isArray(zp) && zp.length > 0) {
      lines.push("\u2502 \u251C\u6574\u67F1\u5224\u5B9A");
      zp.forEach((p, i) => {
        const last = i === zp.length - 1;
        lines.push(`\u2502 \u2502 ${last ? "\u2514" : "\u251C"}${p.pillar}\u67F1 ${p.gan}${p.zhi} : ${p.verdict}`);
      });
    }
    const ix = en.\u4F5C\u7528\u5173\u7CFB;
    const fmtItems = (items, prefix) => {
      items.forEach((r, i) => {
        const last = i === items.length - 1;
        const mem = (r.members || []).join("");
        const pil = (r.pillars || []).join("-");
        const divg = r.divergence ? `  \u2696\u5206\u6B67:${r.divergence}` : "";
        const tw = r.\u5F15\u7206\u7A97\u53E3 ? `  \u23F3\u5F15\u7206\u7A97\u53E3[${r.\u5F15\u7206\u7A97\u53E3.\u65B9\u5F0F}\xB7\u5F85${(r.\u5F15\u7206\u7A97\u53E3.\u5F85 || []).join("/")}]:${(r.\u5F15\u7206\u7A97\u53E3.\u5E94\u671F || []).map((a) => (a.\u8F7D\u4F53 || "").startsWith("\u6D41\u5E74") ? `${a.\u5E74}${(a.\u8F7D\u4F53 || "").slice(2)}` : a.\u8F7D\u4F53).join("\u3001") || "\u68C0\u7D22\u7A97\u53E3\u5185\u65E0\u5E94\u671F"}` : "";
        lines.push(`${prefix}${last ? "\u2514" : "\u251C"}${r.type} ${mem}(${pil}\u67F1\xB7${r.distance}) \u3010${r.status}\u3011 ${r.cause}${divg}${tw}`);
      });
    };
    if (ix && Array.isArray(ix.items) && ix.items.length > 0) {
      lines.push(`\u2502 \u251C\u4F5C\u7528\u5173\u7CFB(\u5408\u51B2\u5211\u5BB3\u88C1\u51B3\xB7${ix.policy || "\u901A\u5219"})`);
      fmtItems(ix.items, "\u2502 \u2502 ");
      if (ix.lineage && Array.isArray(ix.lineage.items) && ix.lineage.items.length > 0) {
        lines.push(`\u2502 \u251C\u4F5C\u7528\u5173\u7CFB\xB7\u6D41\u6D3E\u89C6\u56FE(${ix.lineage.name}) \u2014 ${ix.lineage.policy_note || ""}`);
        fmtItems(ix.lineage.items, "\u2502 \u2502 ");
      }
    }
    const ys = en.\u8FD0\u5C81\u5F15\u52A8;
    if (ys) {
      lines.push("\u2502 \u2514\u8FD0\u5C81\u5F15\u52A8(\u5927\u8FD0/\u6D41\u5E74\xD7\u539F\u5C40+\u5C81\u8FD0\u4E92\u52A8\xB7\u4E2D\u7ACB\u68C0\u6D4B)");
      const sn = ys.\u987A\u9006;
      const tag = (o) => o ? `[${o.\u65B9\u5411}/${o.\u632F\u5E45}\xB7${o.\u5408\u6210}${o.\u4E8B\u4EF6?.length ? "\xB7" + o.\u4E8B\u4EF6.join("/") : ""}]` : "";
      if (sn) {
        lines.push(`\u2502   \u251C\u987A\u9006\u53CC\u8F74\u3014\u5E55\u540E\u65BD\u5DE5\u56FE\u3015: ${sn.\u8BF4\u660E}`);
        if (Array.isArray(sn.\u5927\u8FD0) && sn.\u5927\u8FD0.length)
          lines.push(`\u2502   \u251C\u5927\u8FD0\u65B9\u5411\u603B\u89C8: ${sn.\u5927\u8FD0.map((x) => `${x.\u8D77\u6B62\u5E74} ${x.\u5E72\u652F} ${x.\u65B9\u5411}/${x.\u632F\u5E45}(\u7528${x.\u53D1\u7528 > 0 ? "+" : ""}${x.\u53D1\u7528}/\u4F53${x.\u62A4\u4F53})`).join(" | ")}`);
        if (Array.isArray(sn.\u6D41\u5E74) && sn.\u6D41\u5E74.length)
          lines.push(`\u2502   \u251C\u6D41\u5E74\u65B9\u5411\u603B\u89C8: ${sn.\u6D41\u5E74.map((x) => `${x.\u5E74}${x.\u5E72\u652F} ${x.\u65B9\u5411}/${x.\u632F\u5E45}(\u7528${x.\u53D1\u7528 > 0 ? "+" : ""}${x.\u53D1\u7528}/\u4F53${x.\u62A4\u4F53})`).join(" | ")}`);
      }
      if (Array.isArray(ys.\u5EFA\u8BAE\u8282\u70B9) && ys.\u5EFA\u8BAE\u8282\u70B9.length) {
        lines.push(`\u2502   \u251C\u5EFA\u8BAE\u8282\u70B9(timeline \u9009\u70B9\u767D\u540D\u5355\xB7\u91CD\u7EA7\u5FC5\u9009): ${ys.\u5EFA\u8BAE\u8282\u70B9.map((n) => `${n.\u5E74}(${n.\u5C81}\u5C81)${n.\u8F7D\u4F53}\xB7${n.\u6807\u8BB0}[${n.\u6743\u91CD}]`).join(" / ")}`);
      }
      (ys.\u5927\u8FD0\u5F15\u52A8 || []).forEach((d) => {
        lines.push(`\u2502   \u251C\u5927\u8FD0${d.\u6B65} ${d.\u5E72\u652F} ${d.\u5E74\u9F84} ${tag(d.\u987A\u9006)}`);
        d.hits.forEach((h, i) => {
          const last = i === d.hits.length - 1;
          lines.push(`\u2502   \u2502 ${last ? "\u2514" : "\u251C"}[${h.type}] ${h.desc}`);
        });
      });
      const cd = ys.\u5F53\u524D\u5927\u8FD0\u6D41\u5E74;
      if (cd && cd.\u6D41\u5E74 && cd.\u6D41\u5E74.length > 0) {
        lines.push(`\u2502   \u2514\u5F53\u524D\u5927\u8FD0 ${cd.\u5927\u8FD0} \u6D41\u5E74\u5F15\u52A8`);
        cd.\u6D41\u5E74.forEach((y, yi) => {
          const lastY = yi === cd.\u6D41\u5E74.length - 1;
          const all = [...y.vs\u539F\u5C40 || [], ...y.vs\u5927\u8FD0 || []];
          lines.push(`\u2502     ${lastY ? "\u2514" : "\u251C"}${y.\u5E74} ${y.\u5E72\u652F} ${tag(y.\u987A\u9006)} : ${all.map((h) => `[${h.type}]${h.desc.replace(/^流年/, "")}`).join(" ; ")}`);
        });
      }
    }
    const ly = en.\u6D41\u6708\u5F15\u52A8;
    if (ly && Array.isArray(ly.\u6708)) {
      lines.push(`\u251C\u6D41\u6708\u5F15\u52A8 (${ly.\u5E74} ${ly.\u5E74\u5E72\u652F}\u5E74 \xB7 \u6309\u8282\u6C14\u5206\u6708 \xB7 \u8BE5\u5E74\u5927\u8FD0 ${ly.\u5927\u8FD0})`);
      lines.push(`\u2502 \u251C\u8BF4\u660E : ${ly.\u8BF4\u660E}`);
      ly.\u6708.forEach((m, i) => {
        const last = i === ly.\u6708.length - 1;
        const all = [...m.vs\u539F\u5C40 || [], ...m.vs\u5927\u8FD0 || []];
        const hitStr = all.length ? all.map((h) => `[${h.type}]${h.desc.replace(/^流月/, "")}`).join(" ; ") : "\u65E0\u663E\u8457\u5F15\u52A8";
        const sn = m.\u987A\u9006;
        const snStr = sn ? ` [${sn.\u65B9\u5411}/${sn.\u632F\u5E45}\xB7${sn.\u5408\u6210}${sn.\u4E8B\u4EF6?.length ? "\xB7" + sn.\u4E8B\u4EF6.join("/") : ""}]` : "";
        lines.push(`\u2502 ${last ? "\u2514" : "\u251C"}${String(m.\u5E8F).padStart(2, "0")} ${m.\u5E72\u652F}\u6708(${m.\u8282\u6C14}\u8D77 ${m.\u516C\u5386\u8D77}~${m.\u516C\u5386\u6B62} \u7EA6${m.\u7EA6\u519C\u5386\u6708})${snStr} : ${hitStr}`);
      });
    }
    const cy = en.\u591A\u5E74\u5BF9\u6BD4;
    if (cy && Array.isArray(cy.\u5E74)) {
      lines.push(`\u251C\u591A\u5E74\u5BF9\u6BD4 (${cy.\u5E74.map((e) => e.\u5E74).join("/")} \xB7 \u5F15\u52A8+\u559C\u5FCC\u8BC4\u5206)`);
      lines.push(`\u2502 \u251C\u8BF4\u660E : ${cy.\u8BF4\u660E}`);
      cy.\u5E74.forEach((e, i) => {
        const last = i === cy.\u5E74.length - 1;
        const all = [...e.vs\u539F\u5C40 || [], ...e.vs\u5927\u8FD0 || []];
        const hitStr = all.length ? all.map((h) => `[${h.type}]${h.desc.replace(/^流年/, "")}`).join(" ; ") : "\u65E0\u663E\u8457\u5F15\u52A8";
        const heavy = (e.\u91CD\u7EA7\u5F15\u52A8 || []).length ? `  \u26A0\u91CD\u7EA7:${e.\u91CD\u7EA7\u5F15\u52A8.join("+")}` : "";
        lines.push(`\u2502 ${last ? "\u2514" : "\u251C"}${e.\u5E74} ${e.\u5E72\u652F} \u5927\u8FD0${e.\u5927\u8FD0} \u559C\u5FCC[\u5E72${e.\u559C\u5FCC\u5BF9\u7167.\u5E72} \u652F${e.\u559C\u5FCC\u5BF9\u7167.\u652F} \u8BC4\u5206${e.\u559C\u5FCC\u5BF9\u7167.\u8BC4\u5206 >= 0 ? "+" : ""}${e.\u559C\u5FCC\u5BF9\u7167.\u8BC4\u5206}]${heavy} : ${hitStr}`);
      });
    }
  }
  lines.push("");
  lines.push("\u2514[\u5907\u6CE8: \u672C\u76D8\u7531 bazi-ziwei skill \u7B97\u6CD5\u5C42\u751F\u6210 \u2014 Yiqi core + enrichBazi \u8865\u5C42]");
  return lines;
}
function main() {
  const args = parseArgs();
  if (!args.input) {
    console.error("Usage: npx tsx dump-text.ts --input=chart.json [--output=chart.txt]");
    process.exit(1);
  }
  const chart = JSON.parse(fs.readFileSync(args.input, "utf-8"));
  const bi = chart.bazi.birthInfo || chart.ziwei.birthInfo;
  const lines = [];
  lines.push(...dumpShichenBoundary(chart.bazi));
  lines.push(...dumpZiwei(chart.ziwei, bi));
  lines.push(...dumpBazi(chart.bazi, bi));
  const text = lines.join("\n");
  if (args.output) {
    fs.writeFileSync(args.output, text, "utf-8");
    console.error(`Text dump written to ${args.output}`);
  } else {
    process.stdout.write(text);
  }
}
main();

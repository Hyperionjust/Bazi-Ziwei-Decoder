var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// check-analysis.ts
var check_analysis_exports = {};
__export(check_analysis_exports, {
  checkAnalysis: () => checkAnalysis
});
module.exports = __toCommonJS(check_analysis_exports);
var fs = __toESM(require("fs"));
var strip = (s) => String(s || "").replace(/<[^>]+>/g, "");
var sentences = (s) => strip(s).split(/[。！？!?]/).map((x) => x.trim()).filter(Boolean);
function checkAnalysis(a, chart, currentYear) {
  const R = {};
  const put = (k, bad, warn = []) => {
    R[k] = { status: bad.length ? "FAIL" : warn.length ? "WARN" : "PASS", reasons: [...bad, ...warn] };
  };
  {
    const bad = [];
    const t = strip(a?.meta?.archetype_name || "");
    if (!/^[一-龥]{7}$/.test(t) && !/^[一-龥]{4}[·•・][一-龥]{4}$/.test(t))
      bad.push(`\u5224\u8BCD\u987B7\u5B57\u62164+4\u5BF9\u4ED7,\u5F97\u5230\u300C${t}\u300D`);
    if (/[格局]{2}|身弱|身强|七杀格|正官格|偏财格/.test(t)) bad.push("\u5224\u8BCD\u5806\u683C\u5C40\u672F\u8BED");
    put("meta.archetype_name", bad);
  }
  const FORBID_ALL = ["tier", "needs_review", "lineage_weights", "\u547D\u4E3B", "\u8D77\u6CD5\u5F85\u6838"];
  const FORBID_SHUNNI = ["\u5927\u51F6", "\u707E\u5E74", "\u51F6\u5E74", "\u51F6\u661F"];
  const walk = (obj, path, fn) => {
    if (typeof obj === "string") fn(path, obj);
    else if (Array.isArray(obj)) obj.forEach((v, i) => walk(v, `${path}[${i}]`, fn));
    else if (obj && typeof obj === "object") for (const k of Object.keys(obj)) walk(obj[k], path ? `${path}.${k}` : k, fn);
  };
  {
    const bad = [];
    walk(a, "", (p, v) => {
      for (const w of FORBID_ALL) if (v.includes(w)) bad.push(`${p} \u542B\u5185\u90E8\u5B57\u6BB5/\u64AD\u62A5\u8154\u300C${w}\u300D`);
      if (/^(hechong|yunsui|shensha|timeline)/.test(p)) {
        for (const w of FORBID_SHUNNI) if (v.includes(w)) bad.push(`${p} \u542B\u7EDD\u5BF9\u65AD\u8BED\u300C${w}\u300D(\u5E94\u7528\u987A\u98CE/\u9006\u98CE)`);
      }
    });
    put("_\u5168\u5C40\u7981\u8BCD", bad);
  }
  {
    const bad1 = [];
    const bad2 = [];
    const m = a?.tg?.mech_html, p = a?.tg?.plain_html;
    if (m == null) bad1.push("\u7F3A\u5B57\u6BB5");
    else if (sentences(m).length !== 1) bad1.push(`\u4E0A\u53E5\u5E94\u6070\u4E00\u53E5,\u5B9E\u9645${sentences(m).length}\u53E5`);
    if (p == null) bad2.push("\u7F3A\u5B57\u6BB5");
    else {
      if (sentences(p).length !== 1) bad2.push(`\u4E0B\u53E5\u5E94\u6070\u4E00\u53E5,\u5B9E\u9645${sentences(p).length}\u53E5`);
      if (!/^(所以你|意味着你)/.test(strip(p).trim())) bad2.push("\u4E0B\u53E5\u987B\u4EE5\u300C\u6240\u4EE5\u4F60/\u610F\u5473\u7740\u4F60\u300D\u5F00\u5934");
    }
    put("tg.mech_html", bad1);
    put("tg.plain_html", bad2);
  }
  for (const [k, path] of [["dm.desc_html", a?.dm?.desc_html], ["geju.sub_html", a?.geju?.sub_html], ["wuxing.note_html", a?.wuxing?.note_html], ["yongshen.note_html", a?.yongshen?.note_html]]) {
    if (path == null) {
      put(k, [`\u7F3A\u5B57\u6BB5`]);
      continue;
    }
    const bad = [];
    const ss = sentences(path);
    if (k === "dm.desc_html") {
      const t = strip(path);
      for (const m of ["\u7279\u6027\u662F", "\u610F\u5473\u7740\u4F60", "\u6700\u5F3A\u7684\u80FD\u529B", "\u4F46"]) if (!t.includes(m)) bad.push(`\u65E5\u4E3B\u56FA\u5B9A\u53E5\u5F0F\u7F3A\u300C${m}\u300D`);
    } else {
      if (ss.length !== 2) bad.push(`\u5E94\u6070\u4E24\u53E5,\u5B9E\u9645 ${ss.length} \u53E5`);
      if (ss[1] && !/^(所以你|意味着你)/.test(ss[1])) bad.push("\u7B2C\u4E8C\u53E5\u987B\u4EE5\u300C\u6240\u4EE5\u4F60/\u610F\u5473\u7740\u4F60\u300D\u5F00\u5934");
    }
    put(k, bad);
  }
  {
    const que = chart?.bazi?.enrichment?.\u7528\u795E\u5EFA\u8BAE?.\u51FA\u53E3?.\u7F3A\u8865\u8BF4\u660E || "";
    if (que && a?.wuxing?.note_html) {
      const missElems = (que.match(/缺([木火土金水])/g) || []).map((x) => x[1]);
      const covered = missElems.every((e) => strip(a.wuxing.note_html).includes(e));
      if (!covered) R["wuxing.note_html"] = { status: "FAIL", reasons: [...R["wuxing.note_html"]?.reasons || [], "\u51FA\u53E3\u6709\u3014\u7F3A\u8865\u8BF4\u660E\u3015\u4F46\u672A\u8F6C\u8FF0\u6240\u7F3A\u4E94\u884C"] };
    }
  }
  for (const k of ["personality_html", "career_html", "marriage_html", "health_html"]) {
    const v = a?.interp?.[k];
    if (v == null) {
      put(`interp.${k}`, ["\u7F3A\u5B57\u6BB5"]);
      continue;
    }
    const bad = [];
    const ss = sentences(v);
    const len = strip(v).length;
    if (ss.length < 6 || len < 160) bad.push(`\u8BE6\u5199\u4E0D\u8DB3(\u53E5\u6570${ss.length}/\u5B57\u6570${len},\u8981\u6C42\u22656\u53E5\u2265160\u5B57)`);
    const g = (v.match(/hl-good/g) || []).length, r = (v.match(/class="hl"/g) || []).length;
    if (g + r < 2) bad.push(`\u7740\u8272\u4E0D\u8DB3(\u7EFF${g}\u7EA2${r},\u7279\u8D28\u77ED\u8BED\u5E94\u6210\u6BB5\u7740\u8272)`);
    put(`interp.${k}`, bad);
  }
  {
    const v = a?.interp?.marriage_html || "";
    const bad = [];
    const m = v.match(/更可能是一个([^<>]{4,40})的(男生|女生)/);
    if (!m) bad.push("\u7F3A\u6B63\u7F18\u753B\u50CF\u56FA\u5B9A\u53E5\u5F0F\u300C\u66F4\u53EF\u80FD\u662F\u4E00\u4E2A\u2026\u7684\u7537\u751F/\u5973\u751F\u300D");
    else {
      if (!new RegExp("hl-good[^>]*>[^<]*\u66F4\u53EF\u80FD\u662F\u4E00\u4E2A").test(v) && !/更可能是一个[^<]*<\/span>/.test(v) && !/<span class="hl-good">[^<]*更可能是一个/.test(v))
        bad.push("\u753B\u50CF\u6574\u53E5\u672A\u52A0\u7C97\u6807\u7EFF");
      if (/(相仿或|或年长|或年轻|或同龄)/.test(m[1])) bad.push("\u753B\u50CF\u5E74\u9F84\u9A91\u5899(\u987B\u62E9\u4E00\u6216\u660E\u786E\u6539\u7528\u6027\u683C\u8F74)");
    }
    if (bad.length) R["interp.marriage_html"] = { status: "FAIL", reasons: [...(R["interp.marriage_html"]?.reasons || []).filter((x) => !bad.includes(x)), ...bad] };
  }
  for (const [k, v] of [["hechong.reading_html", a?.hechong?.reading_html], ["yunsui.reading_html", a?.yunsui?.reading_html], ["shensha.reading_html", a?.shensha?.reading_html]]) {
    if (v == null) {
      put(k, ["\u7F3A\u5B57\u6BB5"]);
      continue;
    }
    const bad = [];
    const warn = [];
    const n = sentences(v).length;
    if (n < 2 || n > 6) bad.push(`\u7CBE\u8BFB\u6BB5\u5E943~5\u53E5,\u5B9E\u9645${n}\u53E5`);
    if (k === "yunsui.reading_html") {
      const yrs = (strip(v).match(/(19|20)\d{2}/g) || []).map(Number);
      for (const y of yrs) if (y < currentYear - 1 || y > currentYear + 5) warn.push(`\u63D0\u53CA\u5E74\u4EFD${y}\u8D85\u51FA\u4ECA\u5E74\u8D775\u5E74\u7A97\u53E3`);
    }
    put(k, bad, warn);
  }
  {
    const zy = chart?.bazi?.enrichment?.\u6B63\u7F18\u503E\u5411;
    const v = String(a?.interp?.marriage_html || "");
    if (zy && v) {
      const said = [];
      if (/比你年长|年长/.test(strip(v))) said.push("\u5E74\u957F");
      if (/比你年轻|年轻/.test(strip(v))) said.push("\u5E74\u8F7B");
      if (/同龄/.test(strip(v))) said.push("\u540C\u9F84");
      const bad = [];
      if (said.length && !said.includes(zy.\u5E74\u9F84\u503E\u5411)) bad.push(`\u753B\u50CF\u5E74\u9F84\u8BCD(${said.join("/")})\u4E0E\u7B97\u6CD5\u5224\u5B9A(${zy.\u5E74\u9F84\u503E\u5411})\u77DB\u76FE`);
      if (!said.length && zy.\u7F6E\u4FE1 === "\u9AD8") bad.push(`\u5224\u5B9A\u7F6E\u4FE1\u9AD8(${zy.\u5E74\u9F84\u503E\u5411})\u4F46\u753B\u50CF\u672A\u7528\u5E74\u9F84\u8BCD`);
      if (bad.length) R["interp.marriage_html"] = { status: "FAIL", reasons: [...R["interp.marriage_html"]?.reasons || [], ...bad] };
    }
  }
  {
    const rare = chart?.bazi?.enrichment?.\u7F55\u8C61 || [];
    if (rare.length) {
      const names = rare.map((r) => String(r.\u540D || "").replace(/[(（].*$/, ""));
      const text = strip(String(a?.shensha?.reading_html || "")) + strip(String(a?.hechong?.reading_html || ""));
      const mentioned = names.some((n) => n && text.includes(n.slice(0, 3)));
      if (!mentioned) {
        for (const k of ["shensha.reading_html", "hechong.reading_html"]) {
          R[k] = { status: "FAIL", reasons: [...R[k]?.reasons || [], `\u76D8\u6709\u7F55\u8C61(${names.join("/")})\u4F46\u7CBE\u8BFB\u6BB5\u672A\u63D0\u53CA`] };
        }
      }
    }
  }
  {
    const bad = [];
    const tl = a?.timeline;
    const wl = new Set((chart?.bazi?.enrichment?.\u8FD0\u5C81\u5F15\u52A8?.\u5EFA\u8BAE\u8282\u70B9 || []).map((n) => n.\u5E74));
    if (!Array.isArray(tl) || tl.length !== 5) bad.push(`timeline \u5E94\u60705\u9879,\u5B9E\u9645${Array.isArray(tl) ? tl.length : 0}`);
    else if (wl.size) {
      for (const t of tl) if (!wl.has(+t.year)) bad.push(`\u8282\u70B9\u5E74\u4EFD${t.year}\u4E0D\u5728\u5EFA\u8BAE\u8282\u70B9\u767D\u540D\u5355`);
    }
    put("timeline", bad);
  }
  return R;
}
function main() {
  const args = {};
  for (const x of process.argv.slice(2)) {
    const m = x.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  }
  if (!args.analysis || !args.chart) {
    console.error("Usage: node check-analysis.js --analysis=analysis.json --chart=chart.json [--currentYear=YYYY]");
    process.exit(1);
  }
  let a;
  try {
    a = JSON.parse(fs.readFileSync(args.analysis, "utf-8"));
  } catch (e) {
    console.error(JSON.stringify({ _JSON\u5408\u6CD5\u6027: { status: "FAIL", reasons: [String(e.message)] } }));
    process.exit(1);
  }
  const chart = JSON.parse(fs.readFileSync(args.chart, "utf-8"));
  const cy = args.currentYear ? +args.currentYear : (/* @__PURE__ */ new Date()).getFullYear();
  const rep = checkAnalysis(a, chart, cy);
  const fails = Object.entries(rep).filter(([, r]) => r.status === "FAIL");
  console.log(JSON.stringify({ \u7ED3\u8BBA: fails.length ? `FAIL\xD7${fails.length}(\u9001\u56DE\u8BC4\u5BA1\u904D\u91CD\u751F)` : "ALL PASS", \u660E\u7EC6: rep }, null, 2));
  process.exit(fails.length ? 1 : 0);
}
if (require.main === module) main();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  checkAnalysis
});

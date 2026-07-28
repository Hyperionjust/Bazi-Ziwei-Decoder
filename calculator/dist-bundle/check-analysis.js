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
  checkAnalysis: () => checkAnalysis,
  checkLongform: () => checkLongform,
  checkMbti: () => checkMbti,
  checkZiwei: () => checkZiwei,
  checkZonghe: () => checkZonghe
});
module.exports = __toCommonJS(check_analysis_exports);
var fs = __toESM(require("fs"));
var strip = (s) => String(s || "").replace(/<[^>]+>/g, "");
var sentences = (s) => strip(s).split(/[。！？!?]/).map((x) => x.trim()).filter(Boolean);
var CONNECTOR_RE = /^(所以你|意味着你|这让你|落到你身上|这股劲让你|放到生活里)/;
var CONNECTOR_DESC = "\u6240\u4EE5\u4F60/\u610F\u5473\u7740\u4F60/\u8FD9\u8BA9\u4F60/\u843D\u5230\u4F60\u8EAB\u4E0A/\u8FD9\u80A1\u52B2\u8BA9\u4F60/\u653E\u5230\u751F\u6D3B\u91CC";
var CHILD_MARK = /(从小|小时候|打小|孩提|学生时代|少年时|童年)/;
var CHILD_ACT = /(习惯|牵头|攒局|张罗|带头|组织|分工|派活|主持|带队|发起|当班长|当过|干过|做过|拉着|老是|总能把|就爱管)/;
function childhoodViolations(text) {
  const out = [];
  for (const sent of String(text).replace(/<[^>]+>/g, "").split(/[。！？!?\n]/)) {
    if (CHILD_MARK.test(sent) && CHILD_ACT.test(sent)) out.push(sent.trim().slice(0, 40));
  }
  return out;
}
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
  const FORBID_FREQ = ["\u591A\u534A\u662F\u4F60", "\u4F60\u603B\u662F", "\u4F60\u6BCF\u6B21", "\u4F60\u4ECE\u4E0D", "\u4F60\u4E00\u5B9A\u4F1A", "\u7B2C\u4E00\u4E2A\u60F3\u5230\u4F60"];
  const FORBID_MECH = ["rubric", "\u7B97\u6CD5\u5C42", "\u6620\u5C04\u77E9\u9635", "\u51FA\u6587\u534F\u8BAE", "v3\u52A0\u5206", "v4\u52A0\u5206", "\u5FCC\u795E\u6298\u5411", "R1\u9A7F\u9A6C", "R2\u6587", "R3\u80CE\u5143", "\u8BC4\u5BA1\u904D", "\u4F53\u68C0\u5668", "\u6D3E\u7CFB\u4FA7\u91CD", "lineage"];
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
      for (const w of FORBID_FREQ) if (v.includes(w)) bad.push(`${p} \u542B\u884C\u4E3A\u9891\u7387\u65AD\u8A00\u300C${w}\u300D(\u80FD\u529B\u800C\u975E\u4E8B\u8FF9:\u6539\u5199\u4E3A\u80FD\u529B/\u7279\u8D28/\u6F5C\u529B\u53E5\u5F0F)`);
      for (const w of FORBID_MECH) if (v.includes(w)) bad.push(`${p} \u6CC4\u6F0F\u5E55\u540E\u673A\u5236\u8BCD\u300C${w}\u300D(\u5E55\u540E\u53F0\u524D\u5206\u79BB:\u7528\u6237\u53EA\u770B\u7ED3\u8BBA)`);
      for (const c of childhoodViolations(v)) bad.push(`${p} \u7AE5\u5E74\u884C\u4E3A\u65AD\u8A00\u300C${c}\u2026\u300D(\u7EC6\u5219:\u4ECE\u5C0F\u53EA\u80FD\u63A5\u6C14\u8D28\u4E0D\u80FD\u63A5\u884C\u4E3A,\u52A8\u4F5C\u53EF\u8BC1\u4F2A)`);
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
      if (!CONNECTOR_RE.test(strip(p).trim())) bad2.push(`\u4E0B\u53E5\u987B\u4EE5\u8FDE\u63A5\u8BCD\u5F00\u5934(${CONNECTOR_DESC})`);
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
      if (ss[1] && !CONNECTOR_RE.test(ss[1])) bad.push(`\u7B2C\u4E8C\u53E5\u987B\u4EE5\u8FDE\u63A5\u8BCD\u5F00\u5934(${CONNECTOR_DESC})`);
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
    const ANCHOR_BY_GONGZUO = {
      \u6B63\u5370: "\u4F60\u9002\u5408\u7684\u53E6\u4E00\u534A",
      \u504F\u5370: "\u4F60\u9002\u5408\u7684\u53E6\u4E00\u534A",
      \u6B63\u5B98: "\u80FD\u63A5\u4F4F\u4F60\u7684",
      \u4E03\u6740: "\u80FD\u63A5\u4F4F\u4F60\u7684",
      \u6B63\u8D22: "\u8BA9\u4F60\u773C\u775B\u4E00\u4EAE\u53C8\u7559\u5F97\u4F4F\u7684",
      \u504F\u8D22: "\u8BA9\u4F60\u773C\u775B\u4E00\u4EAE\u53C8\u7559\u5F97\u4F4F\u7684",
      \u98DF\u795E: "\u4E0E\u4F60\u6700\u540C\u9891\u7684",
      \u4F24\u5B98: "\u4E0E\u4F60\u6700\u540C\u9891\u7684",
      \u6BD4\u80A9: "\u4E0E\u4F60\u6700\u540C\u9891\u7684",
      \u52AB\u8D22: "\u4E0E\u4F60\u6700\u540C\u9891\u7684"
    };
    const v = a?.interp?.marriage_html || "";
    const bad = [];
    const mt = strip(v).match(/(你适合的另一半|能接住你的|让你眼睛一亮又留得住的|与你最同频的)[^。！？]{0,12}更可能是一个([^。！？]{4,40})的(男生|女生)/);
    if (!mt) bad.push("\u7F3A\u6B63\u7F18\u753B\u50CF\u53E5\u5F0F(\u56DB\u578B\u951A\u5934\u4E4B\u4E00 + \u300C\u66F4\u53EF\u80FD\u662F\u4E00\u4E2A{\u7279\u8D28\xD73}\u7684\u7537\u751F/\u5973\u751F\u300D)");
    else {
      const gz = chart?.bazi?.enrichment?.\u6B63\u7F18\u503E\u5411?.\u5BAB\u5750;
      const expect = gz ? ANCHOR_BY_GONGZUO[String(gz).replace(/[^一-龥]/g, "")] : null;
      if (expect && mt[1] !== expect) bad.push(`\u753B\u50CF\u951A\u5934\u300C${mt[1]}\u300D\u4E0E\u5BAB\u5750(${gz})\u5E94\u9009\u578B\u300C${expect}\u300D\u4E0D\u7B26(\u5206\u578B\u7531\u7B97\u6CD5\u5BAB\u5750\u786E\u5B9A,\u4E0D\u5F97\u6DF7\u7528)`);
      if (!new RegExp("hl-good[^>]*>[^<]*\u66F4\u53EF\u80FD\u662F\u4E00\u4E2A").test(v) && !/更可能是一个[^<]*<\/span>/.test(v) && !/<span class="hl-good">[^<]*更可能是一个/.test(v))
        bad.push("\u753B\u50CF\u6574\u53E5\u672A\u52A0\u7C97\u6807\u7EFF");
      if (/(相仿或|或年长|或年轻|或同龄)/.test(mt[2])) bad.push("\u753B\u50CF\u5E74\u9F84\u9A91\u5899(\u987B\u62E9\u4E00\u6216\u660E\u786E\u6539\u7528\u6027\u683C\u8F74)");
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
    if (n < 3 || n > 7) bad.push(`\u7CBE\u8BFB\u6BB5\u5E943~7\u53E5,\u5B9E\u9645${n}\u53E5`);
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
var DM_IMG = {
  \u7532: ["\u5927\u6811", "\u53C2\u5929", "\u4E54\u6728"],
  \u4E59: ["\u82B1\u8349", "\u85E4\u8513", "\u85E4", "\u82B1\u6728"],
  \u4E19: ["\u592A\u9633", "\u9A84\u9633", "\u65E5\u5149"],
  \u4E01: ["\u70DB", "\u706F\u706B", "\u661F\u5149"],
  \u620A: ["\u9AD8\u5C71", "\u5C71"],
  \u5DF1: ["\u7530\u56ED", "\u7530", "\u6C83\u571F", "\u56ED\u571F"],
  \u5E9A: ["\u5200", "\u5251", "\u65A7\u94BA"],
  \u8F9B: ["\u73E0\u7389", "\u7389", "\u73E0", "\u91D1\u9970"],
  \u58EC: ["\u6C5F\u6CB3", "\u6C5F", "\u6CB3", "\u5927\u6C34", "\u5954\u6D41"],
  \u7678: ["\u96E8\u9732", "\u96E8", "\u9732", "\u7518\u9716"]
};
function checkMbti(a, chart) {
  const R = {};
  const bw = chart?.bazi?.enrichment?.\u516B\u7EF4\u7ED3\u6784 || {};
  const allowed = new Set([bw.\u6700\u50CF\u7C7B\u578B, bw.\u5907\u9009\u7C7B\u578B, String(a?.meta?.tested_mbti || "").toUpperCase()].filter(Boolean));
  const bad0 = [];
  const walk = (obj, path, fn) => {
    if (typeof obj === "string") fn(path, obj);
    else if (obj && typeof obj === "object") for (const k of Object.keys(obj)) walk(obj[k], path ? path + "." + k : k, fn);
  };
  walk(a, "", (p, v) => {
    for (const w of ["tier", "needs_review", "\u547D\u4E3B\u662F", "\u5927\u51F6", "\u707E\u5E74"]) if (v.includes(w)) bad0.push(`${p} \u542B\u300C${w}\u300D`);
    for (const w of ["\u591A\u534A\u662F\u4F60", "\u4F60\u603B\u662F", "\u4F60\u6BCF\u6B21", "\u4F60\u4ECE\u4E0D", "\u4F60\u4E00\u5B9A\u4F1A", "\u7B2C\u4E00\u4E2A\u60F3\u5230\u4F60"]) if (v.includes(w)) bad0.push(`${p} \u542B\u884C\u4E3A\u9891\u7387\u65AD\u8A00\u300C${w}\u300D`);
    for (const w of ["rubric", "\u7B97\u6CD5\u5C42", "\u6620\u5C04\u77E9\u9635", "\u51FA\u6587\u534F\u8BAE", "v3\u52A0\u5206", "v4\u52A0\u5206", "\u5FCC\u795E\u6298\u5411", "\u8BC4\u5BA1\u904D", "\u4F53\u68C0\u5668", "\u6D3E\u7CFB\u4FA7\u91CD"]) if (v.includes(w)) bad0.push(`${p} \u6CC4\u6F0F\u5E55\u540E\u673A\u5236\u8BCD\u300C${w}\u300D`);
    for (const c of childhoodViolations(v)) bad0.push(`${p} \u7AE5\u5E74\u884C\u4E3A\u65AD\u8A00\u300C${c}\u2026\u300D(\u4ECE\u5C0F\u53EA\u80FD\u63A5\u6C14\u8D28\u4E0D\u80FD\u63A5\u884C\u4E3A)`);
    if (/你是\s*[EI][NS][TF][JP]\b/.test(v)) bad0.push(`${p} \u51FA\u73B0\u300C\u4F60\u662FX\u578B\u300D\u65AD\u8A00(\u987B\u7528\u6700\u50CF/\u5E95\u76D8)`);
    for (const m of v.match(/\b[EI][NS][TF][JP]\b/g) || []) if (!allowed.has(m)) bad0.push(`${p} \u51FA\u73B0\u76D8\u5916\u7C7B\u578B ${m}(\u5141\u8BB8:${[...allowed].join("/")})`);
  });
  for (const k of ["overview_html", "sanguan_html", "friends_html", "love_html", "work_html", "family_html", "hobbies_html"]) {
    const v = a?.[k];
    const bad = [];
    if (v == null || v === "-") {
      R[k] = { status: "FAIL", reasons: ["\u7F3A\u5B57\u6BB5"] };
      continue;
    }
    const n = sentences(v).length;
    if (n < 4) bad.push(`\u5E94\u22654\u53E5,\u5B9E\u9645${n}`);
    if (!/hl-good|class="hl"/.test(v)) bad.push("\u65E0\u7740\u8272");
    R[k] = { status: bad.length ? "FAIL" : "PASS", reasons: bad };
  }
  const tested = String(a?.meta?.tested_mbti || "").trim();
  {
    const dmGan = chart?.bazi?.siZhu?.day?.gan;
    const imgs = dmGan && DM_IMG[dmGan] || [];
    const hasImg = (txt) => imgs.some((k) => String(txt || "").includes(k));
    if (imgs.length) {
      if (a?.mbti_tagline && !hasImg(a.mbti_tagline)) bad0.push(`mbti_tagline \u672A\u843D\u65E5\u4E3B\u610F\u8C61(\u610F\u8C61\u5AC1\u63A5:${dmGan}=${imgs[0]}\u2026)`);
      if (tested && a?.diff_verdict && !hasImg(a.diff_verdict) && a?.diff_html && !hasImg(a.diff_html)) bad0.push(`diff \u5224\u8BCD\u4E0E\u6B63\u6587\u5747\u672A\u51FA\u73B0\u65E5\u4E3B\u610F\u8C61(\u610F\u8C61\u5AC1\u63A5\u94C1\u5F8B:${dmGan}=${imgs[0]}\u2026)`);
    }
    const dom = chart?.bazi?.enrichment?.\u516B\u7EF4\u7ED3\u6784?.\u4E3B\u5BFC;
    const domDesc = { Te: "\u5916\u5411\u601D\u7EF4", Ti: "\u5185\u5411\u601D\u7EF4", Fe: "\u5916\u5411\u60C5\u611F", Fi: "\u5185\u5411\u60C5\u611F", Se: "\u5916\u5411\u611F\u89C9", Si: "\u5185\u5411\u611F\u89C9", Ne: "\u5916\u5411\u76F4\u89C9", Ni: "\u6536\u655B\u6D1E\u5BDF" };
    if (dom && a?.overview_html && !String(a.overview_html).includes(dom) && !String(a.overview_html).includes(domDesc[dom] || "\xA7"))
      bad0.push(`overview \u672A\u70B9\u540D\u4E3B\u5BFC\u529F\u80FD ${dom}(\u53D9\u4E8B\u6846\u67B6:MBTI \u4E3A\u4E3B\u8F74,\u516B\u5B57\u4E3A\u843D\u951A)`);
  }
  if (tested) {
    const dv = strip(String(a?.diff_verdict || ""));
    const dvBad = [];
    if (!dv) dvBad.push("\u7F3A diff_verdict \u5224\u8BCD");
    else {
      if (!dv.startsWith("\u4F60\u662F")) dvBad.push("\u5224\u8BCD\u987B\u4EE5\u300C\u4F60\u662F\u300D\u5F00\u5934");
      if (dv.length > 34) dvBad.push(`\u5224\u8BCD\u8FC7\u957F(${dv.length}>30\u5B57)`);
    }
    R["diff_verdict"] = { status: dvBad.length ? "FAIL" : "PASS", reasons: dvBad };
    const len = strip(String(a?.diff_html || "")).length;
    R["diff_html"] = { status: len >= 400 && len <= 650 ? "PASS" : "FAIL", reasons: len >= 400 && len <= 650 ? [] : [`\u5DEE\u5F02\u7248\u5757\u5E94450~600\u5B57\u5DE6\u53F3(400-650\u5BB9\u5DEE),\u5B9E\u9645${len}`] };
  }
  R["_\u5168\u5C40"] = { status: bad0.length ? "FAIL" : "PASS", reasons: bad0 };
  return R;
}
var ARCHETYPE_OK = (t) => /^[一-龥]{7}$/.test(t) || /^[一-龥]{4}[·•・][一-龥]{4}$/.test(t);
function checkZonghe(a, _chart) {
  const R = {};
  const put = (k, bad) => {
    R[k] = { status: bad.length ? "FAIL" : "PASS", reasons: bad };
  };
  {
    const bad = [];
    const t = strip(a?.meta?.archetype_name || "");
    if (!ARCHETYPE_OK(t)) bad.push(`\u5224\u8BCD\u987B7\u5B57\u62164+4\u5BF9\u4ED7,\u5F97\u5230\u300C${t}\u300D`);
    if (/[格局]{2}|身弱|身强|七杀格|正官格|偏财格/.test(t)) bad.push("\u5224\u8BCD\u5806\u683C\u5C40\u672F\u8BED");
    put("meta.archetype_name", bad);
  }
  {
    const bad = [];
    const walk = (obj, path, fn) => {
      if (typeof obj === "string") fn(path, obj);
      else if (Array.isArray(obj)) obj.forEach((v, i) => walk(v, `${path}[${i}]`, fn));
      else if (obj && typeof obj === "object") for (const k of Object.keys(obj)) walk(obj[k], path ? `${path}.${k}` : k, fn);
    };
    walk(a, "", (p, v) => {
      for (const w of ["tier", "needs_review", "lineage_weights", "\u8D77\u6CD5\u5F85\u6838"]) if (v.includes(w)) bad.push(`${p} \u542B\u5185\u90E8\u5B57\u6BB5\u300C${w}\u300D`);
      for (const w of ["rubric", "\u7B97\u6CD5\u5C42", "\u6620\u5C04\u77E9\u9635", "\u51FA\u6587\u534F\u8BAE", "\u8BC4\u5BA1\u904D", "\u4F53\u68C0\u5668", "\u7B97\u6CD5\u6A21\u578B"]) if (v.includes(w)) bad.push(`${p} \u6CC4\u6F0F\u5E55\u540E\u673A\u5236\u8BCD\u300C${w}\u300D`);
      for (const w of ["\u591A\u534A\u662F\u4F60", "\u4F60\u603B\u662F", "\u4F60\u6BCF\u6B21", "\u4F60\u4ECE\u4E0D", "\u4F60\u4E00\u5B9A\u4F1A"]) if (v.includes(w)) bad.push(`${p} \u542B\u884C\u4E3A\u9891\u7387\u65AD\u8A00\u300C${w}\u300D`);
      if (/(大凶|灾年|凶年)/.test(v)) bad.push(`${p} \u542B\u7EDD\u5BF9\u65AD\u8BED(\u5E94\u7528\u987A\u98CE/\u9006\u98CE)`);
      for (const c of childhoodViolations(v)) bad.push(`${p} \u7AE5\u5E74\u884C\u4E3A\u65AD\u8A00\u300C${c}\u2026\u300D`);
    });
    for (const [p, v] of [["section_01.text", a?.section_01?.text], ["section_02.conclusion", a?.section_02?.conclusion], ["final.life_axis", a?.final?.life_axis]])
      if (v && /(此命|该命|命主)/.test(strip(v))) bad.push(`${p} \u7B2C\u4E09\u4EBA\u79F0\u64AD\u62A5\u8154(\u6B64\u547D/\u8BE5\u547D/\u547D\u4E3B),\u987B\u7B2C\u4E8C\u4EBA\u79F0\u300C\u4F60\u300D`);
    put("_\u5168\u5C40\u7981\u8BCD", bad);
  }
  {
    const bad = [];
    const len = strip(a?.section_01?.text || "").length;
    if (!a?.section_01?.text) bad.push("\u7F3A\u5B57\u6BB5");
    else if (len < 160 || len > 280) bad.push(`\u4E3B\u8F74\u5370\u8BC1\u6BB5\u5E94\u7EA6180-250\u5B57(\u5BB9\u5DEE160-280),\u5B9E\u9645${len}`);
    put("section_01.text", bad);
  }
  {
    const bad = [];
    const n = sentences(a?.section_02?.conclusion || "").length;
    if (!a?.section_02?.conclusion) bad.push("\u7F3A\u5B57\u6BB5");
    else if (n < 3) bad.push(`\u9636\u6BB5\u5370\u8BC1\u7ED3\u8BBA\u5E94\u22653\u53E5\u6210\u6BB5,\u5B9E\u9645${n}\u53E5`);
    put("section_02.conclusion", bad);
  }
  {
    const bad = [];
    if (!["\u540C\u5411\u5370\u8BC1", "\u4E92\u8865\u5370\u8BC1", "\u5B58\u5728\u77DB\u76FE"].includes(a?.consistency)) bad.push(`consistency \u987B\u4E09\u9009\u4E00,\u5F97\u5230\u300C${a?.consistency}\u300D`);
    for (const k of ["career", "wealth", "marriage", "children", "family", "health"]) {
      const d = a?.dim?.[k];
      if (!d) {
        bad.push(`dim.${k} \u7F3A\u5931`);
        continue;
      }
      if (!["verdict-yes", "verdict-partial", "verdict-no"].includes(d.verdict_class)) bad.push(`dim.${k}.verdict_class \u975E\u6CD5`);
    }
    if (!Array.isArray(a?.final?.nodes) || a.final.nodes.length !== 5) bad.push(`final.nodes \u5E94\u60705\u9879`);
    if (!Array.isArray(a?.conflicts) || a.conflicts.length !== 3) bad.push(`conflicts \u5E94\u60703\u9879`);
    if (!Array.isArray(a?.strengths) || a.strengths.length !== 3 || !Array.isArray(a?.weaknesses) || a.weaknesses.length !== 3) bad.push("strengths/weaknesses \u5E94\u5404\u60703\u9879");
    put("_\u7ED3\u6784", bad);
  }
  return R;
}
var ZIWEI_FIELDS = ["axis_html", "mingshen_html", "career_html", "wealth_html", "marriage_html", "health_html", "daxian_html", "liunian_html", "advice_html"];
function checkZiwei(a, _chart) {
  const R = {};
  const put = (k, bad) => {
    R[k] = { status: bad.length ? "FAIL" : "PASS", reasons: bad };
  };
  {
    const bad = [];
    const t = strip(a?.meta?.archetype_name || "");
    if (!ARCHETYPE_OK(t)) bad.push(`\u5224\u8BCD\u987B7\u5B57\u62164+4\u5BF9\u4ED7,\u5F97\u5230\u300C${t}\u300D`);
    put("meta.archetype_name", bad);
  }
  {
    const bad = [];
    const walk = (obj, path, fn) => {
      if (typeof obj === "string") fn(path, obj);
      else if (obj && typeof obj === "object") for (const k of Object.keys(obj)) walk(obj[k], path ? `${path}.${k}` : k, fn);
    };
    walk(a, "", (p, v) => {
      for (const w of ["tier", "needs_review", "\u547D\u4E3B\u662F", "\u8D77\u6CD5\u5F85\u6838"]) if (v.includes(w)) bad.push(`${p} \u542B\u300C${w}\u300D`);
      for (const w of ["rubric", "\u7B97\u6CD5\u5C42", "\u6620\u5C04\u77E9\u9635", "\u51FA\u6587\u534F\u8BAE", "\u8BC4\u5BA1\u904D", "\u4F53\u68C0\u5668"]) if (v.includes(w)) bad.push(`${p} \u6CC4\u6F0F\u5E55\u540E\u673A\u5236\u8BCD\u300C${w}\u300D`);
      for (const w of ["\u591A\u534A\u662F\u4F60", "\u4F60\u603B\u662F", "\u4F60\u6BCF\u6B21", "\u4F60\u4ECE\u4E0D", "\u4F60\u4E00\u5B9A\u4F1A"]) if (v.includes(w)) bad.push(`${p} \u542B\u884C\u4E3A\u9891\u7387\u65AD\u8A00\u300C${w}\u300D`);
      if (/^(daxian_html|liunian_html)/.test(p) && /(大凶|灾年|凶年)/.test(v)) bad.push(`${p} \u542B\u7EDD\u5BF9\u65AD\u8BED(\u5E94\u7528\u987A\u98CE/\u9006\u98CE)`);
      for (const c of childhoodViolations(v)) bad.push(`${p} \u7AE5\u5E74\u884C\u4E3A\u65AD\u8A00\u300C${c}\u2026\u300D`);
    });
    put("_\u5168\u5C40\u7981\u8BCD", bad);
  }
  for (const k of ZIWEI_FIELDS) {
    const v = a?.[k];
    const bad = [];
    if (v == null || v === "" || v === "-") {
      put(k, ["\u7F3A\u5B57\u6BB5"]);
      continue;
    }
    const n = sentences(v).length, len = strip(v).length;
    if (n < 5 || len < 140) bad.push(`\u8BE6\u5199\u4E0D\u8DB3(\u53E5\u6570${n}/\u5B57\u6570${len},\u8981\u6C42\u22656\u53E5\u7EA6200\u5B57\u8D77,\u5BB9\u5DEE5\u53E5140\u5B57)`);
    if (["mingshen_html", "career_html", "wealth_html", "marriage_html", "health_html"].includes(k) && !/hl-good|class="hl"/.test(v)) bad.push("\u65E0\u7740\u8272(\u7279\u8D28\u77ED\u8BED\u5E94\u6210\u6BB5\u7740\u8272)");
    put(k, bad);
  }
  return R;
}
function checkLongform(text, chart, currentYear) {
  const R = {};
  const push = (k, reasons, warn = false) => {
    R[k] = { status: reasons.length ? warn ? "WARN" : "FAIL" : "PASS", reasons };
  };
  const raw = strip(text);
  const segs = raw.split(/[。！？!?\n]/).map((s) => s.trim()).filter(Boolean);
  const scan = (re) => segs.filter((s) => re.test(s)).map((s) => s.slice(0, 40));
  push("_\u5E55\u540E\u673A\u5236\u6CC4\u6F0F", scan(/(rubric|算法层|映射矩阵|出文协议|评审遍|体检器|忌神折向|派系侧重|lineage_weights|needs_review|起法待核|R1驿马|R2文|R3胎元|v3加分|v4加分|加分审计)/i).map((s) => `\u673A\u5236\u8BCD:\u300C${s}\u300D(\u5E55\u540E\u53F0\u524D\u5206\u79BB:\u7528\u6237\u53EA\u770B\u7ED3\u8BBA)`));
  push("_\u7248\u672C\u53F7\u6CC4\u6F0F", scan(/\bv[234](\.\d+){0,3}\b/i).map((s) => `\u7248\u672C\u53F7:\u300C${s}\u300D`));
  push("_\u64AD\u62A5\u8154", scan(/(该命主|命主的性格|命主是|命主为|此命主|此造)/).map((s) => `\u7B2C\u4E09\u4EBA\u79F0\u64AD\u62A5:\u300C${s}\u300D(\u987B\u7528\u7B2C\u4E8C\u4EBA\u79F0\u300C\u4F60\u300D)`));
  push("_\u7EDD\u5BF9\u51F6\u8BED", scan(/(大凶|灾年|凶年|凶星|血光|横死)/).map((s) => `\u7EDD\u5BF9\u65AD\u8BED:\u300C${s}\u300D(\u5E94\u6539\u987A\u98CE/\u5E73\u8DEF/\u9006\u98CE)`));
  push("_\u884C\u4E3A\u9891\u7387\u65AD\u8A00", scan(/(多半是你|你总是|你每次|你从不|你一定会|第一个想到你)/).map((s) => `\u9891\u7387\u65AD\u8A00:\u300C${s}\u300D(\u6539\u5199\u4E3A\u80FD\u529B/\u7279\u8D28/\u6F5C\u529B)`));
  push("_\u7AE5\u5E74\u884C\u4E3A\u65AD\u8A00", childhoodViolations(text).map((c) => `\u300C${c}\u2026\u300D(\u4ECE\u5C0F\u53EA\u80FD\u63A5\u6C14\u8D28\u3001\u4E0D\u63A5\u53EF\u8BC1\u4F2A\u884C\u4E3A)`));
  {
    const zy = chart?.bazi?.enrichment?.\u6B63\u7F18\u503E\u5411;
    const bad = [];
    if (zy?.\u5E74\u9F84\u503E\u5411) {
      const mtext = segs.filter((s) => /(正缘|配偶|另一半|伴侣|对象|婚配|择偶|另一伴)/.test(s)).join(" ");
      const said = [];
      if (/年长|比你大/.test(mtext)) said.push("\u5E74\u957F");
      if (/年轻|比你小/.test(mtext)) said.push("\u5E74\u8F7B");
      if (/同龄|相仿/.test(mtext)) said.push("\u540C\u9F84");
      if (said.length && !said.includes(zy.\u5E74\u9F84\u503E\u5411)) bad.push(`\u6B63\u7F18\u5E74\u9F84\u8BCD(${said.join("/")})\u4E0E\u7B97\u6CD5\u5224\u5B9A(${zy.\u5E74\u9F84\u503E\u5411})\u77DB\u76FE`);
    }
    push("\u6B63\u7F18\u5E74\u9F84\u4E00\u81F4\u6027", bad);
  }
  return R;
}
function main() {
  const MODE_HELP = "\u6A21\u5F0F\u8BF4\u660E(--mode,\u9ED8\u8BA4 bazi): bazi=\u516B\u5B57\u6D77\u62A5JSON\u4F53\u68C0 / zonghe=\u7EFC\u5408\u5370\u8BC1\u6D77\u62A5\u4F53\u68C0 / ziwei=\u7D2B\u5FAE\u72EC\u7ACB\u6D77\u62A5\u4F53\u68C0 / mbti=MBTI\u6D77\u62A5\u4F53\u68C0 / longform=\u957F\u6587(Markdown)\u4F53\u68C0";
  const args = {};
  for (const x of process.argv.slice(2)) {
    const m = x.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  }
  if (args.mode === "longform") {
    const p = args.text || args.analysis;
    if (!p) {
      console.error("Usage: node check-analysis.js --mode=longform --text=report.md [--chart=chart.json] [--currentYear=YYYY]\n" + MODE_HELP);
      process.exit(1);
    }
    const text = fs.readFileSync(p, "utf-8");
    const chart2 = args.chart ? JSON.parse(fs.readFileSync(args.chart, "utf-8")) : {};
    const cy2 = args.currentYear ? +args.currentYear : (/* @__PURE__ */ new Date()).getFullYear();
    const rep2 = checkLongform(text, chart2, cy2);
    const fails2 = Object.entries(rep2).filter(([, r]) => r.status === "FAIL");
    console.log(JSON.stringify({ \u7ED3\u8BBA: fails2.length ? `FAIL\xD7${fails2.length}(\u9001\u56DE\u91CD\u5199)` : "ALL PASS", \u660E\u7EC6: rep2 }, null, 2));
    process.exit(fails2.length ? 1 : 0);
  }
  if (!args.analysis || !args.chart) {
    console.error("Usage: node check-analysis.js --analysis=analysis.json --chart=chart.json [--mode=bazi|zonghe|ziwei|mbti|longform] [--currentYear=YYYY]\n" + MODE_HELP);
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
  const rep = args.mode === "mbti" ? checkMbti(a, chart) : args.mode === "zonghe" ? checkZonghe(a, chart) : args.mode === "ziwei" ? checkZiwei(a, chart) : checkAnalysis(a, chart, cy);
  const fails = Object.entries(rep).filter(([, r]) => r.status === "FAIL");
  console.log(JSON.stringify({ \u7ED3\u8BBA: fails.length ? `FAIL\xD7${fails.length}(\u9001\u56DE\u8BC4\u5BA1\u904D\u91CD\u751F)` : "ALL PASS", \u660E\u7EC6: rep }, null, 2));
  process.exit(fails.length ? 1 : 0);
}
if (require.main === module) main();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  checkAnalysis,
  checkLongform,
  checkMbti,
  checkZiwei,
  checkZonghe
});

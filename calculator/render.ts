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

const DIZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

function calcVirtualAge(birthYear: number, currentYear: number): number {
  return currentYear - birthYear + 1;
}

function chartToFlat(chart: any, currentYear?: number): Record<string, any> {
  const out: Record<string, any> = {};
  const bi = chart.bazi.birthInfo;
  const bz = chart.bazi;
  const zw = chart.ziwei;
  currentYear = currentYear || new Date().getFullYear();
  const virtualAge = calcVirtualAge(bi.year, currentYear);

  // ============ META ============
  out['meta.solar_date'] = `${bi.year}-${String(bi.month).padStart(2,'0')}-${String(bi.day).padStart(2,'0')} ${String(bi.hour).padStart(2,'0')}:${String(bi.minute).padStart(2,'0')}`;
  if (zw.lunarDate) {
    out['meta.lunar_date'] = `${zw.lunarDate.year}年 ${zw.lunarDate.monthCn}月${zw.lunarDate.dayCn} ${zw.lunarDate.hourCn || ''}`.trim();
  } else {
    out['meta.lunar_date'] = '-';
  }
  out['meta.gender_full'] = bi.gender === 'male' ? '男（' + (zw.yinYang || '') + '）' : '女（' + (zw.yinYang || '') + '）';
  out['meta.age_virtual'] = virtualAge.toString();
  out['meta.current_year'] = currentYear.toString();
  const now = new Date();
  out['meta.gen_time'] = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  out['meta.yinyang'] = zw.yinYang || '-';

  // ============ ZIWEI META ============
  // Yiqi 没明确输出 命主/身主/子年斗君 — 从十二宫推导 / 留空
  // 简化: 默认根据命宫地支查命主, 身宫地支查身主
  const MING_ZHU = { '子':'贪狼','丑':'巨门','寅':'禄存','卯':'文曲','辰':'廉贞','巳':'武曲','午':'破军','未':'武曲','申':'廉贞','酉':'文曲','戌':'禄存','亥':'巨门' };
  const SHEN_ZHU = { '子':'火星','丑':'天相','寅':'天梁','卯':'天同','辰':'文昌','巳':'天机','午':'火星','未':'天相','申':'天梁','酉':'天同','戌':'文昌','亥':'天机' };
  const mingDizhi = zw.gongs[0].dizhi;
  const shenDizhi = DIZHI[zw.shenGongIndex];
  out['ziwei.ming_zhu'] = (MING_ZHU as any)[mingDizhi] || '-';
  out['ziwei.shen_zhu'] = (SHEN_ZHU as any)[shenDizhi] || '-';
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
  for (const k of ['木','火','土','金','水']) {
    out[`core.yueling.${k}`] = yl[k] || '-';
  }

  const wx = en?.五行统计?.withCangGan || en?.五行统计 || { 木:0,火:0,土:0,金:0,水:0 };
  for (const k of ['木','火','土','金','水']) out[`core.wuxing.${k}`] = wx[k] ?? '-';
  const wxMax = Math.max(...['木','火','土','金','水'].map(k => +wx[k] || 0)) || 1;
  for (const k of ['木','火','土','金','水']) out[`core.wuxing_pct.${k}`] = Math.round(((+wx[k] || 0) / wxMax) * 100);

  // ============ ZIWEI 12 GONGS ============
  const sihuaCharMap: any = { 化禄:'禄', 化权:'权', 化科:'科', 化忌:'忌' };
  for (const g of zw.gongs) {
    const mainStarsHtml = (g.mainStars && g.mainStars.length > 0)
      ? g.mainStars.map((s: string) => {
          const sh = (g.sihua || []).find((x: any) => x.star === s);
          if (sh) {
            const huaChar = sihuaCharMap[sh.hua] || sh.hua.slice(-1);
            return `<span class="sihua-${huaChar}">${s}<span class="sihua-tag">${huaChar}</span></span>`;
          }
          return s;
        }).join('·')
      : '<span style="color:var(--ink-faint)">无主星</span>';
    // 辅星同样要处理四化（右弼化科 / 文昌化忌 / 文曲化科 等常落辅星）
    const auxStarsHtml = (g.auxStars && g.auxStars.length > 0)
      ? g.auxStars.map((s: string) => {
          const sh = (g.sihua || []).find((x: any) => x.star === s);
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
    const flags: string[] = [];
    if (g.dizhi === mingDizhi) flags.push('ming');
    if (g.dizhi === shenDizhi) flags.push('shen');
    if (g.daXian && g.daXian.startAge <= virtualAge && virtualAge <= g.daXian.endAge) flags.push('current-daxian');
    out[`gongs.${g.dizhi}.flag`] = flags.join(' ');
    out[`gongs.${g.dizhi}.shenBadge`] = (g.dizhi === shenDizhi) ? '<span class="shen-badge">身</span>' : '';
  }

  // ============ BAZI 4 PILLARS ============
  const cangGanFmt = (arr: any[]) => (arr || []).map((x: any) => `${x.gan}(${x.shiShen})`).join(' ');
  const pillarKeyToCn: any = { year: '年', month: '月', day: '日', hour: '时' };
  for (const k of ['year','month','day','hour']) {
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
  let currentDayun: any = null;
  for (let i = 0; i < 10; i++) {
    const d = dayunArr[i];
    if (d && d.startAge <= virtualAge && virtualAge <= d.endAge) currentDayun = d;
  }
  for (let i = 0; i < 10; i++) {
    const d = dayunArr[i];
    if (!d) {
      ['gz','age_range','shishen','current_class'].forEach(f => out[`dayun.${i}.${f}`] = '-');
      continue;
    }
    out[`dayun.${i}.gz`] = d.ganZhi.gan + d.ganZhi.zhi;
    out[`dayun.${i}.age_range`] = `${d.startAge}-${d.endAge}`;
    const sg = (d.ganShiShen || '').slice(0,1);
    const sz = (d.zhiShiShen || '').slice(0,1);
    out[`dayun.${i}.shishen`] = sg + sz;
    out[`dayun.${i}.current_class`] = (currentDayun && d === currentDayun) ? 'current dayun' : '';
  }

  // ============ SECTION 02 阶段印证时间轴 (从 chart 算, 不靠 LLM) ============
  // 八字大运: 前 7 段
  const dayunForStage = dayunArr.slice(0, 7);
  for (let i = 0; i < 7; i++) {
    const d = dayunForStage[i];
    if (!d) {
      ['range','gz','shishen','current_class'].forEach(f => out[`section_02.bazi.${i}.${f}`] = '-');
      continue;
    }
    out[`section_02.bazi.${i}.range`] = `${d.startAge}-${d.endAge}`;
    out[`section_02.bazi.${i}.gz`] = d.ganZhi.gan + d.ganZhi.zhi;
    const sg = (d.ganShiShen || '').slice(0,1);
    const sz = (d.zhiShiShen || '').slice(0,1);
    out[`section_02.bazi.${i}.shishen`] = sg + sz;
    out[`section_02.bazi.${i}.current_class`] = (d.startAge <= virtualAge && virtualAge <= d.endAge) ? 'current' : '';
  }

  // 紫微大限: 按 startAge 排序取前 7 段
  const ziweiDaxian = zw.gongs
    .filter((g: any) => g.daXian)
    .map((g: any) => ({ startAge: g.daXian.startAge, endAge: g.daXian.endAge, gong: g.gong }))
    .sort((a: any, b: any) => a.startAge - b.startAge)
    .slice(0, 7);
  for (let i = 0; i < 7; i++) {
    const d = ziweiDaxian[i];
    if (!d) {
      ['range','current_class'].forEach(f => out[`section_02.ziwei.${i}.${f}`] = '-');
      continue;
    }
    out[`section_02.ziwei.${i}.range`] = `${d.startAge}-${d.endAge}`;
    out[`section_02.ziwei.${i}.current_class`] = (d.startAge <= virtualAge && virtualAge <= d.endAge) ? 'current' : '';
  }

  // ============ LIUNIAN 10 (current dayun) ============
  if (currentDayun) {
    out['liunian_dayun_label'] = `${currentDayun.ganZhi.gan}${currentDayun.ganZhi.zhi} ${currentDayun.startAge}-${currentDayun.endAge}`;
  } else {
    out['liunian_dayun_label'] = '-';
  }
  const liunianArr = ((currentDayun?.liuNian) || []).slice(0, 10);
  for (let i = 0; i < 10; i++) {
    const ln = liunianArr[i];
    if (!ln) {
      ['year','age','gz','shishen','current_class'].forEach(f => out[`liunian.${i}.${f}`] = '-');
      continue;
    }
    out[`liunian.${i}.year`] = ln.year;
    out[`liunian.${i}.age`] = ln.age;
    out[`liunian.${i}.gz`] = ln.ganZhi.gan + ln.ganZhi.zhi;
    out[`liunian.${i}.shishen`] = ln.ganShiShen ? (ln.ganShiShen.slice(0,1) + (ln.zhiShiShen?.slice(0,1) || '')) : '';
    out[`liunian.${i}.current_class`] = (ln.age === virtualAge) ? 'current' : '';
  }

  return out;
}

function analysisToFlat(analysis: any): Record<string, any> {
  const out: Record<string, any> = {};

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
  if (analysis.consistency) out['ziwei.consistency'] = analysis.consistency;

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
  const dims = ['career','wealth','marriage','children','family','health'];
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
    for (let i = 0; i < 4; i++) out[`final.advice.${i}`] = analysis.final.advice?.[i] || '-';
  }

  // confidence
  if (analysis.confidence) {
    for (const k of ['bazi','ziwei','consistency','stability']) {
      out[`confidence.${k}_level`] = analysis.confidence[`${k}_level`] || '-';
      out[`confidence.${k}_score`] = analysis.confidence[`${k}_score`] || '-';
    }
    out['confidence.note'] = analysis.confidence.note || '-';
  }

  return out;
}

// ===================== BAZI-ONLY POSTER (--mode=bazi) =====================
const GAN_WX: Record<string,string> = {甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};
const ZHI_WX: Record<string,string> = {寅:'木',卯:'木',巳:'火',午:'火',申:'金',酉:'金',亥:'水',子:'水',辰:'土',戌:'土',丑:'土',未:'土'};
const ZODIAC: Record<string,string> = {子:'鼠',丑:'牛',寅:'虎',卯:'兔',辰:'龙',巳:'蛇',午:'马',未:'羊',申:'猴',酉:'鸡',戌:'狗',亥:'猪'};
const SS_KEY: Record<string,string> = {比肩:'bijian',劫财:'jiecai',食神:'shishen',伤官:'shangguan',偏财:'piancai',正财:'zhengcai',七杀:'qisha',七煞:'qisha',正官:'zhengguan',偏印:'pianyin',枭神:'pianyin',正印:'zhengyin'};
const SS_POL: Record<string,string> = {吉:'good','中性':'neutral',凶:'warn'};

function shenshaByPillarBazi(chart:any): Record<string,string[]> {
  const ss = chart.bazi?.enrichment?.神煞;
  const hits = (ss?.lineage?.hits) || ss?.hits || []; // 流派镜片优先(修:海报曾漏用中立全集)
  const m: Record<string,string[]> = {年:[],月:[],日:[],时:[]};
  for (const h of hits) for (const pl of (h.pillars||[])) if (m[pl]) m[pl].push(`<span class="ss-name ${SS_POL[h.polarity]||'neutral'}">${h.name}</span>`);
  return m;
}

function chartToFlatBazi(chart:any, currentYear?:number): Record<string,any> {
  const out: Record<string,any> = {};
  const bi = chart.bazi.birthInfo, bz = chart.bazi, en = bz.enrichment||{}, zw = chart.ziwei||{};
  currentYear = currentYear || new Date().getFullYear();
  const virtualAge = currentYear - bi.year + 1;
  const p2 = (n:number)=>String(n).padStart(2,'0');
  out['meta.solar_date'] = `${bi.year}-${p2(bi.month)}-${p2(bi.day)} ${p2(bi.hour)}:${p2(bi.minute)}`;
  out['meta.true_solar_time'] = out['meta.solar_date'];
  out['meta.solar_correction'] = '未做真太阳时校正（钟表时间）';
  out['meta.lunar_date'] = zw.lunarDate ? `${zw.lunarDate.year}年${zw.lunarDate.monthCn}月${zw.lunarDate.dayCn}` : '-';
  out['meta.gender'] = bi.gender==='male'?'男':'女';
  out['meta.age_virtual'] = String(virtualAge);
  out['meta.current_year'] = String(currentYear);
  const now=new Date(); out['meta.gen_time']=`${now.getFullYear()}-${p2(now.getMonth()+1)}-${p2(now.getDate())} ${p2(now.getHours())}:${p2(now.getMinutes())}`;
  out['meta.day_master'] = bz.dayMaster || bz.siZhu.day.gan;
  out['meta.zodiac'] = ZODIAC[bz.siZhu.year.zhi]||'-';
  out['meta.wangshuai'] = en.旺衰?.verdict || '-';
  out['meta.geju_full'] = en.格局?.primary || '-';
  out['meta.qiyun'] = bz.dayunStart!=null ? `${bz.dayunStart}岁起运` : '-';
  out['meta.name']='命主'; out['meta.birthplace']='-'; out['meta.minggong']=en.命宫||'-'; out['meta.taiyuan']=en.胎元||'-'; out['meta.direction_note']='';
  const cangGanFmt=(arr:any[])=>(arr||[]).map((x:any)=>`${x.gan}(${x.shiShen||''})`).join(' ');
  const cnMap:any={year:'年',month:'月',day:'日',hour:'时'};
  const ssP = shenshaByPillarBazi(chart);
  for (const k of ['year','month','day','hour']) {
    const gz=bz.siZhu[k];
    out[`bazi.${k}.gan`]=gz.gan; out[`bazi.${k}.zhi`]=gz.zhi;
    out[`bazi.${k}.gan_wx`]=GAN_WX[gz.gan]||'-'; out[`bazi.${k}.zhi_wx`]=ZHI_WX[gz.zhi]||'-';
    if (k!=='day') out[`bazi.${k}.shiShen`]=bz.shiShen?.[k]||'-';
    out[`bazi.${k}.cangGanHtml`]=cangGanFmt(bz.cangGan?.[k]);
    out[`bazi.${k}.zhangSheng`]=bz.zhangSheng?.[k]||'-';
    out[`bazi.${k}.ziZuo`]=en.自坐?.[cnMap[k]]||en.自坐?.[k]||'-';
    out[`bazi.${k}.naYin`]=bz.naYin?.[k]||'-';
    out[`bazi.${k}.shenshaHtml`]=(ssP[cnMap[k]]||[]).join(' ')||'—';
  }
  const wx = en.五行统计?.withCangGan || en.五行统计?.surface || en.五行统计 || {};
  const wxKeys:[string,string][]=[['mu','木'],['huo','火'],['tu','土'],['jin','金'],['shui','水']];
  let wxTotal=0; for (const [,cn] of wxKeys) wxTotal += (+wx[cn]||0);
  out['wuxing.total']=String(wxTotal||0);
  for (const [py,cn] of wxKeys){ const v=+wx[cn]||0; out[`wuxing.${py}`]=String(v); out[`wuxing.${py}_pct`]=String(wxTotal?Math.round(v/wxTotal*100):0); }
  const tgCount:Record<string,number>={};
  const addSS=(sx?:string)=>{ if(!sx)return; const key=SS_KEY[sx]; if(key) tgCount[key]=(tgCount[key]||0)+1; };
  for (const k of ['year','month','hour']) addSS(bz.shiShen?.[k]);
  for (const k of ['year','month','day','hour']) for (const cg of (bz.cangGan?.[k]||[])) addSS(cg.shiShen);
  const tgAll=['bijian','jiecai','shishen','shangguan','piancai','zhengcai','qisha','zhengguan','pianyin','zhengyin'];
  let tgTotal=0; for (const t of tgAll) tgTotal+=(tgCount[t]||0);
  for (const t of tgAll){ const n=tgCount[t]||0; out[`tg.${t}_n`]=String(n); out[`tg.${t}_pct`]=String(tgTotal?Math.round(n/tgTotal*100):0); }
  const bd = en.旺衰?.breakdown || {};
  const mk=(v:any)=>v?['yes','✓']:['no','✗'];
  const [dlc,dlm]=mk(bd.得令),[ddc,ddm]=mk(bd.得地),[dsc,dsm]=mk(bd.得势);
  out['dm.deling_class']=dlc; out['dm.deling_mark']=dlm; out['dm.dedi_class']=ddc; out['dm.dedi_mark']=ddm; out['dm.deshi_class']=dsc; out['dm.deshi_mark']=dsm;
  const sc = en.旺衰?.score ?? 0;
  out['dm.score_pct']=String(Math.max(0,Math.min(100,Math.round((sc+10)*5))));
  out['dm.score_label']=en.旺衰?.verdict||'-'; out['dm.verdict']=en.旺衰?.verdict||'-';
  out['geju.name']=en.格局?.primary||'-'; out['geju.confidence']=en.格局?.confidence||'-';
  out['geju.chenge']=en.格局?.chenge || (en.格局?.primary&&en.格局.primary!=='-'?'成格':'-');
  const allHits = (en.神煞?.lineage?.hits) || en.神煞?.hits || []; // 流派镜片优先
  out['shensha.list_html']= allHits.length? allHits.map((h:any)=>`<span class="ss-name ${SS_POL[h.polarity]||'neutral'}">${h.name}</span>`).join(' ') : '—';
  // v2.3: 用神出口注入 — 用/忌/喜/调候/开运方色数由算法层确定性生成,LLM 产出将被忽略
  const yaX = en.用神建议;
  if (yaX?.出口) {
    const ck = yaX.出口;
    out['yongshen.yong_html'] = wxChip((yaX.边界盘 || !yaX.收敛)
      ? `护体:${(yaX.调候?.取干 || []).join('')}<br>发用:${(yaX.格局?.取 || []).join('、')}`
      : (yaX.共识用神 || []).join('、'));
    out['yongshen.xi_text'] = wxChip((ck.喜神 || []).join('、'));
    out['yongshen.ji_html'] = (ck.忌神 || []).length ? wxChip(ck.忌神.join('、')) : '无明显忌神(临界盘,以流通为要)';
    out['yongshen.tiaohou_html'] = wxChip(ck.调候提示 || '-');
    out['yongshen.divergence_note'] = [ck.divergence, ck.缺补说明].filter(Boolean).join('　');
    out['kaiyun.yong_html'] = wxChip((ck.开运用神 || []).join('、'));
    out['kaiyun.fang_html'] = (ck.吉方 || []).join('·');
    out['kaiyun.se_html'] = (ck.吉色 || []).join('·');
    out['kaiyun.shu_html'] = (ck.吉数 || []).join('、');
    out['kaiyun.tiaohou_html'] = wxChip(ck.调候提示 || '-');
    out['__algo_yongshen'] = '1';
  }
  // v1.6: 合冲刑害(作用关系)注入 — 有流派视图用流派视图,否则用 open 通则
  const ix = en.作用关系;
  const ixView = ix?.lineage || ix;
  out['hechong.policy'] = ix?.lineage ? `${ix.lineage.name}规则集` : (ix ? '通则(不限流派)' : '-');
  const stCls = (st:string)=> (st==='生效'||st==='成局'||st==='合而化') ? 'st-on' : (st==='被解'||st==='被绊'||st==='合而不化(绊)') ? 'st-off' : 'st-mid';
  const ixItems = (ixView?.items)||[];
  out['hechong.rows_html'] = ixItems.length ? ixItems.map((r:any)=>
    `<div class="hc-row"><span class="hc-type">${r.type}</span><span class="hc-mem">${(r.members||[]).join('')}(${(r.pillars||[]).join('-')}·${r.distance})</span><span class="hc-status ${stCls(r.status)}">【${r.status}】</span><span class="hc-cause">${r.cause||''}</span></div>`
  ).join('') : '<div class="hc-row"><span class="hc-cause">本盘干支之间无显著合冲刑害关系</span></div>';
  // v1.6: 运岁引动注入 — 大运引动全列 + 当前大运流年(有引动的年份)
  const ys = en.运岁引动;
  const ysRows: string[] = [];
  for (const dstep of (ys?.大运引动||[])) {
    for (const h of (dstep.hits||[])) ysRows.push(
      `<div class="hc-row"><span class="hc-type">${h.type}</span><span class="hc-mem">大运${dstep.干支} ${dstep.年龄}</span><span class="hc-cause">${h.desc}</span></div>`);
  }
  for (const y of (ys?.当前大运流年?.流年||[])) {
    if (y.年 < currentYear || y.年 >= currentYear + 5) continue; // 【用户定】海报只看今年起未来5年
    const all=[...(y.vs原局||[]),...(y.vs大运||[])];
    if (all.length) ysRows.push(
      `<div class="hc-row"><span class="hc-type">流年</span><span class="hc-mem">${y.年} ${y.干支}</span><span class="hc-cause">${all.map((h:any)=>`[${h.type}]`).join('')} ${all.map((h:any)=>h.desc.replace(/^(大运|流年)/,'')).join(';')}</span></div>`);
  }
  out['yunsui.rows_html'] = ysRows.length ? ysRows.join('') : '<div class="hc-row"><span class="hc-cause">运岁与原局无显著引动</span></div>';
  out['hechong.reading_html']='-'; out['yunsui.reading_html']='-'; out['shensha.reading_html']='-';
  // v2.8: 「你最像的是」小版块(全算法注入)
  const bw = en.八维结构;
  if (bw) {
    out['mbti.type'] = bw.最像类型; out['mbti.alt'] = bw.备选类型; out['mbti.alt2'] = bw.备选2 || '—'; out['mbti.conf'] = bw.置信;
    out['mbti.dom'] = bw.主导; out['mbti.aux'] = bw.辅助;
    out['mbti.bars_html'] = (bw.八维 || []).slice(0, 4).map((x: any) => `<span><b>${x.功能}</b> ${x.百分比}%</span>`).join(' ');
  } else {
    out['mbti.type']='-'; out['mbti.alt']='-'; out['mbti.conf']='-'; out['mbti.dom']='-'; out['mbti.aux']='-'; out['mbti.bars_html']='';
  }
  const dyArr=(bz.dayun||[]).slice(0,10);
  let curDy:any=null; for (const d of dyArr) if (d.startAge<=virtualAge&&virtualAge<=d.endAge) curDy=d;
  for (let i=0;i<10;i++){ const d=dyArr[i];
    if(!d){ ['gz','age_range','shishen','start_year'].forEach(f=>out[`dayun.${i}.${f}`]='-'); out[`dayun.${i}.current_class`]=''; out[`dayun.${i}.luck_class`]='luck-ping'; continue; }
    out[`dayun.${i}.gz`]=d.ganZhi.gan+d.ganZhi.zhi;
    out[`dayun.${i}.age_range`]=`${d.startAge}-${d.endAge}`;
    out[`dayun.${i}.start_year`]=String(d.startYear||'-');
    out[`dayun.${i}.shishen`]=((d.ganShiShen||'').slice(0,1))+((d.zhiShiShen||'').slice(0,1));
    out[`dayun.${i}.current_class`]=(curDy&&d===curDy)?'current':'';
    out[`dayun.${i}.luck_class`]='luck-ping';
  }
  out['dayun.head_note']='';
  // 未起运(当前年不在任何大运内):合成 currentYear 起 10 个流年干支,避免整条裸横杠
  const GAN10=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'], ZHI12=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const gzOfYear=(y:number)=>GAN10[(y-4)%10]+ZHI12[(y-4)%12];
  let lnSrc=(curDy?.liuNian)||[];
  let synth=false;
  if(!lnSrc.length){ synth=true; lnSrc=Array.from({length:10},(_,i)=>({year:currentYear!+i, ganZhi:{gan:gzOfYear(currentYear!+i)[0], zhi:gzOfYear(currentYear!+i)[1]}, age:(currentYear!+i)-bi.year+1})); }
  const lnArr=lnSrc.slice(0,10);
  if(synth) out['liunian.head_note']='尚未起运·列当前年起十年';
  for (let i=0;i<10;i++){ const ln=lnArr[i];
    if(!ln){ ['year','gz','shishen'].forEach(f=>out[`liunian.${i}.${f}`]='-'); out[`liunian.${i}.current_class`]=''; out[`liunian.${i}.luck_class`]='luck-ping'; continue; }
    out[`liunian.${i}.year`]=String(ln.year);
    out[`liunian.${i}.gz`]=ln.ganZhi.gan+ln.ganZhi.zhi;
    out[`liunian.${i}.shishen`]=ln.ganShiShen?((ln.ganShiShen.slice(0,1))+((ln.zhiShiShen?.slice(0,1))||'')):'';
    out[`liunian.${i}.current_class`]=(ln.age===virtualAge)?'current':'';
    out[`liunian.${i}.luck_class`]='luck-ping';
  }
  if(!synth) out['liunian.head_note']='';
  // v2.3: 大运/流年顺逆配色算法化 — 干支五行对照出口喜忌打分,重级引动降档
  if (yaX?.出口) {
    const likes = new Set([...(yaX.出口.开运用神 || []), ...(yaX.出口.喜神 || [])]);
    const dislikes = new Set(yaX.出口.忌神 || []);
    const gzScore = (gan: string, zhi: string) => {
      let sc = 0;
      for (const wx of [GAN_WX[gan], ZHI_WX[zhi]]) { if (likes.has(wx)) sc++; else if (dislikes.has(wx)) sc--; }
      return sc;
    };
    const downgrade = (cls: string) => cls === 'luck-ji' ? 'luck-ping' : 'luck-xiong';
    const heavyByStep: Record<number, boolean> = {};
    for (const st of (en.运岁引动?.大运引动 || []))
      heavyByStep[st.步 - 1] = (st.hits || []).some((h: any) => h.type === '天克地冲' || h.type === '伏吟');
    for (let i = 0; i < 10; i++) {
      const d = dyArr[i]; if (!d) continue;
      let cls = (() => { const sc = gzScore(d.ganZhi.gan, d.ganZhi.zhi); return sc >= 1 ? 'luck-ji' : sc <= -1 ? 'luck-xiong' : 'luck-ping'; })();
      if (heavyByStep[i]) cls = downgrade(cls);
      out[`dayun.${i}.luck_class`] = cls;
    }
    const heavyYear: Record<number, boolean> = {};
    for (const y of (en.运岁引动?.当前大运流年?.流年 || [])) {
      const all = [...(y.vs原局 || []), ...(y.vs大运 || [])];
      heavyYear[y.年] = all.some((h: any) => h.type === '天克地冲' || h.type === '伏吟' || h.type === '岁运并临');
    }
    for (let i = 0; i < 10; i++) {
      const ln = lnArr[i]; if (!ln) continue;
      let cls = (() => { const sc = gzScore(ln.ganZhi.gan, ln.ganZhi.zhi); return sc >= 1 ? 'luck-ji' : sc <= -1 ? 'luck-xiong' : 'luck-ping'; })();
      if (heavyYear[ln.year]) cls = downgrade(cls);
      out[`liunian.${i}.luck_class`] = cls;
    }
    out['__algo_luck'] = '1';
  }

  return out;
}

// v1.6.1: 用/忌/喜/调候字段的干支五行元素自动加色块(连续同五行字符并为一个 chip)
function wxChip(s:any): any {
  if (!s || typeof s !== 'string' || s.includes('wx-chip')) return s;
  return s.replace(/[甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥木火土金水]+/g, (run:string) => {
    const wxOf = (ch:string)=> (GAN_WX as any)[ch] || (ZHI_WX as any)[ch] || ('木火土金水'.includes(ch) ? ch : '');
    const first = wxOf(run[0]);
    if (first && [...run].every(c => wxOf(c) === first)) {
      return `<span class="wx-chip wx-${first}">${run}</span>`;
    }
    return [...run].map(c => { const w = wxOf(c); return w ? `<span class="wx-chip wx-${w}">${c}</span>` : c; }).join('');
  });
}

function analysisToFlatBazi(a:any): Record<string,any> {
  const out:Record<string,any>={};
  if(a.meta){ if(a.meta.archetype_name)out['meta.archetype_name']=a.meta.archetype_name; if(a.meta.axis_oneliner)out['meta.axis_oneliner']=a.meta.axis_oneliner; if(a.meta.name)out['meta.name']=a.meta.name; if(a.meta.direction_note)out['meta.direction_note']=a.meta.direction_note; }
  if(a.dm?.desc_html)out['dm.desc_html']=a.dm.desc_html;
  if(a.geju?.sub_html)out['geju.sub_html']=a.geju.sub_html;
  if(a.wuxing?.note_html)out['wuxing.note_html']=a.wuxing.note_html;
  if(a.tg){ if(a.tg.mech_html)out['tg.mech_html']=a.tg.mech_html; if(a.tg.plain_html)out['tg.plain_html']=a.tg.plain_html; }
  if(a.yongshen)for(const k of ['yong_html','ji_html','xi_text','tiaohou_html'])if(a.yongshen[k]!=null)out[`yongshen.${k}`]=wxChip(a.yongshen[k]);
  if(a.yongshen?.note_html!=null)out['yongshen.note_html']=a.yongshen.note_html;
  if(a.interp)for(const k of ['personality_html','career_html','marriage_html','health_html'])if(a.interp[k]!=null)out[`interp.${k}`]=a.interp[k];
  if(a.kaiyun)for(const k of ['fang_html','se_html','shu_html','ye','place_html','item_html','skill_html','note_html'])if(a.kaiyun[k]!=null)out[`kaiyun.${k}`]=a.kaiyun[k];
  for(const k of ['tiaohou_html','yong_html'])if(a.kaiyun?.[k]!=null)out[`kaiyun.${k}`]=wxChip(a.kaiyun[k]);
  if(a.hechong?.reading_html)out['hechong.reading_html']=a.hechong.reading_html;
  if(a.yunsui?.reading_html)out['yunsui.reading_html']=a.yunsui.reading_html;
  if(a.shensha?.reading_html)out['shensha.reading_html']=a.shensha.reading_html;
  if(Array.isArray(a.timeline))for(let i=0;i<5;i++){ const t=a.timeline[i]||{}; for(const f of ['age','year','run','run_class','desc','marker_class'])out[`timeline.${i}.${f}`]=t[f]!=null?t[f]:'-'; }
  if(a.dayun_head_note)out['dayun.head_note']=a.dayun_head_note;
  if(a.liunian_head_note)out['liunian.head_note']=a.liunian_head_note;
  if(Array.isArray(a.dayun_luck))a.dayun_luck.forEach((v:string,i:number)=>{ if(i<10&&v)out[`dayun.${i}.luck_class`]=v; });
  if(Array.isArray(a.liunian_luck))a.liunian_luck.forEach((v:string,i:number)=>{ if(i<10&&v)out[`liunian.${i}.luck_class`]=v; });
  return out;
}

// ===================== MBTI POSTER (--mode=mbti) v2.8 =====================
// v2.8.2: 古风 MBTI 人物(16p 扁平画风×汉服),按四大类群换装换道具,E/I 定神态,确定性生成
function guFengCharSvg(type: string, gender?: string): string {
  // v3.1.2: 正面低多边形站姿(回退 v3.1.0 构图) + 16 型服装全差异:
  //   袍系×道具=四类群 | 袍色明暗+披帛=E/I | 头饰=SJ乌纱/N系J方冠/N系P逍遥巾/SP斗笠 | 腰佩=T剑柄/F玉环流苏
  // v3.3: 分男女(32 变体)——女版换发式头饰(高髻步摇/单髻玉簪/双环髻/束发红绳)+鬓发耳坠花钿+裙摆,身体几何不动防叠压
  const t = (type || 'XXXX').toUpperCase();
  const F = gender === 'female' || gender === '女';
  const N = t[1] === 'N', T = t[2] === 'T', J = t[3] === 'J', E = t[0] === 'E';
  const grp = N ? (T ? 'NT' : 'NF') : (J ? 'SJ' : 'SP');
  const C: any = {
    NT: { m: '#6b5b8e', d: '#544672', dd: '#41365c', l: '#8d7db0', acc: '#b7a9d6', label: '军师' },
    NF: { m: '#4a7c4e', d: '#3a633d', dd: '#2c4e2f', l: '#699e6d', acc: '#a9cbaa', label: '文士' },
    SJ: { m: '#2a4a72', d: '#1f3a5c', dd: '#162c47', l: '#476a94', acc: '#9db6d4', label: '朝官' },
    SP: { m: '#a0672a', d: '#835420', dd: '#684218', l: '#c08544', acc: '#e0b97f', label: '游侠' },
  }[grp];
  // E 亮袍 / I 深袍
  const RM = E ? C.m : C.d;       // 袍主面
  const RL = E ? C.l : C.m;       // 亮侧
  const RD = E ? C.d : C.dd;      // 暗侧/袖
  const skin = '#f2d9bd', skinD = '#e3c19e', hair = '#3a3430', hairL = '#57504a', paper = '#f3ead7', paperD = '#ded2b6';
  const eyes = E
    ? `<circle cx="52.5" cy="38" r="2" fill="${hair}"/><circle cx="67.5" cy="38" r="2" fill="${hair}"/>`
    : `<path d="M49,38 Q52.5,40.6 56,38" stroke="${hair}" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M64,38 Q67.5,40.6 71,38" stroke="${hair}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  const smile = F
    ? (E
      ? `<path d="M55.5,46 Q60,49.5 64.5,46" stroke="#b8524a" stroke-width="2" fill="none" stroke-linecap="round"/>`
      : `<path d="M57,46.8 Q60,48.8 63,46.8" stroke="#b8524a" stroke-width="1.8" fill="none" stroke-linecap="round"/>`)
    : (E
      ? `<path d="M54,45.5 Q60,50 66,45.5" stroke="${hair}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
      : `<path d="M56,46.5 Q60,49 64,46.5" stroke="${hair}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`);
  // 头饰:SJ=乌纱 | N系 J=进贤方冠 P=逍遥巾飘带 | SP=发髻+背后斗笠
  // 女版头饰:SJ=高髻金步摇 | N系 J=单髻玉簪 P=双环髻飘带 | SP=高髻红绳+背后斗笠
  let headwear = '';
  if (F) {
    if (grp === 'SJ') {
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
  } else if (grp === 'SJ') {
    headwear = `<polygon points="47,21 73,21 70,9 50,9" fill="${hair}"/><polygon points="60,9 70,9 73,21 60,21" fill="${hairL}"/>
      <polygon points="43,21 77,21 75,26 45,26" fill="${hair}"/>
      <polygon points="18,19 42,18 42,24 20,25" fill="${hair}"/><polygon points="78,18 102,19 100,25 78,24" fill="${hairL}"/>`;
  } else if (N && J) {
    headwear = `<polygon points="52,14 68,14 66,4 54,4" fill="${C.dd}"/><polygon points="60,4 66,4 68,14 60,14" fill="${C.d}"/>
      <polygon points="50,14 70,14 69,18 51,18" fill="${C.acc}"/>
      <line x1="47" y1="16" x2="73" y2="16" stroke="${hairL}" stroke-width="1.2"/>`;
  } else if (N && !J) {
    // v3.3.2: 飘带改单条连体(原两截式尾三角悬空似污点),左侧束带锚进发髻不外飘
    headwear = `<polygon points="60,3 68,10 60,16 52,10" fill="${hair}"/><polygon points="60,3 68,10 60,13" fill="${hairL}"/>
      <polygon points="66,8 82,5 94,10 90,14 80,10 68,13" fill="${C.acc}"/>
      <line x1="53" y1="10" x2="61" y2="12" stroke="${C.acc}" stroke-width="2.2" stroke-linecap="round"/>`;
  } else { // SP:发髻+背后斗笠
    headwear = `<polygon points="60,3 68,10 60,16 52,10" fill="${hair}"/><polygon points="60,3 68,10 60,13" fill="${hairL}"/>
      <polygon points="78,26 108,30 92,52 80,44" fill="#c9a86a"/><polygon points="78,26 92,52 84,50 76,36" fill="#b08e50"/>
      <line x1="82" y1="30" x2="70" y2="60" stroke="#8b6f47" stroke-width="1.6"/>`;
  }
  // 腰佩:T=剑柄 / F=玉环流苏
  const waist = T
    ? `<g transform="rotate(20 31 106)"><circle cx="31" cy="95" r="2" fill="#c9b96a"/><polygon points="29,96 33,96 32,105 30,105" fill="#6b5b46"/><polygon points="25,104 37,103 36,107 26,108" fill="#c9b96a"/></g>`
    : `<circle cx="33" cy="112" r="3.8" fill="none" stroke="#79a88b" stroke-width="2.2"/><line x1="33" y1="116" x2="31" y2="126" stroke="#79a88b" stroke-width="1.5"/><line x1="33" y1="116" x2="35" y2="125" stroke="#79a88b" stroke-width="1.5"/><line x1="33" y1="116" x2="33" y2="127" stroke="#c1432f" stroke-width="1.5"/>`;
  // 披帛(E 独有,亮色绕肩)
  const sash = E
    ? `<polygon points="44,68 50,70 43,104 37,102" fill="${C.acc}" opacity="0.85"/><polygon points="76,68 70,70 77,104 83,102" fill="${C.acc}" opacity="0.85"/>`
    : '';
  const prop: Record<string, string> = {
    NT: `<g transform="rotate(14 92 98)"><polygon points="92,96 82,74 92,70 102,74" fill="#fbf7ee" stroke="${C.d}" stroke-width="1.2"/><polygon points="92,96 92,70 102,74" fill="${paperD}"/><line x1="92" y1="96" x2="92" y2="107" stroke="#8b6f47" stroke-width="2.8" stroke-linecap="round"/></g>`,
    NF: `<g><polygon points="46,96 74,94 75,103 47,105" fill="${paper}"/><polygon points="60,95 74,94 75,103 60,104" fill="${paperD}"/><polygon points="43,95 48,95 48,106 43,106" fill="#cbbc9c"/><polygon points="72,94 77,94 77,104 72,104" fill="#cbbc9c"/></g>`,
    SJ: `<g transform="rotate(-6 60 100)"><polygon points="55,91 65,90 67,110 53,111" fill="${paper}"/><polygon points="60,90.5 65,90 67,110 60,110.5" fill="${paperD}"/></g>`,
    SP: `<g><polygon points="90,86 95,92 90,97 85,92" fill="#b5651d"/><polygon points="90,95 97,102 90,109 83,102" fill="#b5651d"/><polygon points="90,95 97,102 90,109" fill="#9a5518"/><line x1="90" y1="88" x2="82" y2="79" stroke="#c1432f" stroke-width="1.6"/></g>`,
  };
  return `<svg viewBox="0 0 120 150" width="118" height="148" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${t}·${C.label}">
  <ellipse cx="60" cy="142" rx="34" ry="5.5" fill="rgba(0,0,0,0.09)"/>
  <polygon points="12,58 22,50 30,56 40,51 44,59 28,64" fill="${C.acc}" opacity="0.30"/>
  <polygon points="84,42 94,35 101,41 110,37 112,45 96,49" fill="${C.acc}" opacity="0.22"/>
  <polygon points="60,62 80,72 86,132 60,140" fill="${RD}"/>
  <polygon points="60,62 40,72 34,132 60,140" fill="${RM}"/>
  <polygon points="40,72 34,132 22,127 32,79" fill="${RD}"/>
  <polygon points="80,72 86,132 98,127 88,79" fill="${RL}"/>
  ${F ? `<polygon points="34,132 60,140 86,132 91,139 60,147 29,139" fill="${RD}"/><polygon points="60,140 86,132 91,139 60,147" fill="${RM}" opacity="0.55"/>` : ''}
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
  <polygon points="60,22.5 61.6,25 60,27.5 58.4,25" fill="#c1432f" opacity="0.65"/>` : ''}
  <polygon points="45,43 50,42 49,47" fill="#e8a898" opacity="0.6"/>
  <polygon points="75,43 70,42 71,47" fill="#e8a898" opacity="0.6"/>
</svg>`;
}

const DM_LABEL: Record<string,string> = {甲:'参天大树·甲木人',乙:'花草藤蔓·乙木人',丙:'太阳之火·丙火人',丁:'烛火星光·丁火人',戊:'高山厚土·戊土人',己:'田园之土·己土人',庚:'刀剑之金·庚金人',辛:'珠玉之金·辛金人',壬:'江河之水·壬水人',癸:'雨露之水·癸水人'};
function chartToFlatMbti(chart:any, currentYear?:number): Record<string,any> {
  const out: Record<string,any> = {};
  const bi = chart.bazi.birthInfo, bz = chart.bazi, en = bz.enrichment||{};
  const p2=(n:number)=>String(n).padStart(2,'0');
  out['meta.solar_date']=`${bi.year}-${p2(bi.month)}-${p2(bi.day)} ${p2(bi.hour)}:${p2(bi.minute)}`;
  out['meta.gender']=bi.gender==='male'?'男':'女';
  out['meta.name']='命主';
  for (const k of ['year','month','day','hour']) {
    const gz=bz.siZhu[k];
    out[`bazi.${k}.gan`]=gz.gan; out[`bazi.${k}.zhi`]=gz.zhi;
    out[`bazi.${k}.gan_wx`]=GAN_WX[gz.gan]||'-'; out[`bazi.${k}.zhi_wx`]=ZHI_WX[gz.zhi]||'-';
  }
  const bw = en.八维结构;
  out['mbti.type']=bw?.最像类型||'-'; out['mbti.alt']=bw?.备选类型||'-'; out['mbti.alt2']=bw?.备选2||'—'; out['mbti.conf']=bw?.置信||'-';
  out['mbti.dom']=bw?.主导||'-'; out['mbti.aux']=bw?.辅助||'-';
  out['mbti.dm_label']=DM_LABEL[bz.siZhu.day.gan]||'命主';
  const top=(bw?.八维||[])[0];
  out['mbti.bars_rows_html']=(bw?.八维||[]).map((x:any,i:number)=>
    `<div class="bar-row${i===0?' top':''}"><span class="fn">${x.功能}</span><span class="desc">${x.说明}</span><span class="track"><span class="fill" style="width:${Math.min(100,x.百分比*3)}%"></span></span><span class="pct">${x.百分比}%</span></div>`).join('');
  out['mbti.tagline']='-';
  out['mbti.diff_section_html']='';
  out['mbti.char_svg'] = guFengCharSvg(bw?.最像类型 || 'XXXX', bi.gender);
  return out;
}
function analysisToFlatMbti(a:any, chart:any): Record<string,any> {
  const out:Record<string,any>={};
  if(a?.meta?.name)out['meta.name']=a.meta.name;
  if(a?.mbti_tagline)out['mbti.tagline']=a.mbti_tagline;
  for (const k of ['overview_html','sanguan_html','friends_html','love_html','work_html','family_html','hobbies_html'])
    out[`m.${k}`]=a?.[k]!=null?a[k]:'-';
  const tested=(a?.meta?.tested_mbti||'').toUpperCase().trim();
  const type=chart?.bazi?.enrichment?.八维结构?.最像类型||'';
  if (/^[EI][NS][TF][JP]$/.test(tested) && a?.diff_html) {
    const dv = a?.diff_verdict || '';
    out['mbti.diff_section_html']=`<section class="section"><h2><span class="num-box">09</span><svg class="sec-ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12,3 a4.5,4.5 0 0 0 0,9 a4.5,4.5 0 0 1 0,9"/><circle cx="12" cy="7.5" r="1.2" fill="var(--indigo)" stroke="none"/><circle cx="12" cy="16.5" r="1.2" stroke="none" fill="var(--paper)"/></svg>当实测遇上底盘 <small>（你提供的实测类型 × 盘面结构）</small></h2><div class="diff-hero"><span class="dt num">${tested}</span><span class="dx">×</span><span class="dt dt2 num">${type}</span></div>${dv ? `<div class="diff-verdict">${dv}</div>` : ''}<div class="prose">${a.diff_html}</div></section>`;
  }
  return out;
}

function renderTemplate(template: string, data: Record<string, any>): string {
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
    console.error('Usage: npx tsx render.ts --chart=chart.json [--analysis=analysis.json] --template=path/to/template.html [--output=out.html] [--mode=zonghe|bazi|mbti] [--currentYear=YYYY] [--name=命主姓名] [--testedMBTI=XXXX]');
    process.exit(1);
  }
  const chart = JSON.parse(fs.readFileSync(args.chart, 'utf-8'));
  const analysis = args.analysis ? JSON.parse(fs.readFileSync(args.analysis, 'utf-8')) : {};
  const template = fs.readFileSync(args.template, 'utf-8');

  const mode = args.mode || 'zonghe';
  let data: Record<string, any>;
  if (mode === 'mbti') {
    data = { ...chartToFlatMbti(chart, args.currentYear ? +args.currentYear : undefined), ...analysisToFlatMbti(analysis, chart) };
    if (args.testedMBTI && !data['mbti.diff_section_html'] && analysis?.diff_html) {
      const t = String(args.testedMBTI).toUpperCase();
      if (/^[EI][NS][TF][JP]$/.test(t)) data['mbti.diff_section_html'] = `<section class="section"><h2><span class="num-box">09</span><svg class="sec-ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12,3 a4.5,4.5 0 0 0 0,9 a4.5,4.5 0 0 1 0,9"/><circle cx="12" cy="7.5" r="1.2" fill="var(--indigo)" stroke="none"/><circle cx="12" cy="16.5" r="1.2" stroke="none" fill="var(--paper)"/></svg>当实测遇上底盘</h2><div class="diff-hero"><span class="dt num">${t}</span><span class="dx">×</span><span class="dt dt2 num">${data['mbti.type']}</span></div>${analysis.diff_verdict ? `<div class="diff-verdict">${analysis.diff_verdict}</div>` : ''}<div class="prose">${analysis.diff_html}</div></section>`;
    }
  } else if (mode === 'bazi') {
    const chartFlat = chartToFlatBazi(chart, args.currentYear ? +args.currentYear : undefined);
    const analysisFlat = analysisToFlatBazi(analysis);
    // v2.3: 算法已裁决的字段忽略 analysis 同名产出(同盘可复现)
    if (chartFlat['__algo_yongshen']) {
      for (const k of ['yongshen.yong_html','yongshen.xi_text','yongshen.ji_html','yongshen.tiaohou_html','yongshen.divergence_note',
                       'kaiyun.yong_html','kaiyun.fang_html','kaiyun.se_html','kaiyun.shu_html','kaiyun.tiaohou_html']) delete analysisFlat[k];
      delete chartFlat['__algo_yongshen'];
    }
    if (chartFlat['__algo_luck']) {
      for (const k of Object.keys(analysisFlat)) if (/\.(luck_class)$/.test(k)) delete analysisFlat[k];
      delete chartFlat['__algo_luck'];
    }
    data = { ...chartFlat, ...analysisFlat };
  } else {
    data = { ...chartToFlat(chart, args.currentYear ? +args.currentYear : undefined), ...analysisToFlat(analysis) };
  }

  if (args.name) data['meta.name'] = args.name; // --name 兜底(analysis 未给姓名时)
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
  } else {
    process.stdout.write(html);
  }
}

main();

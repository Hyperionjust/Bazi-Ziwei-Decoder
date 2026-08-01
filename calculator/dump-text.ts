// 把 run-chart.ts 的 JSON 输出转成文墨天机风格树状文本
// 用法:
//   npx tsx dump-text.ts --input=chart.json [--output=chart.txt]
//   不指定 --output 则打印到 stdout

import * as fs from 'fs';

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  for (const a of process.argv.slice(2)) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  }
  return args;
}

function padRight(s: string, n: number): string {
  // 中文字符按宽度 2 计算
  let w = 0;
  for (const ch of s) w += /[一-龥＀-￿]/.test(ch) ? 2 : 1;
  return s + ' '.repeat(Math.max(0, n - w));
}

// ⚠ 时辰临界提示块(P0-A) — boundary:true 时置于文本盘最顶部(给 LLM 的幕后施工图)
function dumpShichenBoundary(b: any): string[] {
  const sb = b?.enrichment?.时辰边界;
  if (!sb || !sb.boundary) return [];
  const lines: string[] = [];
  const dir = sb.距交界分钟 >= 0 ? `交界后 ${sb.距交界分钟} 分钟` : `交界前 ${-sb.距交界分钟} 分钟`;
  lines.push('⚠ 时辰临界〔幕后施工图:未核盘前不进入解读——按 SKILL.md「时辰临界核盘」分支处理〕');
  lines.push(`│ ├排盘时刻 ${sb.排盘时刻} 距时辰交界 ${sb.最近交界} 仅 ${Math.abs(sb.距交界分钟)} 分钟(${dir})`);
  lines.push(`│ ├候选时辰A(当前盘) : ${sb.当前时辰}`);
  if (sb.候选时辰) lines.push(`│ ├候选时辰B : ${sb.候选时辰.名}(${sb.候选时辰.区间}) — ${sb.候选时辰.说明}`);
  lines.push(`│ ├判定口径 : ${sb.口径}`);
  if (sb.solar_note) lines.push(`│ ├solar_note : ${sb.solar_note}`);
  lines.push('│ └处理 : ①追问出生地(城市即可)换算经度重排;或②按两个候选时辰各排一盘,请用户报 2~3 个过往大事年份,用运岁引动对照选盘。用户明确坚持当前时间则继续,置信度按低档处理。');
  lines.push('');
  return lines;
}

function dumpZiwei(z: any, bi: any): string[] {
  const lines: string[] = [];
  lines.push('紫微斗数命盘');
  lines.push('│');
  lines.push('├基本信息');
  lines.push(`│ ├性别 : ${bi.gender === 'male' ? '男' : '女'}`);
  lines.push(`│ ├阳历 : ${bi.year}-${String(bi.month).padStart(2,'0')}-${String(bi.day).padStart(2,'0')} ${String(bi.hour).padStart(2,'0')}:${String(bi.minute).padStart(2,'0')}`);
  if (z.lunarDate) {
    lines.push(`│ ├农历 : ${z.lunarDate.year}年${z.lunarDate.monthCn}月${z.lunarDate.dayCn}`);
  }
  if (z.siZhu) {
    const sz = z.siZhu;
    lines.push(`│ ├节气四柱 : ${sz.year.gan}${sz.year.zhi} ${sz.month.gan}${sz.month.zhi} ${sz.day.gan}${sz.day.zhi} ${sz.hour.gan}${sz.hour.zhi}`);
  }
  lines.push(`│ ├阴阳 : ${z.yinYang || ''}`);
  lines.push(`│ ├五行局 : ${z.wuXingJu?.name || ''}`);
  const DIZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const mingDizhi = z.gongs[0]?.dizhi;
  const shenDizhi = DIZHI[z.shenGongIndex];
  lines.push(`│ └命宫=${mingDizhi}  身宫=${shenDizhi}`);
  lines.push('│');

  // 生年四化汇总
  const allSihua: string[] = [];
  for (const g of z.gongs) {
    for (const s of g.sihua || []) {
      allSihua.push(`${s.star}${s.hua}`);
    }
  }
  if (allSihua.length > 0) {
    lines.push('├生年四化');
    lines.push(`│ └${allSihua.join(' · ')}`);
    lines.push('│');
  }

  // 十二宫
  lines.push('├命盘十二宫');
  z.gongs.forEach((g: any, idx: number) => {
    const isLast = idx === z.gongs.length - 1;
    const prefix = isLast ? '│ └' : '│ ├';
    const childPrefix = isLast ? '│   ' : '│ │ ';
    const isMing = g.gong === '命宫';
    const isShen = g.dizhi === shenDizhi;
    const marks: string[] = [];
    if (isMing) marks.push('[命]');
    if (isShen && !isMing) marks.push('[身]');
    const gongName = g.gong.endsWith('宫') ? g.gong : g.gong + '宫';
    lines.push(`${prefix}${gongName}[${g.tiangan}${g.dizhi}]${marks.join('')}`);
    const main = g.mainStars && g.mainStars.length > 0 ? g.mainStars.join('·') : '无主星';
    lines.push(`${childPrefix}├主星 : ${main}`);
    const aux = g.auxStars && g.auxStars.length > 0 ? g.auxStars.join('·') : '无';
    lines.push(`${childPrefix}├辅星 : ${aux}`);
    if (g.sihua && g.sihua.length > 0) {
      lines.push(`${childPrefix}├生年四化 : ${g.sihua.map((s:any)=>s.star+s.hua).join('·')}`);
    }
    if (g.daXian) {
      const dxMark = g.daXian.isCurrent ? '★当前' : '';
      lines.push(`${childPrefix}├大限 : ${g.daXian.startAge}-${g.daXian.endAge}虚岁${dxMark ? ' ' + dxMark : ''}`);
    }
    if (g.liuNian && g.liuNian.length > 0) {
      // v3.12 批E3:流年落宫=大限区间逐年展开,原样列 10 个数字纯噪音(全盘 120 个),压成区间
      lines.push(`${childPrefix}└流年 : ${g.liuNian[0]}-${g.liuNian[g.liuNian.length - 1]}虚岁逐年落此宫`);
    }
    if (!isLast) lines.push('│ │');
  });

  return lines;
}

function dumpBazi(b: any, bi: any): string[] {
  const lines: string[] = [];
  lines.push('');
  lines.push('八字命盘');
  lines.push('│');

  // 晚子时约定提示(P0-B) — 出生 23:00-24:00 时渲染;解读层须向用户白话披露(不出字段名)
  const zc = b.zishi_convention;
  if (zc) {
    lines.push(`├⚠晚子时约定〔须向用户白话披露〕: 出生于 ${zc.window},本盘按【${zc.约定}】排盘`);
    lines.push(`│ └${zc.说明}`);
    lines.push('│');
  }

  // 四柱表
  const sz = b.siZhu;
  const ss = b.shiShen;
  const zs = b.zhangSheng || {};
  const zz = b.enrichment?.自坐 || {};
  const ny = b.naYin || {};
  const cg = b.cangGan || {};

  lines.push('├四柱');
  const cols = ['年','月','日','时'];
  const pillarKeys = ['year','month','day','hour'];
  const cangGanFmt = (pk: string): string => {
    const arr = cg[pk];
    if (!Array.isArray(arr)) return '';
    return arr.map((x:any)=>`${x.gan}(${x.shiShen||''})`).join(' ');
  };
  for (let i = 0; i < 4; i++) {
    const isLast = i === 3;
    const pre = isLast ? '│ └' : '│ ├';
    const subPre = isLast ? '│   ' : '│ │ ';
    const pk = pillarKeys[i];
    const sx = ss[pk] || '';
    const isDay = pk === 'day';
    const tag = isDay ? `[日主]` : `[${sx}]`;
    lines.push(`${pre}${cols[i]}柱 : ${sz[pk].gan}${sz[pk].zhi} ${tag}`);
    if (cg[pk]) lines.push(`${subPre}├藏干 : ${cangGanFmt(pk)}`);
    lines.push(`${subPre}├星运 : ${zs[pk] || '-'}`);
    lines.push(`${subPre}├自坐 : ${zz[cols[i]] || zz[pk] || '-'}`);
    lines.push(`${subPre}└纳音 : ${ny[pk] || '-'}`);
    if (!isLast) lines.push('│ │');
  }
  lines.push('│');

  // 大运
  if (b.dayun && b.dayun.length > 0) {
    lines.push(`├大运 (起运 ${b.dayunStart}岁 · 面向用户提及大运边界时照抄下行「起年-止年 年(约X-X岁)」年份为主格式)`);
    b.dayun.slice(0, 10).forEach((d: any, i: number) => {
      const isLast = i === Math.min(9, b.dayun.length - 1);
      const pre = isLast ? '│ └' : '│ ├';
      const dxTag = `${d.ganShiShen||''}/${d.zhiShiShen||''}`;
      lines.push(`${pre}${d.startYear}-${d.endYear} 年(约${d.startAge}-${d.endAge}岁)  ${d.ganZhi.gan}${d.ganZhi.zhi}  (${dxTag})`);
    });
    lines.push('│');
  }

  // 罕象块(v2.5) — 解读层在神煞/合冲刑害章须优先讲解
  const rare = b.enrichment?.罕象;
  if (rare && Array.isArray(rare) && rare.length > 0) {
    lines.push(`├罕象 ⭐(${rare.length}项·神煞与合冲刑害章须优先讲解,按罕见度降序)`);
    rare.forEach((r: any, i: number) => {
      const last = i === rare.length - 1;
      lines.push(`${last ? '│ └' : '│ ├'}【${r.罕见度}】${r.名} — ${r.涉及} — ${r.说明}`);
    });
    lines.push('│');
  }

  // 神煞块 (T1: 算法层全集 / 流派镜片) — 神煞只增色, 不定大局
  const ss2 = b.enrichment?.神煞;
  if (ss2) {
    const active = (ss2.lineage ? ss2.lineage.hits : ss2.hits) || [];
    const title = ss2.lineage
      ? `├神煞 (按【${ss2.lineage.name}】镜片 · ${active.length}项; 中立全集 ${(ss2.hits||[]).length}项)`
      : `├神煞 (全集·流派中立 · ${active.length}项)`;
    lines.push(title);
    const polCn: Record<string,string> = { '吉':'吉', '凶':'凶', '中性':'中' };
    const review: string[] = [];
    if (active.length === 0) {
      lines.push('│ └(本盘按当前镜片无命中神煞)');
    } else {
      active.forEach((h: any, i: number) => {
        const last = i === active.length - 1;
        const pre = last ? '│ └' : '│ ├';
        const where = (h.pillars || []).join('') || '-';
        const via = h.via ? `  (via ${h.via})` : '';
        const flag = h.needs_review ? '  ⚠起法待核' : '';
        let lwStr = '';
        if (h.lineage_weights) {
          const zh: string[] = [], can: string[] = [], no: string[] = [];
          for (const [cn, w] of Object.entries(h.lineage_weights as Record<string, number>)) {
            if (w >= 2) zh.push(cn); else if (w >= 1) can.push(cn); else no.push(cn);
          }
          const seg: string[] = [];
          if (zh.length) seg.push(`重用:${zh.join('·')}`);
          if (can.length) seg.push(`参用:${can.join('·')}`);
          // v3.12 批E4:「不用」列满四派的长尾(MODERN 层常态)压成一词——原样重复 9 次很占 token
          if (no.length) seg.push(no.length >= 4 ? '四派均不用' : `不用:${no.join('·')}`);
          lwStr = `  〔派系侧重 ${seg.join(' / ')}〕`;
        }
        lines.push(`${pre}${h.name} [${h.tier}·${polCn[h.polarity]||h.polarity}] @${where}${via}${flag}${lwStr}`);
        if (h.classical_check) lines.push(`│   ↳ ${h.classical_check}`);
        if (h.needs_review) review.push(h.name);
      });
      if (review.length) lines.push(`│   ⚠ 起法待核(落地前以文献定版): ${review.join('、')}`);
    }
    lines.push('│');
  }

  // enrichBazi 补层
  const en = b.enrichment;
  if (en) {
    lines.push('├算法补层 〔幕后施工图:以下机制信息(依据/审计/协议/侧重/rubric)仅供你推理,严禁向用户展示或解释;用户只看结论〕');
    // 全局置信度(P0-C) — low 档时全部预测性章节按保守口径(见 bazi-prompt「置信度传播」)
    const ct = en.confidence_tier;
    if (ct) {
      lines.push(`│ ├全局置信度(confidence_tier·预测性章节按此档定措辞) : ${ct.tier} — ${(ct.依据 || []).join(';')}`);
      // S3 批2: 四维分档 — 论断类型各取各档,不与总档连坐(取维映射见 bazi-prompt「置信度传播」)
      const dims = ct.维度;
      if (dims) {
        const KEYS = ['旺衰', '格局', '调候', '应期'] as const;
        const dimStr = KEYS.map(k => `${k}:${dims[k]}`).join(' ');
        const notHigh = KEYS.filter(k => dims[k] !== 'high');
        const why = notHigh.length ? ` — ${notHigh.map(k => `${k}=${(ct.维度依据 || {})[k] || ''}`).join(';')}` : '';
        lines.push(`│ │ ${ct.tier === 'low' ? '├' : '└'}分维(按论断类型取档:旺衰→性格强弱/精力,格局→层次/事业结构,调候→季节体感/寒燥调理,应期→年份窗口) : ${dimStr}${why}`);
      }
      if (ct.tier === 'low') lines.push('│ │ └⚠ low 档强制: 事业/财运/婚恋/大运流年多用条件句,应期给区间不给单年,禁「必然/一定会/肯定会/铁定」类断语;锚点白话声明一次保守口径;分维为 high 的论断类型可保持正常锐度(锚点声明仍出)');
    }
    // 用神建议(v2.2 算法层裁决,LLM 只转述不取舍)
    const ya = en.用神建议;
    if (ya) {
      lines.push('│ ├用神建议(算法层三线裁决·解读只转述不得自创)');
      lines.push(`│ │ ├扶抑线 : 取[${(ya.扶抑?.取||[]).join('')}] 忌[${(ya.扶抑?.忌||[]).join('')}] — ${ya.扶抑?.依据||''}${ya.扶抑?.临界?' ⚠临界':''}`);
      lines.push(`│ │ ├调候线 : 取[${(ya.调候?.取||[]).join('')}](${(ya.调候?.取干||[]).join('')}) — ${ya.调候?.依据||''}`);
      lines.push(`│ │ ├格局线 : 取[${(ya.格局?.取||[]).join('')}] — ${ya.格局?.依据||''}(置信度:${ya.格局?.置信度||'-'})`);
      lines.push(`│ │ ├收敛 : ${ya.收敛?'✓ 共识用神['+(ya.共识用神||[]).join('')+']':'✗ 不收敛'} | 边界盘 : ${ya.边界盘?'是':'否'}`);
      if (ya.出口) lines.push(`│ │ ├出口(单值裁决) : 开运用神[${(ya.出口.开运用神||[]).join('')}] 喜[${(ya.出口.喜神||[]).join('')}] 忌[${(ya.出口.忌神||[]).join('')||'无(临界)'}] 调候[${ya.出口.调候提示||'-'}]${ya.出口.divergence?'  '+ya.出口.divergence:''}${ya.出口.缺补说明?'  〔'+ya.出口.缺补说明+'〕':''}`);
      // S1-2:两轴对同一五行唱反调时,必须让解读层看见——否则会写出「宜X」与「忌X」并列的自相矛盾文案
      const zc = ya.出口?.轴冲突;
      if (zc) {
        lines.push(`│ │ ├⚠轴冲突〔调候∩出口忌〕: ${zc.五行.join('、')} — 同一个五行在两条线上唱反调`);
        lines.push(`│ │ │ ├调候侧 : ${zc.调候侧}`);
        lines.push(`│ │ │ ├扶抑侧 : ${zc.扶抑侧}`);
        lines.push(`│ │ │ └出文要求 : ${zc.出文要求}`);
      }
      // S1-3:出口拆〔格局相神/扶抑忌〕——身旺侧重神盘的裁决结论,解读层照抄不得改判
      const cj = ya.出口?.相神裁决;
      if (cj) {
        lines.push(`│ │ ├⚖相神裁决〔S1-3·格局相神/扶抑忌〕: 相神[${cj.格局相神.join('、')}] — 重神:${cj.重神}`);
        lines.push(`│ │ │ ├改法 : ${cj.改法}${cj.自扶抑忌救回.length ? `(${cj.自扶抑忌救回.join('、')}自扶抑忌清单救回)` : ''}`);
        lines.push(`│ │ │ ├所制之神 : ${cj.所制之神.五行} — ${cj.所制之神.处置}`);
        if (cj.比劫处置) lines.push(`│ │ │ ├比劫处置 : ${cj.比劫处置}`);
        lines.push(`│ │ │ ├依据 : ${cj.依据}`);
        lines.push(`│ │ │ └出文要求 : ${cj.出文要求}`);
      }
      lines.push(`│ │ └出文协议 : ${ya.出文协议||''}`);
    }
    // 八维结构(v2.8:MBTI 语言映射,「最像类型」照抄)
    const bw = en.八维结构;
    if (bw) {
      lines.push(`│ ├八维结构(荣格八维·MBTI映射参考·类型照抄) : 最像【${bw.最像类型}】备选【${bw.备选类型}】置信${bw.置信} — 主导${bw.主导}/辅助${bw.辅助}`);
      lines.push(`│ │ ├八维: ${bw.八维.map((x: any) => `${x.功能}${x.百分比}%`).join(' ')}`);
      if (bw.依据) lines.push(`│ │ ├依据: ${bw.依据}`);
      lines.push(`│ │ └声明: ${bw.声明}`);
    }
    // 正缘倾向(v2.6:画像年龄照抄本判定,不得自行裁量)
    const zy = en.正缘倾向;
    if (zy) {
      lines.push(`│ ├正缘倾向(算法判定·画像年龄照抄) : 【${zy.年龄倾向}】置信${zy.置信} — ${zy.夫妻星}:${zy.星位};宫坐${zy.宫坐} — ${zy.依据}`);
    }
    lines.push(`│ ├格局 : ${en.格局?.primary || '-'}  (置信度: ${en.格局?.confidence || '-'})`);
    if (en.格局?.basis) lines.push(`│ │ └依据 : ${en.格局.basis}`);
    if (en.格局?.notes && en.格局.notes.length) {
      for (const note of en.格局.notes) lines.push(`│ │ └备注 : ${note}`);
    }
    const ws = en.旺衰;
    if (ws) {
      const lvl = ws.verdict || ws.level || '-';
      const score = ws.score !== undefined ? `score=${ws.score}` : '';
      lines.push(`│ ├旺衰 : ${lvl}  (${score}, 置信度: ${ws.confidence || '-'})`);
      if (ws.breakdown) {
        const b = ws.breakdown;
        lines.push(`│ │ └七项账本 : 得令${b.得令 ?? 0} 长生${b.长生 ?? 0} 得地${b.得地 ?? 0} `
          + `得势${b.得势 ?? 0} 会局${b.会局 ?? 0} 耗方群势${b.耗方群势 ?? 0} `
          + `冲根修正${b.冲根修正 ?? 0}`);
      }
    }
    if (en.调候用神) lines.push(`│ ├调候用神 : ${en.调候用神.join('、')}`);
    // J1(v3.11.0) 调候条例 — 典籍条件树对本盘的命中清单。
    //   这是【层2 典籍论断】的原样搬运:名/则/档 照录,不改写。
    //   给解读层的硬约束写在提示词里(不得引用未命中的条例名;档位不写成宿命断语);
    //   「意象」是概念级素材,不是句式模板——同一条例在不同盘上必须结合本盘语境重写。
    const tl = en.调候条例;
    if (tl?.有条例) {
      lines.push(`│ ├调候条例〔${tl.格}·${tl.级别 || '待核'}〕 : 命中 ${tl.命中.length}/${tl.命中.length + tl.未命中} 条  上${tl.档位计.上} 中${tl.档位计.中} 下${tl.档位计.下} 忌${tl.档位计.忌}`);
      if (tl.命中.length === 0) lines.push('│ │ ├(本盘未命中任何条例 — 解读层不得引用任何条例名)');
      for (const h of tl.命中 as any[]) {
        lines.push(`│ │ ├[${h.档}] ${h.显示名} : ${h.则}`);
        // 细化于的两种关系含义相反:子集=与母条同时命中(同一件事被计了两次);互斥=母条的例外,永不同时命中。
        const 细 = h.细化于
          ? `  (细化于 ${h.细化于}${h.关系 === '互斥' ? '·互斥:是母条的例外,母条此时未命中'
              : h.关系 === '子集' ? '·子集:与母条讲同一件事,勿重复计' : ''})` : '';
        lines.push(`│ │ │ ├若 : ${h.若}${细}`);
        if (h.蕴含?.length) lines.push(`│ │ │ ├蕴含 : 本条命中则必同时命中 ${h.蕴含.join('、')} — 同一件事,档位计已各计一次,叙述勿重复`);
        if (h.意象) lines.push(`│ │ │ ├意象素材 : ${h.意象}   ⚠概念级素材,非句式模板;须结合本盘格局/十神/大运语境重写`);
        if (h.判定备注) lines.push(`│ │ │ ├判定备注 : ${h.判定备注}`);
        if (h.两系分歧) lines.push(`│ │ │ ├⚖两系分歧 : ${h.两系分歧}`);
        lines.push(`│ │ │ └id : ${h.id}`);
      }
      for (const b of (tl.病 || [])) {
        if (b.在盘) lines.push(`│ │ ├病〔典籍明指〕: ${b.字}${b.透 ? '(透干)' : '(藏支)'} — ${b.依据}`);
      }
      if (tl.两系分歧?.length) for (const dv of tl.两系分歧) lines.push(`│ │ ├⚖本格两系分歧 : ${dv}`); // 批E2:后面恒有档位口径行,不该用 └
      lines.push(`│ │ └档位口径 : 上/中/下/忌是典籍的判断,不是实证;解读须转写为倾向性表述,不得写成宿命断语`);
    } else if (tl) {
      lines.push(`│ ├调候条例〔${tl.格}〕 : 该格尚未吸收(造化元钥吸收工程分批进行,见 docs/工单-v3.11) — 解读层不得凭空引用条例名`);
    }
    if (en.五行旺相) {
      const ws5 = en.五行旺相;
      lines.push(`│ ├五行旺相 : 木${ws5.木} 火${ws5.火} 土${ws5.土} 金${ws5.金} 水${ws5.水}`);
    }
    if (en.五行统计) {
      const s = en.五行统计.surface || en.五行统计;
      const w = en.五行统计.withCangGan;
      if (s) lines.push(`│ ├五行统计(surface) : 木${s.木||0} 火${s.火||0} 土${s.土||0} 金${s.金||0} 水${s.水||0}`);
      // 批E1:含藏干加权分是浮点累加,原样输出会带 1.9000000000000001 之类的渣,统一一位小数
      const f1 = (x: any) => +((+x || 0).toFixed(1));
      if (w) lines.push(`│ ├五行统计(含藏干) : 木${f1(w.木)} 火${f1(w.火)} 土${f1(w.土)} 金${f1(w.金)} 水${f1(w.水)}`);
    }
    // 天干关系
    const gr = en.天干关系;
    if (gr && Array.isArray(gr) && gr.length > 0) {
      lines.push('│ ├天干关系');
      gr.forEach((r:any, i:number) => {
        const last = i === gr.length-1;
        const pair = (r.gans || []).join('');
        const pillars = (r.pillars || []).join('-');
        lines.push(`│ │ ${last?'└':'├'}${r.type} : ${pair}  (${pillars}柱)`);
      });
    }
    // 地支关系
    const zr = en.地支关系;
    if (zr && Array.isArray(zr) && zr.length > 0) {
      lines.push('│ ├地支关系');
      zr.forEach((r:any, i:number) => {
        const last = i === zr.length-1;
        const pair = (r.zhi || []).join('');
        const pillars = (r.pillars || []).join('-');
        const extra = r.detail ? `  ${r.detail}` : '';
        lines.push(`│ │ ${last?'└':'├'}${r.type} : ${pair}  (${pillars}柱)${extra}`);
      });
    }
    // 整柱
    const zp = en.整柱;
    if (zp && Array.isArray(zp) && zp.length > 0) {
      lines.push('│ ├整柱判定');
      zp.forEach((p:any, i:number) => {
        const last = i === zp.length-1;
        lines.push(`│ │ ${last?'└':'├'}${p.pillar}柱 ${p.gan}${p.zhi} : ${p.verdict}`);
      });
    }
    // 作用关系(合冲刑害裁决 v1.5)
    const ix = en.作用关系;
    const fmtItems = (items: any[], prefix: string) => {
      items.forEach((r: any, i: number) => {
        const last = i === items.length - 1;
        const mem = (r.members || []).join('');
        const pil = (r.pillars || []).join('-');
        const divg = r.divergence ? `  ⚖分歧:${r.divergence}` : '';
        // S3 批2: 引爆窗口 — 潜伏关系由潜转显的支检索(中立,吉凶随喜忌与裁决定)
        const tw = r.引爆窗口
          ? `  ⏳引爆窗口[${r.引爆窗口.方式}·待${(r.引爆窗口.待 || []).join('/')}]:${(r.引爆窗口.应期 || [])
              .map((a: any) => (a.载体 || '').startsWith('流年') ? `${a.年}${(a.载体 || '').slice(2)}` : a.载体).join('、') || '检索窗口内无应期'}`
          : '';
        lines.push(`${prefix}${last ? '└' : '├'}${r.type} ${mem}(${pil}柱·${r.distance}) 【${r.status}】 ${r.cause}${divg}${tw}`);
      });
    };
    if (ix && Array.isArray(ix.items) && ix.items.length > 0) {
      lines.push(`│ ├作用关系(合冲刑害裁决·${ix.policy || '通则'})`);
      fmtItems(ix.items, '│ │ ');
      if (ix.lineage && Array.isArray(ix.lineage.items) && ix.lineage.items.length > 0) {
        lines.push(`│ ├作用关系·流派视图(${ix.lineage.name}) — ${ix.lineage.policy_note || ''}`);
        fmtItems(ix.lineage.items, '│ │ ');
      }
    }
    // 运岁引动(v1.5)
    const ys = en.运岁引动;
    if (ys) {
      lines.push('│ └运岁引动(大运/流年×原局+岁运互动·中立检测)');
      // v3.10.0 P0: 顺逆双轴 — 此前方向只存在于海报渲染路径,chart.txt 只有引动类型与轻/中/重,
      //   一串「破/自刑/冲/害」天然读成坏消息。现在方向与振幅在这里就给出,海报与长文同源。
      const sn = ys.顺逆;
      const tag = (o: any) => o ? `[${o.方向}/${o.振幅}·${o.合成}${o.事件?.length ? '·' + o.事件.join('/') : ''}]` : '';
      if (sn) {
        lines.push(`│   ├顺逆双轴〔幕后施工图〕: ${sn.说明}`);
        if (Array.isArray(sn.大运) && sn.大运.length)
          lines.push(`│   ├大运方向总览: ${sn.大运.map((x: any) => `${x.起止年} ${x.干支} ${x.方向}/${x.振幅}(用${x.发用 > 0 ? '+' : ''}${x.发用}/体${x.护体})`).join(' | ')}`);
        if (Array.isArray(sn.流年) && sn.流年.length)
          lines.push(`│   ├流年方向总览: ${sn.流年.map((x: any) => `${x.年}${x.干支} ${x.方向}/${x.振幅}(用${x.发用 > 0 ? '+' : ''}${x.发用}/体${x.护体})`).join(' | ')}`);
      }
      if (Array.isArray(ys.建议节点) && ys.建议节点.length) {
        lines.push(`│   ├建议节点(timeline 选点白名单·重级必选): ${ys.建议节点.map((n: any) => `${n.年}(${n.岁}岁)${n.载体}·${n.标记}[${n.权重}]`).join(' / ')}`);
      }
      (ys.大运引动 || []).forEach((d: any) => {
        lines.push(`│   ├大运${d.步} ${d.干支} ${d.年龄} ${tag(d.顺逆)}`);
        d.hits.forEach((h: any, i: number) => {
          const last = i === d.hits.length - 1;
          lines.push(`│   │ ${last ? '└' : '├'}[${h.type}] ${h.desc}`);
        });
      });
      const cd = ys.当前大运流年;
      if (cd && cd.流年 && cd.流年.length > 0) {
        lines.push(`│   └当前大运 ${cd.大运} 流年引动`);
        cd.流年.forEach((y: any, yi: number) => {
          const lastY = yi === cd.流年.length - 1;
          const all = [...(y.vs原局 || []), ...(y.vs大运 || [])];
          lines.push(`│     ${lastY ? '└' : '├'}${y.年} ${y.干支} ${tag(y.顺逆)} : ${all.map((h: any) => `[${h.type}]${h.desc.replace(/^流年/, '')}`).join(' ; ')}`);
        });
      }
    }

    // 流月引动(P1-A) — 仅 --currentYear 时存在;月级窗口选择依据
    const ly = en.流月引动;
    if (ly && Array.isArray(ly.月)) {
      lines.push(`├流月引动 (${ly.年} ${ly.年干支}年 · 按节气分月 · 该年大运 ${ly.大运})`);
      lines.push(`│ ├说明 : ${ly.说明}`);
      ly.月.forEach((m: any, i: number) => {
        const last = i === ly.月.length - 1;
        const all = [...(m.vs原局 || []), ...(m.vs大运 || [])];
        const hitStr = all.length ? all.map((h: any) => `[${h.type}]${h.desc.replace(/^流月/, '')}`).join(' ; ') : '无显著引动';
        const sn = m.顺逆;
        const snStr = sn ? ` [${sn.方向}/${sn.振幅}·${sn.合成}${sn.事件?.length ? '·' + sn.事件.join('/') : ''}]` : '';
        lines.push(`│ ${last ? '└' : '├'}${String(m.序).padStart(2, '0')} ${m.干支}月(${m.节气}起 ${m.公历起}~${m.公历止} 约${m.约农历月})${snStr} : ${hitStr}`);
      });
    }

    // 多年对比(P1-B) — 仅 --compareYears 时存在;比较型流年问答依据
    const cy = en.多年对比;
    if (cy && Array.isArray(cy.年)) {
      lines.push(`├多年对比 (${cy.年.map((e: any) => e.年).join('/')} · 引动+喜忌评分)`);
      lines.push(`│ ├说明 : ${cy.说明}`);
      cy.年.forEach((e: any, i: number) => {
        const last = i === cy.年.length - 1;
        const all = [...(e.vs原局 || []), ...(e.vs大运 || [])];
        const hitStr = all.length ? all.map((h: any) => `[${h.type}]${h.desc.replace(/^流年/, '')}`).join(' ; ') : '无显著引动';
        const heavy = (e.重级引动 || []).length ? `  ⚠重级:${e.重级引动.join('+')}` : '';
        lines.push(`│ ${last ? '└' : '├'}${e.年} ${e.干支} 大运${e.大运} 喜忌[干${e.喜忌对照.干} 支${e.喜忌对照.支} 评分${e.喜忌对照.评分 >= 0 ? '+' : ''}${e.喜忌对照.评分}]${heavy} : ${hitStr}`);
      });
    }
  }
  lines.push('');
  lines.push('└[备注: 本盘由 bazi-ziwei skill 算法层生成 — Yiqi core + enrichBazi 补层]');

  return lines;
}

function main() {
  const args = parseArgs();
  if (!args.input) {
    console.error('Usage: npx tsx dump-text.ts --input=chart.json [--output=chart.txt]');
    process.exit(1);
  }
  const chart = JSON.parse(fs.readFileSync(args.input, 'utf-8'));
  const bi = chart.bazi.birthInfo || chart.ziwei.birthInfo;

  const lines: string[] = [];
  lines.push(...dumpShichenBoundary(chart.bazi));
  lines.push(...dumpZiwei(chart.ziwei, bi));
  lines.push(...dumpBazi(chart.bazi, bi));

  const text = lines.join('\n');

  if (args.output) {
    fs.writeFileSync(args.output, text, 'utf-8');
    console.error(`Text dump written to ${args.output}`);
  } else {
    process.stdout.write(text);
  }
}

main();

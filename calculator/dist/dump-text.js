"use strict";
// 把 run-chart.ts 的 JSON 输出转成文墨天机风格树状文本
// 用法:
//   npx tsx dump-text.ts --input=chart.json [--output=chart.txt]
//   不指定 --output 则打印到 stdout
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
const fs = __importStar(require("fs"));
function parseArgs() {
    const args = {};
    for (const a of process.argv.slice(2)) {
        const m = a.match(/^--([^=]+)=(.*)$/);
        if (m)
            args[m[1]] = m[2];
    }
    return args;
}
function padRight(s, n) {
    // 中文字符按宽度 2 计算
    let w = 0;
    for (const ch of s)
        w += /[一-龥＀-￿]/.test(ch) ? 2 : 1;
    return s + ' '.repeat(Math.max(0, n - w));
}
function dumpZiwei(z, bi) {
    const lines = [];
    lines.push('紫微斗数命盘');
    lines.push('│');
    lines.push('├基本信息');
    lines.push(`│ ├性别 : ${bi.gender === 'male' ? '男' : '女'}`);
    lines.push(`│ ├阳历 : ${bi.year}-${String(bi.month).padStart(2, '0')}-${String(bi.day).padStart(2, '0')} ${String(bi.hour).padStart(2, '0')}:${String(bi.minute).padStart(2, '0')}`);
    if (z.lunarDate) {
        lines.push(`│ ├农历 : ${z.lunarDate.year}年${z.lunarDate.monthCn}月${z.lunarDate.dayCn}`);
    }
    if (z.siZhu) {
        const sz = z.siZhu;
        lines.push(`│ ├节气四柱 : ${sz.year.gan}${sz.year.zhi} ${sz.month.gan}${sz.month.zhi} ${sz.day.gan}${sz.day.zhi} ${sz.hour.gan}${sz.hour.zhi}`);
    }
    lines.push(`│ ├阴阳 : ${z.yinYang || ''}`);
    lines.push(`│ ├五行局 : ${z.wuXingJu?.name || ''}`);
    const DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    const mingDizhi = z.gongs[0]?.dizhi;
    const shenDizhi = DIZHI[z.shenGongIndex];
    lines.push(`│ └命宫=${mingDizhi}  身宫=${shenDizhi}`);
    lines.push('│');
    // 生年四化汇总
    const allSihua = [];
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
    z.gongs.forEach((g, idx) => {
        const isLast = idx === z.gongs.length - 1;
        const prefix = isLast ? '│ └' : '│ ├';
        const childPrefix = isLast ? '│   ' : '│ │ ';
        const isMing = g.gong === '命宫';
        const isShen = g.dizhi === shenDizhi;
        const marks = [];
        if (isMing)
            marks.push('[命]');
        if (isShen && !isMing)
            marks.push('[身]');
        const gongName = g.gong.endsWith('宫') ? g.gong : g.gong + '宫';
        lines.push(`${prefix}${gongName}[${g.tiangan}${g.dizhi}]${marks.join('')}`);
        const main = g.mainStars && g.mainStars.length > 0 ? g.mainStars.join('·') : '无主星';
        lines.push(`${childPrefix}├主星 : ${main}`);
        const aux = g.auxStars && g.auxStars.length > 0 ? g.auxStars.join('·') : '无';
        lines.push(`${childPrefix}├辅星 : ${aux}`);
        if (g.sihua && g.sihua.length > 0) {
            lines.push(`${childPrefix}├生年四化 : ${g.sihua.map((s) => s.star + s.hua).join('·')}`);
        }
        if (g.daXian) {
            const dxMark = g.daXian.isCurrent ? '★当前' : '';
            lines.push(`${childPrefix}├大限 : ${g.daXian.startAge}-${g.daXian.endAge}虚岁 ${dxMark}`);
        }
        if (g.liuNian && g.liuNian.length > 0) {
            lines.push(`${childPrefix}└流年 : ${g.liuNian.join('·')}虚岁`);
        }
        if (!isLast)
            lines.push('│ │');
    });
    return lines;
}
function dumpBazi(b, bi) {
    const lines = [];
    lines.push('');
    lines.push('八字命盘');
    lines.push('│');
    // 四柱表
    const sz = b.siZhu;
    const ss = b.shiShen;
    const zs = b.zhangSheng || {};
    const zz = b.enrichment?.自坐 || {};
    const ny = b.naYin || {};
    const cg = b.cangGan || {};
    lines.push('├四柱');
    const cols = ['年', '月', '日', '时'];
    const pillarKeys = ['year', 'month', 'day', 'hour'];
    const cangGanFmt = (pk) => {
        const arr = cg[pk];
        if (!Array.isArray(arr))
            return '';
        return arr.map((x) => `${x.gan}(${x.shiShen || ''})`).join(' ');
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
        if (cg[pk])
            lines.push(`${subPre}├藏干 : ${cangGanFmt(pk)}`);
        lines.push(`${subPre}├星运 : ${zs[pk] || '-'}`);
        lines.push(`${subPre}├自坐 : ${zz[cols[i]] || zz[pk] || '-'}`);
        lines.push(`${subPre}└纳音 : ${ny[pk] || '-'}`);
        if (!isLast)
            lines.push('│ │');
    }
    lines.push('│');
    // 大运
    if (b.dayun && b.dayun.length > 0) {
        lines.push(`├大运 (起运 ${b.dayunStart}岁)`);
        b.dayun.slice(0, 10).forEach((d, i) => {
            const isLast = i === Math.min(9, b.dayun.length - 1);
            const pre = isLast ? '│ └' : '│ ├';
            const dxTag = `${d.ganShiShen || ''}/${d.zhiShiShen || ''}`;
            lines.push(`${pre}${d.startYear}-${d.endYear}  ${d.ganZhi.gan}${d.ganZhi.zhi}  (${dxTag})`);
        });
        lines.push('│');
    }
    // 神煞块 (T1: 算法层全集 / 流派镜片) — 神煞只增色, 不定大局
    const ss2 = b.enrichment?.神煞;
    if (ss2) {
        const active = (ss2.lineage ? ss2.lineage.hits : ss2.hits) || [];
        const title = ss2.lineage
            ? `├神煞 (按【${ss2.lineage.name}】镜片 · ${active.length}项; 中立全集 ${(ss2.hits || []).length}项)`
            : `├神煞 (全集·流派中立 · ${active.length}项)`;
        lines.push(title);
        const polCn = { '吉': '吉', '凶': '凶', '中性': '中' };
        const review = [];
        if (active.length === 0) {
            lines.push('│ └(本盘按当前镜片无命中神煞)');
        }
        else {
            active.forEach((h, i) => {
                const last = i === active.length - 1;
                const pre = last ? '│ └' : '│ ├';
                const where = (h.pillars || []).join('') || '-';
                const via = h.via ? `  (via ${h.via})` : '';
                const flag = h.needs_review ? '  ⚠起法待核' : '';
                let lwStr = '';
                if (h.lineage_weights) {
                    const zh = [], can = [], no = [];
                    for (const [cn, w] of Object.entries(h.lineage_weights)) {
                        if (w >= 2)
                            zh.push(cn);
                        else if (w >= 1)
                            can.push(cn);
                        else
                            no.push(cn);
                    }
                    const seg = [];
                    if (zh.length)
                        seg.push(`重用:${zh.join('·')}`);
                    if (can.length)
                        seg.push(`参用:${can.join('·')}`);
                    if (no.length)
                        seg.push(`不用:${no.join('·')}`);
                    lwStr = `  〔派系侧重 ${seg.join(' / ')}〕`;
                }
                lines.push(`${pre}${h.name} [${h.tier}·${polCn[h.polarity] || h.polarity}] @${where}${via}${flag}${lwStr}`);
                if (h.classical_check)
                    lines.push(`│   ↳ ${h.classical_check}`);
                if (h.needs_review)
                    review.push(h.name);
            });
            if (review.length)
                lines.push(`│   ⚠ 起法待核(落地前以文献定版): ${review.join('、')}`);
        }
        lines.push('│');
    }
    // enrichBazi 补层
    const en = b.enrichment;
    if (en) {
        lines.push('├算法补层');
        lines.push(`│ ├格局 : ${en.格局?.primary || '-'}  (置信度: ${en.格局?.confidence || '-'})`);
        if (en.格局?.basis)
            lines.push(`│ │ └依据 : ${en.格局.basis}`);
        if (en.格局?.notes && en.格局.notes.length) {
            for (const note of en.格局.notes)
                lines.push(`│ │ └备注 : ${note}`);
        }
        const ws = en.旺衰;
        if (ws) {
            const lvl = ws.verdict || ws.level || '-';
            const score = ws.score !== undefined ? `score=${ws.score}` : '';
            lines.push(`│ ├旺衰 : ${lvl}  (${score}, 置信度: ${ws.confidence || '-'})`);
            if (ws.breakdown) {
                const b = ws.breakdown;
                lines.push(`│ │ └四维 : 得令${b.得令} 长生${b.长生} 得地${b.得地} 得势${b.得势}`);
            }
        }
        if (en.调候用神)
            lines.push(`│ ├调候用神 : ${en.调候用神.join('、')}`);
        if (en.五行旺相) {
            const ws5 = en.五行旺相;
            lines.push(`│ ├五行旺相 : 木${ws5.木} 火${ws5.火} 土${ws5.土} 金${ws5.金} 水${ws5.水}`);
        }
        if (en.五行统计) {
            const s = en.五行统计.surface || en.五行统计;
            const w = en.五行统计.withCangGan;
            if (s)
                lines.push(`│ ├五行统计(surface) : 木${s.木 || 0} 火${s.火 || 0} 土${s.土 || 0} 金${s.金 || 0} 水${s.水 || 0}`);
            if (w)
                lines.push(`│ ├五行统计(含藏干) : 木${w.木 || 0} 火${w.火 || 0} 土${w.土 || 0} 金${w.金 || 0} 水${w.水 || 0}`);
        }
        // 天干关系
        const gr = en.天干关系;
        if (gr && Array.isArray(gr) && gr.length > 0) {
            lines.push('│ ├天干关系');
            gr.forEach((r, i) => {
                const last = i === gr.length - 1;
                const pair = (r.gans || []).join('');
                const pillars = (r.pillars || []).join('-');
                lines.push(`│ │ ${last ? '└' : '├'}${r.type} : ${pair}  (${pillars}柱)`);
            });
        }
        // 地支关系
        const zr = en.地支关系;
        if (zr && Array.isArray(zr) && zr.length > 0) {
            lines.push('│ ├地支关系');
            zr.forEach((r, i) => {
                const last = i === zr.length - 1;
                const pair = (r.zhi || []).join('');
                const pillars = (r.pillars || []).join('-');
                const extra = r.detail ? `  ${r.detail}` : '';
                lines.push(`│ │ ${last ? '└' : '├'}${r.type} : ${pair}  (${pillars}柱)${extra}`);
            });
        }
        // 整柱
        const zp = en.整柱;
        if (zp && Array.isArray(zp) && zp.length > 0) {
            lines.push('│ ├整柱判定');
            zp.forEach((p, i) => {
                const last = i === zp.length - 1;
                lines.push(`│ │ ${last ? '└' : '├'}${p.pillar}柱 ${p.gan}${p.zhi} : ${p.verdict}`);
            });
        }
        // 作用关系(合冲刑害裁决 v1.5)
        const ix = en.作用关系;
        const fmtItems = (items, prefix) => {
            items.forEach((r, i) => {
                const last = i === items.length - 1;
                const mem = (r.members || []).join('');
                const pil = (r.pillars || []).join('-');
                const divg = r.divergence ? `  ⚖分歧:${r.divergence}` : '';
                lines.push(`${prefix}${last ? '└' : '├'}${r.type} ${mem}(${pil}柱·${r.distance}) 【${r.status}】 ${r.cause}${divg}`);
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
            (ys.大运引动 || []).forEach((d) => {
                lines.push(`│   ├大运${d.步} ${d.干支} ${d.年龄}`);
                d.hits.forEach((h, i) => {
                    const last = i === d.hits.length - 1;
                    lines.push(`│   │ ${last ? '└' : '├'}[${h.type}] ${h.desc}`);
                });
            });
            const cd = ys.当前大运流年;
            if (cd && cd.流年 && cd.流年.length > 0) {
                lines.push(`│   └当前大运 ${cd.大运} 流年引动`);
                cd.流年.forEach((y, yi) => {
                    const lastY = yi === cd.流年.length - 1;
                    const all = [...(y.vs原局 || []), ...(y.vs大运 || [])];
                    lines.push(`│     ${lastY ? '└' : '├'}${y.年} ${y.干支} : ${all.map((h) => `[${h.type}]${h.desc.replace(/^流年/, '')}`).join(' ; ')}`);
                });
            }
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
    const lines = [];
    lines.push(...dumpZiwei(chart.ziwei, bi));
    lines.push(...dumpBazi(chart.bazi, bi));
    const text = lines.join('\n');
    if (args.output) {
        fs.writeFileSync(args.output, text, 'utf-8');
        console.error(`Text dump written to ${args.output}`);
    }
    else {
        process.stdout.write(text);
    }
}
main();

"use strict";
// shensha.ts — 神煞计算引擎(数据驱动) v3
// ---------------------------------------------------------------------------
// 设计:算法层中立,本引擎读 shensha.json 的起法表 + 某流派的 shensha_policy,
//       在四柱上计算命中并套权重。新增/改神煞只改 shensha.json,不动本文件。
//
// 用法:
//   const defs   = JSON.parse(fs.readFileSync('shensha.json','utf-8'));
//   const lin    = JSON.parse(fs.readFileSync('lineages.json','utf-8'));
//   const hits   = computeShensha(chart, defs, lin.lineages['ziping'].shensha_policy);
//
// chart 需提供(对齐 run-chart.ts 的 bazi 字段):
//   siZhu: { year:{gan,zhi}, month:{gan,zhi}, day:{gan,zhi}, hour:{gan,zhi} }
//   gender: 'male' | 'female'
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeShensha = computeShensha;
const nayin_1 = require("./yiqi-core/nayin");
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const PILLAR_CN = { year: '年', month: '月', day: '日', hour: '时' };
const YANG_GAN = new Set(['甲', '丙', '戊', '庚', '壬']);
const SEASON = { 寅: '春', 卯: '春', 辰: '春', 巳: '夏', 午: '夏', 未: '夏', 申: '秋', 酉: '秋', 戌: '秋', 亥: '冬', 子: '冬', 丑: '冬' };
const DAY_HOURS = new Set(['卯', '辰', '巳', '午', '未', '申']); // 昼贵当值时段(卯~申),余为夜
function nayinElem(gan, zhi) {
    try {
        return (0, nayin_1.getNaYinWuXing)((0, nayin_1.getNaYin)(gan, zhi));
    }
    catch {
        return '';
    }
}
// ---- 小工具 ----------------------------------------------------------------
function ganList(c) {
    return ['year', 'month', 'day', 'hour'].map(p => ({ gan: c.siZhu[p].gan, p }));
}
function zhiList(c, exclude = []) {
    return ['year', 'month', 'day', 'hour']
        .filter(p => !exclude.includes(p))
        .map(p => ({ zhi: c.siZhu[p].zhi, p }));
}
function sanheOf(zhi, groups) {
    for (const k of Object.keys(groups))
        if (groups[k].includes(zhi))
            return k;
    return null;
}
function pillarsWithZhi(c, target, exclude = []) {
    const ts = Array.isArray(target) ? target : [target];
    return zhiList(c, exclude).filter(x => ts.includes(x.zhi)).map(x => PILLAR_CN[x.p]);
}
function pillarsWithGan(c, target) {
    const ts = Array.isArray(target) ? target : [target];
    return ganList(c).filter(x => ts.includes(x.gan)).map(x => PILLAR_CN[x.p]);
}
// 60甲子序号 → 旬首,用于空亡
function xunKongZhi(gan, zhi) {
    const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const gi = GAN.indexOf(gan), zi = ZHI.indexOf(zhi);
    // 该柱在60甲子的序号
    let idx = -1;
    for (let n = 0; n < 60; n++)
        if (n % 10 === gi && n % 12 === zi) {
            idx = n;
            break;
        }
    const xunHead = idx - (idx % 10); // 旬首序号(甲X)
    const headZhiIdx = xunHead % 12; // 旬首地支
    const a = ZHI[(headZhiIdx + 10) % 12]; // 旬尾后两位 = 空亡
    const b = ZHI[(headZhiIdx + 11) % 12];
    return [a, b];
}
// ---- 各 method 分派 --------------------------------------------------------
function evalDef(c, d, cfg) {
    switch (d.method) {
        case 'dayGan': {
            // 以日干(古法可兼年干)查目标地支
            const g = c.siZhu.day.gan;
            const tgt = d.table?.[g];
            if (!tgt)
                return null;
            const p = pillarsWithZhi(c, tgt);
            if (!p.length)
                return null;
            let via = `日干${g}`;
            // 天乙贵人:昼夜贵分层标注(卯~申时=昼用阳贵,酉~寅时=夜用阴贵;不改命中判定)
            if (d.day_night) {
                const isDay = DAY_HOURS.has(c.siZhu.hour.zhi);
                const yangT = d.day_night['阳贵(昼贵)'] || {};
                const yinT = d.day_night['阴贵(夜贵)'] || {};
                const duty = isDay ? yangT[g] : yinT[g];
                const hitZhis = [...new Set(zhiList(c).filter(x => [].concat(tgt).includes(x.zhi)).map(x => x.zhi))];
                const tags = hitZhis.map(z => z === yangT[g] ? `${z}(阳贵)` : z === yinT[g] ? `${z}(阴贵)` : z);
                via += `·${isDay ? '昼' : '夜'}生当值${duty}${hitZhis.includes(duty) ? '(命中✓)' : '(未见)'}·${tags.join('/')}`;
            }
            return { pillars: p, via };
        }
        case 'sanhe': {
            // 以年支/日支为种子(config.sanhe_seed),查三合局对应目标支
            const seeds = cfg.sanhe_seed.map(s => s === '年' ? 'year' : 'day');
            for (const seedP of seeds) {
                const grp = sanheOf(c.siZhu[seedP].zhi, cfg.sanhe_groups);
                if (!grp)
                    continue;
                const tgt = d.table?.[grp];
                if (!tgt)
                    continue;
                const p = pillarsWithZhi(c, tgt);
                if (p.length)
                    return { pillars: p, via: `${PILLAR_CN[seedP]}支${c.siZhu[seedP].zhi}→${grp}` };
            }
            return null;
        }
        case 'yueZhi_to': {
            // 月支 → 目标(可能是干或支),自动判断落处;exclude_base=月支自身不计(血刃防亥月见亥自命中)
            const tgt = d.table?.[c.siZhu.month.zhi];
            if (!tgt)
                return null;
            const asZhi = pillarsWithZhi(c, tgt, d.exclude_base ? ['month'] : []);
            const asGan = pillarsWithGan(c, tgt);
            const p = [...asGan, ...asZhi];
            return p.length ? { pillars: p, via: `月支${c.siZhu.month.zhi}` } : null;
        }
        case 'yueZhi_sanhe_to_gan': {
            const grp = sanheOf(c.siZhu.month.zhi, cfg.sanhe_groups);
            if (!grp)
                return null;
            const tgt = d.table?.[grp];
            if (!tgt)
                return null;
            const p = pillarsWithGan(c, tgt);
            if (!p.length)
                return null;
            let via = `月令${grp}`;
            // 月德:《三命通会》要日上见——标注足格/力减,不改命中判定
            if (d.day_gan_bonus) {
                via += [].concat(tgt).includes(c.siZhu.day.gan) ? '·日干见(足格)' : '·非日干见(力减)';
            }
            return { pillars: p, via };
        }
        case 'yueZhi_sanhe_dexiu': {
            // 德秀复合:德、秀须同时出现方成
            const grp = sanheOf(c.siZhu.month.zhi, cfg.sanhe_groups);
            if (!grp)
                return null;
            const t = d.table?.[grp];
            if (!t)
                return null;
            const dePil = pillarsWithGan(c, t['德']);
            const xiuPil = pillarsWithGan(c, t['秀']);
            if (dePil.length && xiuPil.length)
                return { pillars: [...new Set([...dePil, ...xiuPil])], via: `月令${grp}·德+秀俱见` };
            return null; // 只见其一不算德秀贵人
        }
        case 'xunkong': {
            // 以日柱旬空,落在年/月/时支
            const [a, b] = xunKongZhi(c.siZhu.day.gan, c.siZhu.day.zhi);
            const p = pillarsWithZhi(c, [a, b], ['day']);
            return p.length ? { pillars: p, via: `日柱旬空(${a}${b})` } : null;
        }
        case 'fixed_pillars': {
            // 默认看日柱;table_core=口诀本版/扩展版标注;hour_note=时柱再见加注(孤鸾/阴差阳错)
            const dayGZ = c.siZhu.day.gan + c.siZhu.day.zhi;
            const hourGZ = c.siZhu.hour.gan + c.siZhu.hour.zhi;
            const list = d.table || [];
            if (!list.includes(dayGZ))
                return null;
            let via = dayGZ;
            if (d.table_core)
                via += d.table_core.includes(dayGZ) ? '(口诀本版)' : '(扩展版)';
            if (d.hour_note && list.includes(hourGZ))
                via += `·时柱${hourGZ}再见(应加重)`;
            return { pillars: ['日'], via };
        }
        case 'guchen_guasu': {
            const seedZhi = c.siZhu.year.zhi; // 主以年支,可改日支
            for (const grp of Object.keys(d.table || {})) {
                if (grp.includes(seedZhi)) {
                    const gu = pillarsWithZhi(c, d.table[grp]['孤']);
                    const gua = pillarsWithZhi(c, d.table[grp]['寡']);
                    if (gu.length || gua.length) {
                        const parts = [];
                        if (gu.length)
                            parts.push('孤辰@' + gu.join(''));
                        if (gua.length)
                            parts.push('寡宿@' + gua.join(''));
                        return { pillars: [...new Set([...gu, ...gua])], via: `年支${seedZhi}·${parts.join('/')}` };
                    }
                }
            }
            return null;
        }
        case 'sanqi': {
            // 严格『顺布连珠』(三命通会卷三论三奇:须顺布连珠方真,倒乱不作奇)。
            // 连续三柱(年→月→日 或 月→日→时)须恰为该奇的顺序(table 数组即顺序),逆/乱不算。
            const g = ganList(c).map(x => x.gan);
            const triples = [[g[0], g[1], g[2]], [g[1], g[2], g[3]]];
            for (const setName of Object.keys(d.table || {})) {
                const seq = d.table[setName];
                for (let i = 0; i < triples.length; i++) {
                    const t = triples[i];
                    if (t.length === 3 && seq.length === 3 && t[0] === seq[0] && t[1] === seq[1] && t[2] === seq[2]) {
                        return { pillars: [i === 0 ? '年月日' : '月日时'], via: `${setName}·顺布` };
                    }
                }
            }
            return null;
        }
        case 'gender_chong': {
            // 元辰:阳男阴女→冲前一位;阴男阳女→冲后一位。以年支为本,年干定阴阳。
            // TODO(cowork): 校验『午未半之』等细则、是否兼用日支。
            const baseZhi = c.siZhu.year.zhi;
            const yangYear = YANG_GAN.has(c.siZhu.year.gan);
            const isMale = c.gender === 'male';
            const yangManYinWoman = (isMale && yangYear) || (!isMale && !yangYear);
            const chongIdx = (ZHI.indexOf(baseZhi) + 6) % 12;
            const targetIdx = yangManYinWoman ? (chongIdx + 1) % 12 : (chongIdx + 11) % 12;
            const target = ZHI[targetIdx];
            const p = pillarsWithZhi(c, target, ['year']);
            return p.length ? { pillars: p, via: `${isMale ? '男' : '女'}·${yangYear ? '阳' : '阴'}年→${target}` } : null;
        }
        // ================= v3 新增查法 =================
        case 'nayin_xuetang': {
            // 学堂词馆:年柱纳音五行→长生位=学堂/临官位=词馆;所临支之纳音与年命同者为『正』
            const yElem = nayinElem(c.siZhu.year.gan, c.siZhu.year.zhi);
            const t = d.table?.[yElem];
            if (!t)
                return null;
            const parts = [];
            const hitP = [];
            for (const kind of ['学堂', '词馆']) {
                const tz = t[kind];
                for (const x of ['year', 'month', 'day', 'hour']) {
                    if (c.siZhu[x].zhi !== tz)
                        continue;
                    const same = nayinElem(c.siZhu[x].gan, c.siZhu[x].zhi) === yElem;
                    parts.push(`${kind}${tz}@${PILLAR_CN[x]}(${same ? '正' : '偏'})`);
                    hitP.push(PILLAR_CN[x]);
                }
            }
            // 变体:干禄词馆(甲干见庚寅之类;日干为主、年干为兼),命中另注
            const v = d.ciguan_ganlu_variant;
            if (v) {
                for (const [seat, g] of [['日干', c.siZhu.day.gan], ['年干', c.siZhu.year.gan]]) {
                    const gz = v[g];
                    if (!gz)
                        continue;
                    const at = ['year', 'month', 'day', 'hour'].filter(x => c.siZhu[x].gan + c.siZhu[x].zhi === gz);
                    if (at.length) {
                        parts.push(`干禄词馆亦合(${seat}${g}→${gz}@${at.map(x => PILLAR_CN[x]).join('')})`);
                        at.forEach(x => hitP.push(PILLAR_CN[x]));
                    }
                }
            }
            return hitP.length ? { pillars: [...new Set(hitP)], via: `年命纳音${yElem}·${parts.join('/')}` } : null;
        }
        case 'yearZhi_to': {
            // 红鸾/天喜:年支→目标支
            const tgt = d.table?.[c.siZhu.year.zhi];
            if (!tgt)
                return null;
            const p = pillarsWithZhi(c, tgt);
            return p.length ? { pillars: p, via: `年支${c.siZhu.year.zhi}→${tgt}` } : null;
        }
        case 'tongzi': {
            // 童子煞:季节法/纳音法任一命中即写(用户定),只查日支/时支,via 标注所用口诀
            const seat = (z) => ['day', 'hour'].filter(x => c.siZhu[x].zhi === z).map(x => PILLAR_CN[x]);
            const season = SEASON[c.siZhu.month.zhi];
            const parts = [];
            const hitP = [];
            for (const z of (d.table?.season?.[season] || [])) {
                const at = seat(z);
                if (at.length) {
                    parts.push(`季节法(${season}生·${z}@${at.join('')})`);
                    hitP.push(...at);
                }
            }
            const yElem = nayinElem(c.siZhu.year.gan, c.siZhu.year.zhi);
            for (const z of (d.table?.nayin?.[yElem] || [])) {
                const at = seat(z);
                if (at.length) {
                    parts.push(`纳音法(${yElem}命·${z}@${at.join('')})`);
                    hitP.push(...at);
                }
            }
            return hitP.length ? { pillars: [...new Set(hitP)], via: parts.join('/') } : null;
        }
        case 'season_day': {
            // 四废:月支定季节,查日柱干支
            const season = SEASON[c.siZhu.month.zhi];
            const list = d.table?.[season] || [];
            const dayGZ = c.siZhu.day.gan + c.siZhu.day.zhi;
            return list.includes(dayGZ) ? { pillars: ['日'], via: `${season}生·${dayGZ}` } : null;
        }
        case 'tianluo_diwang': {
            // 天罗地网:古法(年纳音限定,日支为主兼余支)/现用法(辰巳、戌亥互见),任一命中即写
            const parts = [];
            const hitP = [];
            const yElem = nayinElem(c.siZhu.year.gan, c.siZhu.year.zhi);
            const gf = d.table?.gufa?.[yElem];
            if (gf) {
                const at = zhiList(c, ['year']).filter(x => gf['支'].includes(x.zhi));
                if (at.length) {
                    const dayHit = at.some(x => x.p === 'day');
                    parts.push(`古法(${yElem}命·${gf['名']}@${at.map(x => PILLAR_CN[x.p]).join('')}${dayHit ? '·日支为主' : '·非日支力轻'})`);
                    hitP.push(...at.map(x => PILLAR_CN[x.p]));
                }
            }
            const zs = zhiList(c);
            for (const [name, pair] of Object.entries(d.table?.hujian || {})) {
                const a = zs.filter(x => x.zhi === pair[0]), b = zs.filter(x => x.zhi === pair[1]);
                if (a.length && b.length) {
                    parts.push(`互见法(${name}·${pair[0]}${pair[1]}并见)`);
                    hitP.push(...[...a, ...b].map(x => PILLAR_CN[x.p]));
                }
            }
            return hitP.length ? { pillars: [...new Set(hitP)], via: parts.join('/') } : null;
        }
        case 'yueZhi_prev': {
            // 天医:月支前一位(寅月见丑)
            const tgt = ZHI[(ZHI.indexOf(c.siZhu.month.zhi) + 11) % 12];
            const p = pillarsWithZhi(c, tgt);
            return p.length ? { pillars: p, via: `月支${c.siZhu.month.zhi}→前一位${tgt}` } : null;
        }
        case 'dayGan_multi': {
            // 多版本查法(流霞/天厨):任一版本命中即写并标注版本(用户定)
            const g = c.siZhu.day.gan;
            const parts = [];
            const hitP = [];
            for (const [ver, tab] of Object.entries(d.tables || {})) {
                const tgt = tab[g];
                if (!tgt)
                    continue;
                const p = pillarsWithZhi(c, tgt);
                if (p.length) {
                    parts.push(`${ver}:${[].concat(tgt).join('')}@${p.join('')}`);
                    hitP.push(...p);
                }
            }
            return hitP.length ? { pillars: [...new Set(hitP)], via: `日干${g}·${parts.join('/')}` } : null;
        }
        default:
            return null; // 未知 method:cowork 在 shensha.json 增 method 时,同步在此加 case
    }
}
// ---- 古法交叉校验(文昌/福星) ------------------------------------------------
// 通行版为命中主表;另算《三命通会》古法,古法无命中则提示"古法无"。
// 文献未列全/字句残损者列入 unverified_keys,据铁律不臆测,只标"未校验"。
function evalClassical(c, cl) {
    if (!cl || !cl.method)
        return null;
    const label = cl.label || '古法';
    if (cl.method === 'dayGan') {
        const key = c.siZhu.day.gan;
        if ((cl.unverified_keys || []).includes(key))
            return `古法【${label}】:${key}日干起例文献字句残损,未校验`;
        const tgt = cl.table?.[key];
        if (!tgt)
            return `古法【${label}】:本盘无`;
        const p = pillarsWithZhi(c, tgt);
        return p.length ? `古法【${label}】:亦合 @${p.join('')}` : `古法【${label}】:本盘无(古法在${[].concat(tgt).join('')})`;
    }
    if (cl.method === 'yearGan_ganzhi') {
        const key = c.siZhu.year.gan;
        if ((cl.unverified_keys || []).includes(key))
            return `古法【${label}】:${key}年干「余倒推」原文未列,未校验`;
        const tgt = cl.table?.[key];
        if (!tgt)
            return `古法【${label}】:本盘无`;
        const present = ['year', 'month', 'day', 'hour']
            .filter(p => tgt.includes(c.siZhu[p].gan + c.siZhu[p].zhi)).map(p => PILLAR_CN[p]);
        return present.length ? `古法【${label}】:亦合 @${present.join('')}` : `古法【${label}】:本盘无(古法需${tgt.join('/')})`;
    }
    return null;
}
// ---- 主 loop ---------------------------------------------------------------
function computeShensha(chart, defs, policy) {
    const out = [];
    for (const d of defs.shensha) {
        // 1) 流派权重:白名单优先,否则取 default;0 或黑名单 → 跳过
        if (policy.blacklist?.includes(d.id))
            continue;
        const raw = policy.whitelist?.[d.id];
        // MODERN 层强制门槛:必须被流派 policy 白名单显式列出才启用(不吃 default_weight)。
        // 目前仅『不限流派 open』白名单收录现代神煞;传统流派(子平/滴天髓/…)自动不出现。
        if (d.tier === 'MODERN' && typeof raw !== 'number')
            continue;
        const weight = typeof raw === 'number' ? raw : policy.default_weight;
        if (!weight || weight <= 0)
            continue;
        if (typeof raw === 'string')
            continue; // 段氏 stub 里写着 'TODO权重',未定版则跳过
        // 2) 计算命中
        const r = evalDef(chart, d, defs.config);
        if (!r)
            continue;
        const hit = {
            id: d.id, name: d.name, tier: d.tier, polarity: d.polarity,
            weight, pillars: r.pillars, via: r.via,
            needs_review: d.needs_review, note: d.note,
        };
        if (d.classical) {
            const cc = evalClassical(chart, d.classical);
            if (cc)
                hit.classical_check = cc;
        }
        out.push(hit);
    }
    // 3) 排序:权重降序 → tier(T1>T2>COMPOUND>T3>MODERN)
    const tierRank = { T1: 0, T2: 1, COMPOUND: 2, T3: 3, MODERN: 4 };
    out.sort((a, b) => (b.weight - a.weight) || ((tierRank[a.tier] ?? 9) - (tierRank[b.tier] ?? 9)));
    return out;
}

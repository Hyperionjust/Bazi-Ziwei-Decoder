// test-relations.ts — 合冲刑害裁决引擎 + 运岁引动 回归测试
// 用法: npx tsx test-relations.ts ;全过 exit 0
import { detectZhiRelations } from '../bazi-enrich/zhi-relations';
import { detectGanRelations } from '../bazi-enrich/gan-relations';
import { adjudicateInteractions } from '../bazi-enrich/interactions';
import { analyzeYunSui, gzVsChart, suiVsYun } from '../bazi-enrich/yunsui';
import * as fs from 'fs'; import * as path from 'path';

const lin = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'lineages.json'), 'utf-8'));
const IP = (k: string) => lin.lineages[k].interaction_policy;
let failed = 0;
function ok(cond: boolean, msg: string) { if (cond) console.log('✓', msg); else { console.log('✗', msg); failed++; } }

// 1) 半合 vs 拱合修正
let zr = detectZhiRelations({年:'申',月:'子',日:'寅',时:'戌'} as any);
ok(zr.some(r=>r.type==='半合' && (r.detail||'').includes('生旺')), '申子=水局半合(生旺)');
zr = detectZhiRelations({年:'申',月:'辰',日:'丑',时:'戌'} as any);
ok(zr.some(r=>r.type==='拱合' && (r.detail||'').includes('拱旺神子')), '申辰=生库拱旺神子(虚拱)');
// 2) 相破
zr = detectZhiRelations({年:'子',月:'酉',日:'寅',时:'午'} as any);
ok(zr.some(r=>r.type==='相破' && r.zhi.includes('子') && r.zhi.includes('酉')), '子酉相破检出');
// 3) 争合
const gr = detectGanRelations({年:'庚',月:'乙',日:'庚',时:'丙'} as any);
ok(gr.filter(r=>r.type==='天干合').every(r=>(r.detail||'').includes('争合')), '两庚合一乙=争合标注');
// 4) 合化判定:甲己紧贴+月支辰(本气戊土当令)+有引 → 化土
let adj = adjudicateInteractions({年:{gan:'丙',zhi:'寅'},月:{gan:'甲',zhi:'辰'},日:{gan:'己',zhi:'巳'},时:{gan:'戊',zhi:'辰'}} as any, IP('open'));
ok(adj.items.some(r=>r.type==='天干合' && r.status==='合而化' && r.cause.includes('土')), '甲己紧贴+辰月=合而化土');
//    失令不化:甲己紧贴+月支子
adj = adjudicateInteractions({年:{gan:'丙',zhi:'寅'},月:{gan:'甲',zhi:'子'},日:{gan:'己',zhi:'巳'},时:{gan:'戊',zhi:'辰'}} as any, IP('open'));
ok(adj.items.some(r=>r.type==='天干合' && r.status==='合而不化(绊)'), '甲己+子月=失令不化(绊)');
// 5) 贪合忘冲派系差:子午冲+子丑合
const SZ = {年:{gan:'庚',zhi:'子'},月:{gan:'己',zhi:'丑'},日:{gan:'甲',zhi:'午'},时:{gan:'丙',zhi:'寅'}} as any;
const open_ = adjudicateInteractions(SZ, IP('open'));
const mang_ = adjudicateInteractions(SZ, IP('mangpai'));
const chOpen = open_.items.find(r=>r.type==='六冲');
const chMang = mang_.items.find(r=>r.type==='六冲');
ok(!!chOpen && (chOpen.status==='减力'||chOpen.status==='被解') && chOpen.cause.includes('贪合忘冲'), 'open:子午冲被子丑合减力/解(贪合忘冲)');
ok(!!chMang && chMang.status==='生效', '盲派:同盘子午冲仍生效(不概用贪合忘冲)');
ok(!!chOpen?.divergence && !chMang?.divergence, 'open 带分歧标注,流派视图不带');
// 6) 库冲派系差:辰戌冲
const KZ = {年:{gan:'壬',zhi:'辰'},月:{gan:'庚',zhi:'戌'},日:{gan:'甲',zhi:'亥'},时:{gan:'丙',zhi:'寅'}} as any; // 避开子辰半合干扰
const dt = adjudicateInteractions(KZ, IP('ditian')).items.find(r=>r.type==='六冲');
const zp = adjudicateInteractions(KZ, IP('ziping')).items.find(r=>r.type==='六冲');
ok(!!dt && dt.cause.includes('开库'), '滴天髓:辰戌库冲作开库论');
ok(!!zp && zp.cause.includes('喜忌'), '子平:辰戌库冲以喜忌论');
// 7) 穿权重派系差
const CH = {年:{gan:'庚',zhi:'申'},月:{gan:'丁',zhi:'亥'},日:{gan:'甲',zhi:'子'},时:{gan:'丙',zhi:'寅'}} as any;
ok(adjudicateInteractions(CH, IP('duanshi')).items.some(r=>r.type==='六害'&&r.cause.includes('掀翻')), '段氏:申亥穿作重破坏');
// 8) 运岁:冲提纲/岁运并临/天克地冲
const SZ2 = {年:{gan:'庚',zhi:'午'},月:{gan:'戊',zhi:'寅'},日:{gan:'甲',zhi:'子'},时:{gan:'丙',zhi:'寅'}} as any;
const hits = gzVsChart({gan:'庚',zhi:'申'} as any, SZ2, '大运'); // 壬克戊会走天克地冲分支,换庚
ok(hits.some(h=>h.type==='支冲'&&h.desc.includes('冲提纲')), '大运申冲寅=冲提纲标注');
ok(suiVsYun({gan:'壬',zhi:'申'} as any, {gan:'壬',zhi:'申'} as any).some(h=>h.type==='岁运并临'), '岁运并临检出');
ok(suiVsYun({gan:'丙',zhi:'寅'} as any, {gan:'壬',zhi:'申'} as any).some(h=>h.type==='天克地冲'), '流年丙寅vs大运壬申=天克地冲');
// 9) 伏吟
ok(gzVsChart({gan:'甲',zhi:'子'} as any, SZ2, '大运').some(h=>h.type==='伏吟'), '大运甲子vs日柱甲子=伏吟');
// 10) analyzeYunSui 整体跑通
const ys = analyzeYunSui(SZ2, [{ganZhi:{gan:'壬',zhi:'申'},startAge:1,endAge:10,startYear:2020,endYear:2029,liuNian:[{year:2024,ganZhi:{gan:'甲',zhi:'辰'}},{year:2025,ganZhi:{gan:'乙',zhi:'巳'}}]}], 2024);
ok(ys.大运引动.length>0 && !!ys.当前大运流年, 'analyzeYunSui 大运+流年输出完整');

console.log(failed===0 ? `\n✅ 全部通过` : `\n❌ ${failed} 个失败`);
process.exit(failed===0?0:1);

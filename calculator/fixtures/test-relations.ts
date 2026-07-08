// test-relations.ts — 合冲刑害裁决引擎 + 运岁引动 回归测试
// 用法: npx tsx test-relations.ts ;全过 exit 0
import { detectZhiRelations } from '../bazi-enrich/zhi-relations';
import { detectGanRelations } from '../bazi-enrich/gan-relations';
import { adjudicateInteractions } from '../bazi-enrich/interactions';
import { analyzeYunSui, gzVsChart, suiVsYun } from '../bazi-enrich/yunsui';
import { enrichBazi } from '../bazi-enrich/enrich';
import { detectRarePatterns } from '../bazi-enrich/rare';
import { judgeSpouseProfile } from '../bazi-enrich/zhengyuan';
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

// 11) 用神建议(v2.2):边界盘三线裁决确定性(合成四柱,非真实生辰)
const BD = {年:{gan:'乙',zhi:'丑'},月:{gan:'戊',zhi:'寅'},日:{gan:'戊',zhi:'辰'},时:{gan:'丁',zhi:'酉'}} as any;
const e1 = enrichBazi(BD), e2 = enrichBazi(BD);
const y1 = (e1 as any).用神建议;
ok(!!y1 && y1.边界盘 === true && y1.收敛 === false, '边界盘标记:边界=true 收敛=false');
ok(y1.出文协议.includes('体用两分') && y1.出文协议.includes('禁止单选'), '出文协议含体用两分+禁止单选');
ok(JSON.stringify((e1 as any).用神建议) === JSON.stringify((e2 as any).用神建议), '用神建议两次计算完全一致(可复现)');
ok(y1.扶抑.取.length>0 && y1.调候.取.length>0 && y1.格局.取.length>0, '三线候选齐备');
// 12) 明显身弱盘:扶抑线取印比
const WK = {年:{gan:'庚',zhi:'申'},月:{gan:'乙',zhi:'酉'},日:{gan:'甲',zhi:'申'},时:{gan:'庚',zhi:'午'}} as any;
const yw = (enrichBazi(WK) as any).用神建议;
ok(yw.扶抑.取.includes('水') && yw.扶抑.取.includes('木'), '身弱甲木秋生:扶抑线取水木(印比)');
// 13) v2.3 出口:单值裁决齐备且确定
ok(!!y1.出口 && y1.出口.开运用神.length>0 && y1.出口.吉方.length>0 && y1.出口.divergence.length>0, '边界盘出口:开运用神/吉方/分歧注齐备');
ok(!!yw.出口 && yw.出口.忌神.length>0, '身弱盘出口:忌神非空');
// 14) v2.3 建议节点:天克地冲大运必为重级
const SZ3 = {年:{gan:'庚',zhi:'午'},月:{gan:'戊',zhi:'寅'},日:{gan:'甲',zhi:'子'},时:{gan:'丙',zhi:'寅'}} as any;
const ys3 = analyzeYunSui(SZ3, [{ganZhi:{gan:'壬',zhi:'申'},startAge:1,endAge:10,startYear:2020,endYear:2029,liuNian:[{year:2024,age:5,ganZhi:{gan:'甲',zhi:'辰'}}]}], 2024);
ok(Array.isArray(ys3.建议节点) && ys3.建议节点.length>0, '建议节点输出非空');
ok(ys3.建议节点.some(n=>n.权重==='重'), '壬申运vs戊寅月(天克地冲):存在重级节点');
// 15) v2.3.1 喜忌无交集 + 缺补说明
ok(!(y1.出口.喜神 as string[]).some((w:string)=>(y1.出口.忌神 as string[]).includes(w)), '喜神忌神无交集(冲突过滤)');
ok(typeof y1.出口.缺补说明 === 'string', '缺补说明字段存在');
const QJ = {年:{gan:'丙',zhi:'子'},月:{gan:'甲',zhi:'午'},日:{gan:'己',zhi:'卯'},时:{gan:'乙',zhi:'亥'}} as any;
const yq = (enrichBazi(QJ) as any).用神建议;
ok(yq.出口.缺补说明.includes('缺金'), '缺金盘:缺补说明点名缺金并给结论');

// 16) v2.5 罕象检测
const SK = {年:{gan:'甲',zhi:'辰'},月:{gan:'乙',zhi:'丑'},日:{gan:'甲',zhi:'戌'},时:{gan:'乙',zhi:'未'}} as any; // 合成:四库全
const rr = detectRarePatterns(SK, [], [], []);
ok(rr.some(r=>r.名.includes('四库全') && r.罕见度==='极罕'), '四库全被识别为极罕');
const rr2 = detectRarePatterns(SK, [{id:'dexiu_guiren',polarity:'吉',pillars:['年','月','日']},{id:'tianyi_guiren',polarity:'吉',pillars:['日']},{id:'tiande_guiren',polarity:'吉',pillars:['月']},{id:'yuede_guiren',polarity:'吉',pillars:['年']}], [], []);
ok(rr2.some(r=>r.名==='德秀满盘'), '德秀满盘(≥3柱)被识别');
ok(rr2.some(r=>r.名==='三德会聚'), '三德会聚被识别');
ok(rr2[0].罕见度==='极罕', '排序:极罕在前');
const rrN = detectRarePatterns({年:{gan:'庚',zhi:'午'},月:{gan:'戊',zhi:'寅'},日:{gan:'甲',zhi:'子'},时:{gan:'丙',zhi:'寅'}} as any, [], [], []);
ok(!rrN.some(r=>r.罕见度==='极罕'), '普通盘无极罕误报');

// 17) v2.6 正缘倾向判定
const F1 = {年:{gan:'庚',zhi:'申'},月:{gan:'辛',zhi:'巳'},日:{gan:'甲',zhi:'子'},时:{gan:'丙',zhi:'寅'}} as any; // 女命,官杀(庚辛金)透年月
const z1 = judgeSpouseProfile(F1, 'female');
ok(z1.年龄倾向==='年长' && z1.置信==='高', `女命官杀透年月→年长(高): ${z1.年龄倾向}/${z1.置信}`);
const M1 = {年:{gan:'甲',zhi:'寅'},月:{gan:'丙',zhi:'子'},日:{gan:'甲',zhi:'午'},时:{gan:'己',zhi:'巳'}} as any; // 男命,正财己土仅透时干
const z2 = judgeSpouseProfile(M1, 'male');
ok(z2.年龄倾向==='年轻', `男命财星独现时柱→年轻: ${z2.年龄倾向}`);
ok(JSON.stringify(judgeSpouseProfile(F1,'female'))===JSON.stringify(z1), '正缘判定可复现');

console.log(failed===0 ? `\n✅ 全部通过` : `\n❌ ${failed} 个失败`);
process.exit(failed===0?0:1);

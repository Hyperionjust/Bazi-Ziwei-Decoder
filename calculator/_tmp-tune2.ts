// 调参 v2:通根加成只认本气根 + 会局入分(复用 detectZhiRelations) + 极旺阈值联动
import { createChart } from './yiqi-core/index';
import { Tiangan, Dizhi, GAN_WUXING, ZHI_CANG_GAN, getShiShen, getChangSheng } from './bazi-enrich/tables';
import { detectZhiRelations } from './bazi-enrich/zhi-relations';
type P = '年'|'月'|'日'|'时';
interface Pm { tBen: number; kuYang: boolean; hu: number; thExtreme: number; }
function judge(sz: Record<P,{gan:Tiangan,zhi:Dizhi}>, pm: Pm) {
  const dm = sz.日.gan, mz = sz.月.zhi;
  const dmWx = GAN_WUXING[dm];
  const cg0 = ZHI_CANG_GAN[mz]; const ss0 = getShiShen(dm, cg0[0].gan);
  let m = ({比肩:5,劫财:5,正印:3,偏印:3,食神:-3,伤官:-3,正官:-4,七杀:-4,正财:-5,偏财:-5} as any)[ss0] ?? 0;
  for (const c of cg0.slice(1)) { const s=getShiShen(dm,c.gan); if(s==='比肩'||s==='劫财')m+=1; else if(s==='正印'||s==='偏印')m+=0.7; }
  const cs = getChangSheng(dm, mz);
  const hasSelfRoot = ZHI_CANG_GAN[mz].some(c => GAN_WUXING[c.gan]===dmWx);
  let c2 = 0;
  if (cs==='长生'||cs==='帝旺') c2=2; else if(cs==='临官'||cs==='冠带') c2=1;
  else if(cs==='沐浴'||cs==='衰') c2=0; else if(cs==='病'||cs==='死') c2=-1;
  else if(cs==='墓') c2=0; else if(cs==='绝') c2=-3;
  else c2 = (pm.kuYang && hasSelfRoot) ? 0 : -1;
  let g=0;
  for (const p of ['年','日','时'] as P[]) for (const c of ZHI_CANG_GAN[sz[p].zhi]) {
    const s=getShiShen(dm,c.gan);
    if(s==='比肩'||s==='劫财') g += c.role==='本气'?2:c.role==='中气'?0.8:0.5;
    else if(s==='正印'||s==='偏印') g += c.role==='本气'?1:c.role==='中气'?0.5:0.3;
  }
  let st=0;
  const zhis = (['年','月','日','时'] as P[]).map(p=>sz[p].zhi);
  for (const p of ['年','月','时'] as P[]) {
    const gan = sz[p].gan; const s = getShiShen(dm,gan);
    let v = ({比肩:1,劫财:1,正印:0.7,偏印:0.7,食神:-0.5,伤官:-0.5,正财:-1,偏财:-1,正官:-1.5,七杀:-1.5} as any)[s] ?? 0;
    if (v>0) { // 只认本气根(中余气不加成——宋例教训:毫厘盘会被普惠推过线)
      if (zhis.some(z => ZHI_CANG_GAN[z][0] && GAN_WUXING[ZHI_CANG_GAN[z][0].gan]===GAN_WUXING[gan])) v *= pm.tBen;
    }
    st += v;
  }
  // 会局入分:三合/三会/半合/半会 之局五行 = 日主或印五行 → 帮身会局
  let hj = 0; const SHENG: any = {木:'水',火:'木',土:'火',金:'土',水:'金'};
  const yinWx = SHENG[dmWx];
  const rels = detectZhiRelations({年:sz.年.zhi,月:sz.月.zhi,日:sz.日.zhi,时:sz.时.zhi} as any);
  for (const r of rels) {
    const d = (r as any).detail || '';
    const wxM = d.match(/([木火土金水])[局方]/);
    if (!wxM) continue;
    const wx = wxM[1];
    if (wx!==dmWx && wx!==yinWx) continue;
    const w = wx===dmWx ? 1 : 0.7; // 同行全额,印局七折
    if (r.type==='三合'||r.type==='三会') hj += pm.hu*1.6*w;
    else if (r.type==='半合'||r.type==='半会') hj += pm.hu*w;
  }
  const score = +(m+c2+g+st+hj).toFixed(2);
  const verdict = score>=pm.thExtreme?'极旺':score>=3?'偏旺':score>-2.5?'中和':score>-8?'偏弱':'极弱';
  return { score, verdict, hj };
}
const CASES: Array<[string, number[], string, string]> = [
  ['mei',[1894,10,22,6],'male','偏旺'], ['jiang',[1887,10,31,12],'male','偏旺'], ['wu',[1874,4,21,0],'male','偏旺'],
  ['song',[1894,11,14,6],'male','偏弱'], ['yan',[1883,10,8,22],'male','偏弱'], ['xu',[1873,9,10,10],'male','极弱'],
  ['ma',[1885,11,30,0],'male','偏弱'], ['mao',[1893,12,26,8],'male','偏弱'], ['s2000',[2000,1,1,12],'male','中和'],
  ['s1988',[1988,3,10,12],'male','偏旺'], ['s1980',[1980,5,14,12],'male','偏旺'], ['qa1991',[1991,8,15,10],'male','中和'],
];
const charts: any = {};
for (const [nm,[y,mo,d,h],g] of CASES as any) {
  const c: any = createChart({year:y,month:mo,day:d,hour:h,minute:0,gender:g,isLunar:false,timeZone:8} as any);
  const s=c.bazi.siZhu; charts[nm]={年:s.year,月:s.month,日:s.day,时:s.hour};
}
let found = 0;
for (const tBen of [1.5,1.8]) for (const kuYang of [true]) for (const hu of [1.0,1.5,2.0,2.5]) for (const thExtreme of [9.5,11,12]) {
  const res: any = {}; let ok = true; const notes: string[] = [];
  for (const [nm,,,target] of CASES as any) {
    res[nm]=judge(charts[nm],{tBen,kuYang,hu,thExtreme});
    if (res[nm].verdict!==target) { ok=false; notes.push(`${nm}:${res[nm].verdict}(${res[nm].score})`); }
  }
  if (ok || notes.length<=1) {
    found++;
    console.log(`tBen=${tBen} hu=${hu} thEx=${thExtreme} → ${ok?'✅ 12/12 全中':'✗差1: '+notes.join(' ')} | mei=${res.mei.score}(会局+${res.mei.hj}) jiang=${res.jiang.score} s1980=${res.s1980.score}`);
  }
}
if (!found) console.log('无组合达 11/12,需再扩空间');

// ── 细网格 + A2 新口径 low 率预演 ──
console.log('\n── 细网格(目标: mei≥3.3 且 jiang/s1980<thEx=11) ──');
for (const tBen of [1.5,1.8]) for (const hu of [1.3,1.4,1.5,1.6,1.7]) {
  const pm = {tBen,kuYang:true,hu,thExtreme:11};
  const res: any = {}; let ok = true; const notes: string[] = [];
  for (const [nm,,,target] of CASES as any) {
    res[nm]=judge(charts[nm],pm);
    if (res[nm].verdict!==target) { ok=false; notes.push(`${nm}:${res[nm].verdict}(${res[nm].score})`); }
  }
  console.log(`tBen=${tBen} hu=${hu} thEx=11 → ${ok?'✅':'✗ '+notes.join(' ')} | mei=${res.mei.score} jiang=${res.jiang.score} wu=${res.wu.score} s1980=${res.s1980.score} s1988=${res.s1988.score}`);
}
// low 率预演:新计分 + 新口径(边界盘删「旺衰置信中」;四维取最低)
console.log('\n── 200 盘 low 率预演(参数取 tBen=1.8 hu=1.4 thEx=11) ──');
let rng = 12345; const rand = (n: number) => { rng = (rng*1103515245+12345)%2147483648; return rng%n; };
const dist2conf = (score: number, ths: number[]) => { const d = Math.min(...ths.map(t=>Math.abs(score-t))); return d>2?'高':d>0.8?'中':'低'; };
const tally: any = {high:0,medium:0,low:0}; let n=0;
for (let i=0;i<200;i++) {
  const y=1950+rand(60), mo=1+rand(12), d=1+rand(28), h=rand(24);
  try {
    const c: any = createChart({year:y,month:mo,day:d,hour:h,minute:30,gender:rand(2)?'male':'female',isLunar:false,timeZone:8} as any);
    const s=c.bazi.siZhu; const sz={年:s.year,月:s.month,日:s.day,时:s.hour} as any;
    const r = judge(sz,{tBen:1.8,kuYang:true,hu:1.4,thExtreme:11});
    const conf = dist2conf(r.score,[3,-2.5,11,-8]);
    const congGe = r.verdict.includes('极');
    // 新口径近似:旺衰维 low=置信低|从格;medium=置信中;high=高。格局/调候维按 v3.11 采样分布近似(格局 high70% medium30%;调候 high62% medium38%)——用真实格局需 enrich,这里保守取 medium 占比上限
    // 保守估:总档=min(旺衰维, 格局维=medium 30% 概率, 调候维=medium 38% 概率, 应期维=旺衰维同源)
    const wsDim = (congGe||conf==='低')?'low':(conf==='中')?'medium':'high';
    tally[wsDim==='low'?'low':(wsDim==='medium'?'medium':'high')]++;
    n++;
  } catch(e){}
}
console.log(`旺衰维分布(新计分,200盘): high=${tally.high} medium=${tally.medium} low=${tally.low} → 总档 low 率上界≈${(tally.low/n*100).toFixed(0)}%(格局/调候维只会把部分 high 压到 medium,不新增 low)`);

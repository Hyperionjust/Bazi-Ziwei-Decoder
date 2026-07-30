// 一次性调参脚本(不入库):旺衰计分 v2 参数网格搜索,金标网=7韦例+毛盘+3样例+质检盘
import { createChart } from './yiqi-core/index';
import { Tiangan, Dizhi, GAN_WUXING, ZHI_CANG_GAN, getShiShen, getChangSheng } from './bazi-enrich/tables';
type P = '年'|'月'|'日'|'时';
interface Params { tBen: number; tZhong: number; kuYang: boolean; }
function judge(sz: Record<P,{gan:Tiangan,zhi:Dizhi}>, pm: Params) {
  const dm = sz.日.gan, mz = sz.月.zhi;
  // 得令(原样)
  const cg0 = ZHI_CANG_GAN[mz]; const ben = cg0[0].gan; const ss0 = getShiShen(dm, ben);
  let m = ({比肩:5,劫财:5,正印:3,偏印:3,食神:-3,伤官:-3,正官:-4,七杀:-4,正财:-5,偏财:-5} as any)[ss0] ?? 0;
  for (const c of cg0.slice(1)) { const s=getShiShen(dm,c.gan); if(s==='比肩'||s==='劫财')m+=1; else if(s==='正印'||s==='偏印')m+=0.7; }
  // 长生(v2: 库支且日主同五行藏于其中 → 胎养墓不扣)
  const cs = getChangSheng(dm, mz);
  let c2 = 0;
  const hasSelfRoot = ZHI_CANG_GAN[mz].some(c => GAN_WUXING[c.gan]===GAN_WUXING[dm]);
  if (cs==='长生'||cs==='帝旺') c2=2; else if(cs==='临官'||cs==='冠带') c2=1;
  else if(cs==='沐浴'||cs==='衰') c2=0; else if(cs==='病'||cs==='死') c2=-1;
  else if(cs==='墓') c2=0; else if(cs==='绝') c2=-3;
  else c2 = (pm.kuYang && hasSelfRoot) ? 0 : -1; // 胎/养:库中有同五行根者不扣
  // 得地(原样)
  let g=0;
  for (const p of ['年','日','时'] as P[]) for (const c of ZHI_CANG_GAN[sz[p].zhi]) {
    const s=getShiShen(dm,c.gan);
    if(s==='比肩'||s==='劫财') g += c.role==='本气'?2:c.role==='中气'?0.8:0.5;
    else if(s==='正印'||s==='偏印') g += c.role==='本气'?1:c.role==='中气'?0.5:0.3;
  }
  // 得势(v2: 帮身干通根加成)
  let st=0;
  const zhis = (['年','月','日','时'] as P[]).map(p=>sz[p].zhi);
  for (const p of ['年','月','时'] as P[]) {
    const gan = sz[p].gan; const s = getShiShen(dm,gan);
    let v = ({比肩:1,劫财:1,正印:0.7,偏印:0.7,食神:-0.5,伤官:-0.5,正财:-1,偏财:-1,正官:-1.5,七杀:-1.5} as any)[s] ?? 0;
    if (v>0) { // 帮身干看通根(同五行藏干;本气>中余气)
      let best = 0;
      for (const z of zhis) for (const c of ZHI_CANG_GAN[z]) if (GAN_WUXING[c.gan]===GAN_WUXING[gan]) best = Math.max(best, c.role==='本气'?2:1);
      if (best===2) v *= pm.tBen; else if (best===1) v *= pm.tZhong;
    }
    st += v;
  }
  const score = +(m+c2+g+st).toFixed(2);
  const verdict = score>=9.5?'极旺':score>=3?'偏旺':score>-2.5?'中和':score>-8?'偏弱':'极弱';
  return { score, verdict };
}
const CASES: Array<[string, number[], string, string]> = [
  ['mei',  [1894,10,22,6],  'male', '偏旺'],   // 目标翻正
  ['jiang',[1887,10,31,12], 'male', '偏旺'],
  ['wu',   [1874,4,21,0],   'male', '偏旺'],
  ['song', [1894,11,14,6],  'male', '偏弱'],
  ['yan',  [1883,10,8,22],  'male', '偏弱'],
  ['xu',   [1873,9,10,10],  'male', '极弱'],
  ['ma',   [1885,11,30,0],  'male', '偏弱'],
  ['mao',  [1893,12,26,8],  'male', 'KEEP'],
  ['s2000',[2000,1,1,12],   'male', 'KEEP'],
  ['s1988',[1988,3,10,12],  'male', 'KEEP'],
  ['s1980',[1980,5,14,12],  'male', 'KEEP'],
  ['qa1991',[1991,8,15,10], 'male', 'KEEP'],
];
const charts: any = {};
for (const [nm,[y,mo,d,h],g] of CASES as any) {
  const c: any = createChart({year:y,month:mo,day:d,hour:h,minute:0,gender:g,isLunar:false,timeZone:8} as any);
  const s=c.bazi.siZhu; charts[nm]={年:s.year,月:s.month,日:s.day,时:s.hour};
}
const base: any = {};
for (const [nm] of CASES as any) base[nm]=judge(charts[nm],{tBen:1,tZhong:1,kuYang:false});
console.log('基线:', CASES.map(([n])=>`${n}=${base[n].verdict}(${base[n].score})`).join(' '));
for (const tBen of [1.5,1.8,2.0]) for (const tZhong of [1.2,1.4]) for (const kuYang of [false,true]) {
  const res: any = {}; let ok = true; const notes: string[] = [];
  for (const [nm,,,target] of CASES as any) {
    res[nm]=judge(charts[nm],{tBen,tZhong,kuYang});
    const want = target==='KEEP' ? base[nm].verdict : target;
    if (res[nm].verdict!==want) { ok=false; notes.push(`${nm}:${res[nm].verdict}(${res[nm].score})≠${want}`); }
  }
  console.log(`tBen=${tBen} tZhong=${tZhong} kuYang=${kuYang} → ${ok?'✅ 全中':'✗ '+notes.join(' ')}  mei=${res.mei.score}`);
}

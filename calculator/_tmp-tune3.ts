// 终选:三组候选参数 × (7韦例 tier + 200盘总档分布),confidence 用 A2 新口径完整模拟
import { createChart } from './yiqi-core/index';
import { enrichBazi } from './bazi-enrich/enrich';
import { Tiangan, Dizhi, GAN_WUXING, ZHI_CANG_GAN, getShiShen, getChangSheng } from './bazi-enrich/tables';
import { detectZhiRelations } from './bazi-enrich/zhi-relations';
type P = '年'|'月'|'日'|'时';
interface Pm { tBen: number; hu: number; thExtreme: number; }
function judge(sz: any, pm: Pm) {
  const dm = sz.日.gan, mz = sz.月.zhi; const dmWx = GAN_WUXING[dm as Tiangan];
  const cg0 = ZHI_CANG_GAN[mz as Dizhi]; const ss0 = getShiShen(dm, cg0[0].gan);
  let m = ({比肩:5,劫财:5,正印:3,偏印:3,食神:-3,伤官:-3,正官:-4,七杀:-4,正财:-5,偏财:-5} as any)[ss0] ?? 0;
  for (const c of cg0.slice(1)) { const s=getShiShen(dm,c.gan); if(s==='比肩'||s==='劫财')m+=1; else if(s==='正印'||s==='偏印')m+=0.7; }
  const cs = getChangSheng(dm, mz); const hasSelfRoot = cg0.some(c=>GAN_WUXING[c.gan]===dmWx);
  let c2=0;
  if (cs==='长生'||cs==='帝旺') c2=2; else if(cs==='临官'||cs==='冠带') c2=1;
  else if(cs==='沐浴'||cs==='衰') c2=0; else if(cs==='病'||cs==='死') c2=-1;
  else if(cs==='墓') c2=0; else if(cs==='绝') c2=-3; else c2=hasSelfRoot?0:-1;
  let g=0;
  for (const p of ['年','日','时'] as P[]) for (const c of ZHI_CANG_GAN[sz[p].zhi as Dizhi]) {
    const s=getShiShen(dm,c.gan);
    if(s==='比肩'||s==='劫财') g += c.role==='本气'?2:c.role==='中气'?0.8:0.5;
    else if(s==='正印'||s==='偏印') g += c.role==='本气'?1:c.role==='中气'?0.5:0.3;
  }
  let st=0; const zhis=(['年','月','日','时'] as P[]).map(p=>sz[p].zhi);
  for (const p of ['年','月','时'] as P[]) {
    const gan=sz[p].gan; const s=getShiShen(dm,gan);
    let v=({比肩:1,劫财:1,正印:0.7,偏印:0.7,食神:-0.5,伤官:-0.5,正财:-1,偏财:-1,正官:-1.5,七杀:-1.5} as any)[s]??0;
    if (v>0 && zhis.some(z=>GAN_WUXING[ZHI_CANG_GAN[z as Dizhi][0].gan]===GAN_WUXING[gan as Tiangan])) v*=pm.tBen;
    st+=v;
  }
  let hj=0; const SHENG: any={木:'水',火:'木',土:'火',金:'土',水:'金'}; const yinWx=SHENG[dmWx];
  for (const r of detectZhiRelations({年:sz.年.zhi,月:sz.月.zhi,日:sz.日.zhi,时:sz.时.zhi} as any)) {
    const d=(r as any).detail||''; const wxM=d.match(/([木火土金水])[局方]/); if(!wxM) continue;
    const wx=wxM[1]; if(wx!==dmWx&&wx!==yinWx) continue;
    const w=wx===dmWx?1:0.7;
    if(r.type==='三合'||r.type==='三会') hj+=pm.hu*1.6*w; else if(r.type==='半合'||r.type==='半会') hj+=pm.hu*w;
  }
  const score=+(m+c2+g+st+hj).toFixed(2);
  const verdict=score>=pm.thExtreme?'极旺(可能从强)':score>=3?'偏旺':score>-2.5?'中和':score>-8?'偏弱':'极弱(可能从弱)';
  const dist=Math.min(Math.abs(score-3),Math.abs(score+2.5),Math.abs(score-pm.thExtreme),Math.abs(score+8));
  const conf=dist>2?'高':dist>0.8?'中':'低';
  return {score,verdict,conf};
}
// A2 新口径:四维取最低;旺衰维 low=从格|置信低,medium=置信中|扶抑临界;边界盘定义删「置信中」
function tier4(en: any, ws: any) {
  const congGe=/从强|从弱/.test(ws.verdict);
  const d旺衰=(congGe||ws.conf==='低')?'low':(ws.conf==='中')?'medium':'high';
  const gj=en.格局; const d格局=gj?.confidence==='低'?'low':gj?.confidence==='中'?'medium':'high';
  const 轴=en.用神建议?.出口?.轴冲突; const 无条=en.调候条例?.有条例===false;
  const d调候=(轴||无条)?'medium':'high'; // 时辰边界采样固定 false
  const 边界盘v2 = congGe||ws.conf==='低'||gj?.confidence==='低'||en.用神建议?.扶抑?.临界;
  const d应期=边界盘v2?'medium':'high';
  const rank: any={low:0,medium:1,high:2};
  const dims=[d旺衰,d格局,d调候,d应期];
  return dims.reduce((a,b)=>rank[a]<rank[b]?a:b);
}
const WEI: Array<[string,number[]]> = [['jiang',[1887,10,31,12]],['ma',[1885,11,30,0]],['mei',[1894,10,22,6]],['song',[1894,11,14,6]],['wu',[1874,4,21,0]],['xu',[1873,9,10,10]],['yan',[1883,10,8,22]]];
for (const pm of [{tBen:1.8,hu:1.4,thExtreme:12},{tBen:1.8,hu:1.5,thExtreme:12},{tBen:1.8,hu:1.8,thExtreme:12}]) {
  console.log(`\n== tBen=${pm.tBen} hu=${pm.hu} thEx=${pm.thExtreme} ==`);
  const cnt: any={low:0,medium:0,high:0};
  for (const [nm,[y,mo,d,h]] of WEI) {
    const c: any=createChart({year:y,month:mo,day:d,hour:h,minute:0,gender:'male',isLunar:false,timeZone:8} as any);
    const s=c.bazi.siZhu; const sz={年:s.year,月:s.month,日:s.day,时:s.hour} as any;
    const en: any=enrichBazi(sz); const ws=judge(sz,pm);
    const t=tier4(en,ws); cnt[t]++;
    console.log(` ${nm.padEnd(6)} ${ws.verdict}(${ws.score}) 置信${ws.conf} → tier=${t}`);
  }
  console.log(` 韦例 tier: high=${cnt.high} medium=${cnt.medium} low=${cnt.low} (验收:非low≥3)`);
  let rng=12345; const rand=(n:number)=>{rng=(rng*1103515245+12345)%2147483648;return rng%n;};
  const tl: any={low:0,medium:0,high:0}; let n=0;
  for (let i=0;i<200;i++){
    const y=1950+rand(60),mo=1+rand(12),d=1+rand(28),h=rand(24);
    try{
      const c: any=createChart({year:y,month:mo,day:d,hour:h,minute:30,gender:rand(2)?'male':'female',isLunar:false,timeZone:8} as any);
      const s=c.bazi.siZhu; const sz={年:s.year,月:s.month,日:s.day,时:s.hour} as any;
      const en: any=enrichBazi(sz); const ws=judge(sz,pm);
      tl[tier4(en,ws)]++; n++;
    }catch(e){}
  }
  console.log(` 200盘总档: high=${(tl.high/n*100).toFixed(0)}% medium=${(tl.medium/n*100).toFixed(0)}% low=${(tl.low/n*100).toFixed(0)}% (验收:low 35~50%)`);
}

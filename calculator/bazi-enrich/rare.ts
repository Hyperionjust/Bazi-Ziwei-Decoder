// rare.ts — 罕象检测(算法层) v1
// ---------------------------------------------------------------------------
// 确定性识别盘中的罕见结构并打罕见度标签(极罕/罕见/少见),供解读层在
// 神煞/合冲刑害章【优先讲解】。什么算罕见由本表定义,不交 LLM 现场判断。
// ---------------------------------------------------------------------------

import { Tiangan, Dizhi, GAN_WUXING, ZHI_WUXING, shengKe } from './tables';

type Pillar = '年'|'月'|'日'|'时';
interface GZ { gan: Tiangan; zhi: Dizhi; }

export interface RareItem {
  名: string;
  罕见度: '极罕'|'罕见'|'少见';
  涉及: string;
  说明: string;   // 传统论法一句(供解读层转述,不得神化)
}

const GAN_HE: Record<string, string> = { 甲:'己',己:'甲',乙:'庚',庚:'乙',丙:'辛',辛:'丙',丁:'壬',壬:'丁',戊:'癸',癸:'戊' };
const LIU_CHONG: Record<string, string> = { 子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳' };
const RANK: Record<string, number> = { 极罕: 0, 罕见: 1, 少见: 2 };

export function detectRarePatterns(siZhu: Record<Pillar, GZ>, shenshaHits: any[], zhiRels: any[], ganRels: any[]): RareItem[] {
  const out: RareItem[] = [];
  const P: Pillar[] = ['年', '月', '日', '时'];
  const zhis = P.map(p => siZhu[p].zhi);
  const gans = P.map(p => siZhu[p].gan);
  const zset = new Set(zhis);
  const has4 = (group: string[]) => group.every(z => zset.has(z as Dizhi));

  // ---- 地支组合 ----
  if (has4(['辰', '戌', '丑', '未'])) out.push({ 名: '四库全(四大墓库齐全)', 罕见度: '极罕', 涉及: '四支辰戌丑未', 说明: '财官印食皆有库藏,古论「人元用事,包藏四方」,主收纳格局宏大、中晚年蓄势极厚,亦主一生多聚散开合之课题' });
  if (has4(['寅', '申', '巳', '亥'])) out.push({ 名: '四生全(四长生齐)', 罕见度: '极罕', 涉及: '四支寅申巳亥', 说明: '四驿马长生之地齐聚,主一生动象极强、开创不休,宜动不宜守' });
  if (has4(['子', '午', '卯', '酉'])) out.push({ 名: '四正全(四败/遍野桃花)', 罕见度: '极罕', 涉及: '四支子午卯酉', 说明: '四旺之气纯而不杂,古有「遍野桃花」之名,主气性极专、魅力与是非同重' });
  if (zset.size === 1) out.push({ 名: '四支一字', 罕见度: '极罕', 涉及: `四支皆${zhis[0]}`, 说明: '一气专旺于支,性情命途皆极端化,成败俱大' });

  // ---- 天干组合 ----
  const gcount: Record<string, number> = {};
  for (const g of gans) gcount[g] = (gcount[g] || 0) + 1;
  if (new Set(gans).size === 1) out.push({ 名: '天干一字', 罕见度: '极罕', 涉及: `四干皆${gans[0]}`, 说明: '天元一气,古法专论之格,气纯而志一' });
  else if (Object.values(gcount).some(n => n === 3)) {
    const g = Object.keys(gcount).find(k => gcount[k] === 3)!;
    out.push({ 名: '三朋(三干一字)', 罕见度: '罕见', 涉及: `三干皆${g}`, 说明: '三干同气并立,主其五行之性格外突出' });
  }
  // 天干双合(两组五合,不同柱位)
  {
    const pairs: string[] = [];
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++)
      if (GAN_HE[gans[i]] === gans[j]) pairs.push(`${P[i]}${P[j]}`);
    if (pairs.length >= 2) out.push({ 名: '天干双合', 罕见度: '少见', 涉及: pairs.join('、'), 说明: '两组干合并见,主人际粘性强、诸事多以「合」成局,亦多绊' });
  }

  // ---- 柱对特殊 ----
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    const a = siZhu[P[i]], b = siZhu[P[j]];
    if (a.gan === b.gan && a.zhi === b.zhi)
      out.push({ 名: '原局伏吟', 罕见度: '少见', 涉及: `${P[i]}${P[j]}柱${a.gan}${a.zhi}`, 说明: '两柱干支全同,该宫位之事多重复再现,宜以变应静' });
    const ke = shengKe(GAN_WUXING[a.gan], GAN_WUXING[b.gan]) === '克' || shengKe(GAN_WUXING[b.gan], GAN_WUXING[a.gan]) === '克';
    if (ke && LIU_CHONG[a.zhi] === b.zhi)
      out.push({ 名: '原局天克地冲', 罕见度: '罕见', 涉及: `${P[i]}柱${a.gan}${a.zhi}×${P[j]}柱${b.gan}${b.zhi}`, 说明: '两柱对冲对克,所涉两宫一生互相牵动,大动大成之枢纽' });
  }

  // ---- 关系层(三合三会全等由检测层直接取) ----
  for (const r of (zhiRels || [])) {
    if (r.type === '三合' ) out.push({ 名: '三合局全', 罕见度: '少见', 涉及: (r.zhi || []).join(''), 说明: `${r.detail || '三合成局'},该五行之势贯穿全局` });
    if (r.type === '三会') out.push({ 名: '三会方全', 罕见度: '少见', 涉及: (r.zhi || []).join(''), 说明: `${r.detail || '三会成方'},方局之力大于三合,一方之气独大` });
  }
  // 双冲对峙
  {
    const chongs = (zhiRels || []).filter((r: any) => r.type === '六冲');
    const uniq = new Set(chongs.map((r: any) => (r.zhi || []).slice().sort().join('')));
    if (uniq.size >= 2) out.push({ 名: '双冲对峙', 罕见度: '少见', 涉及: [...uniq].join('、'), 说明: '两组对冲并存,局中动荡之轴有二,人生多双线拉扯' });
  }

  // ---- 神煞叠加 ----
  const hit = (id: string) => (shenshaHits || []).find((h: any) => h.id === id);
  const dx = hit('dexiu_guiren');
  if (dx && (dx.pillars || []).length >= 3) out.push({ 名: '德秀满盘', 罕见度: '极罕', 涉及: `德秀贵人见于${dx.pillars.join('')}柱`, 说明: '德秀本为复合贵格,遍布三柱以上尤罕,主聪明温厚之气贯全局,遇财官则贵' });
  if (hit('tianyi_guiren') && hit('tiande_guiren') && hit('yuede_guiren'))
    out.push({ 名: '三德会聚', 罕见度: '罕见', 涉及: '天乙+天德+月德并见', 说明: '至尊之贵与二德同显,凶煞难近,遇难呈祥之力为诸格之最' });
  if (hit('sanqi')) out.push({ 名: '三奇真格', 罕见度: '罕见', 涉及: (hit('sanqi').via || ''), 说明: '三奇须顺布连珠方真,主襟怀卓越、博学多能' });
  // 吉星聚柱(单柱≥4吉)
  {
    const byP: Record<string, number> = {};
    for (const h of (shenshaHits || [])) if (h.polarity === '吉') for (const p of (h.pillars || [])) byP[p] = (byP[p] || 0) + 1;
    const best = Object.entries(byP).sort((a, b) => b[1] - a[1])[0];
    if (best && best[1] >= 4) out.push({ 名: '吉星聚柱', 罕见度: '罕见', 涉及: `${best[0]}柱叠${best[1]}吉`, 说明: `吉神扎堆于${best[0]}柱,该宫所主之人事为全盘最得天独厚处` });
  }

  out.sort((a, b) => RANK[a.罕见度] - RANK[b.罕见度]);
  return out;
}

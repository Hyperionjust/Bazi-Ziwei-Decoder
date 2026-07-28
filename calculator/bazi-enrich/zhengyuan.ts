// zhengyuan.ts — 正缘倾向判定(算法层) v1
// ---------------------------------------------------------------------------
// 治「正缘画像年龄倾向同盘跳变」:年长/年轻/同龄由通行断法确定性判定,
// LLM 只照抄不裁量。通行断法(非铁律,置信度随证据强弱):
//   ① 夫妻星(男正财/女正官,缺则偏财/七杀)现于年月柱 → 年长;现于日时柱 → 年轻;
//      透干力重于藏干本气,多现取合计。
//   ② 配偶宫(日支)坐星修正:藏印 → 偏年长;藏食伤 → 偏年轻;藏比劫 → 偏同龄。
//   ③ 夫妻星全然不显 → 以宫坐星论,置信降为低(解读可改用性格轴)。
// ---------------------------------------------------------------------------

import { Tiangan, Dizhi, ZHI_CANG_GAN, getShiShen } from './tables';

type Pillar = '年'|'月'|'日'|'时';
interface GZ { gan: Tiangan; zhi: Dizhi; }

export interface SpouseProfile {
  年龄倾向: '年长'|'年轻'|'同龄';
  置信: '高'|'低';
  夫妻星: string;       // 如 '正财(男命妻星)'
  星位: string;         // 命中位置摘要
  宫坐: string;         // 配偶宫本气十神
  依据: string;
}

export function judgeSpouseProfile(siZhu: Record<Pillar, GZ>, gender: 'male'|'female'): SpouseProfile {
  const dm = siZhu.日.gan;
  const primary = gender === 'male' ? ['正财', '偏财'] : ['正官', '七杀'];
  const starLabel = gender === 'male' ? '财星(妻星)' : '官杀(夫星)';

  // 收集夫妻星出现位置:透干(年/月/时)权重2,支藏本气权重1
  const seats: Array<{ p: Pillar; via: string; w: number }> = [];
  for (const p of ['年', '月', '时'] as Pillar[]) {
    const ss = getShiShen(dm, siZhu[p].gan);
    if (primary.includes(ss)) seats.push({ p, via: `${p}干${siZhu[p].gan}(${ss})`, w: 2 });
  }
  for (const p of ['年', '月', '日', '时'] as Pillar[]) {
    const benqi = ZHI_CANG_GAN[siZhu[p].zhi][0]?.gan;
    if (benqi) {
      const ss = getShiShen(dm, benqi);
      if (primary.includes(ss)) seats.push({ p, via: `${p}支${siZhu[p].zhi}藏${benqi}(${ss})`, w: 1 });
    }
  }

  // 位置计分:年+2 月+1 日0 时-2(年月主长辈之气→年长;时柱晚辈之气→年轻)
  const POS: Record<Pillar, number> = { 年: 2, 月: 1, 日: 0, 时: -2 };
  let score = 0, weight = 0;
  for (const s of seats) { score += POS[s.p] * s.w; weight += s.w; }

  // 配偶宫坐星修正
  const gongBenqi = ZHI_CANG_GAN[siZhu.日.zhi][0]?.gan;
  const gongSS = gongBenqi ? getShiShen(dm, gongBenqi) : '';
  let gongAdj = 0, gongNote = '';
  if (gongSS === '正印' || gongSS === '偏印') { gongAdj = 1; gongNote = '配偶宫坐印,偏成熟年长之气'; }
  else if (gongSS === '食神' || gongSS === '伤官') { gongAdj = -1; gongNote = '配偶宫坐食伤,偏鲜活年轻之气'; }
  else if (gongSS === '比肩' || gongSS === '劫财') { gongNote = '配偶宫坐比劫,同辈同频之气'; }
  score += gongAdj;

  let 倾向: SpouseProfile['年龄倾向'];
  if (score >= 2) 倾向 = '年长'; else if (score <= -2) 倾向 = '年轻'; else 倾向 = '同龄';
  const 置信: SpouseProfile['置信'] = weight >= 2 ? '高' : '低';
  const 星位 = seats.length ? seats.map(s => s.via).join('、') : '夫妻星不显于干支本气';
  const 依据 = seats.length
    ? `${starLabel}见于${seats.map(s => s.p).join('')}柱(位置计分${score >= 0 ? '+' : ''}${score})${gongNote ? ';' + gongNote : ''}——年月主长辈之气、时柱主晚辈之气,通行断法`
    : `夫妻星不显,以配偶宫坐星论${gongNote ? '(' + gongNote + ')' : ''};缘分信号偏晚偏淡,判定置信低`;

  return { 年龄倾向: 倾向, 置信, 夫妻星: starLabel, 星位, 宫坐: gongSS || '-', 依据 };
}

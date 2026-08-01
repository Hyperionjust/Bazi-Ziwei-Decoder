// 八字增强分析主入口 — 给定四柱, 输出格局/旺衰/刑冲合害/调候/自坐 等所有 Yiqi 未算的字段

import { Tiangan, Dizhi, getChangSheng } from './tables';
import { detectZhiRelations } from './zhi-relations';
import { detectGanRelations, judgePillars } from './gan-relations';
import { countWuXing, wuXingMonthStatus } from './wu-xing';
import { judgeWangShuai } from './wang-shuai';
import { judgeGeJu } from './ge-ju';
import { getTiaoHou } from './tiao-hou';
import { evalTiaoLi, TiaoLiResult } from './tiaohou-tiaoli';
import { adviseYongShen, YongShenAdvice } from './yongshen';
import { adjudicateInteractions, assertInteractionPolicy, AdjudicationResult, InteractionPolicy } from './interactions';

type Pillar = '年'|'月'|'日'|'时';
type GanZhi = {gan: Tiangan, zhi: Dizhi};

export type EnrichOptions = {
  interactionPolicy: InteractionPolicy;
};

type InteractionView = AdjudicationResult & { id?: string; name?: string };
type OpenInteractionView = AdjudicationResult & { policy: string; lineage?: InteractionView };


export type BaziEnrichment = {
  自坐: Record<Pillar, string>;           // 每柱 干 vs 自身支 的长生
  五行旺相: Record<string, '旺'|'相'|'休'|'囚'|'死'>;
  五行统计: ReturnType<typeof countWuXing>;
  调候用神: string[];
  // J1(v3.11.0):调候条例命中清单。典籍每格是条件树,不止「取干」两个字——
  //   丙透没透、癸藏没藏、是不是一派庚辛,全是查盘面就能判的确定性事实。
  //   尚未吸收的格返回 有条例:false 的空壳(分批吸收期间不报错)。
  调候条例: TiaoLiResult;
  格局: ReturnType<typeof judgeGeJu>;
  旺衰: ReturnType<typeof judgeWangShuai>;
  用神建议: YongShenAdvice;
  天干关系: ReturnType<typeof detectGanRelations>;
  地支关系: ReturnType<typeof detectZhiRelations>;
  作用关系: OpenInteractionView;
  整柱: ReturnType<typeof judgePillars>;
};

export function enrichBazi(
  siZhu: Record<Pillar, GanZhi>,
  options: EnrichOptions,
): BaziEnrichment {
  const dm = siZhu.日.gan;
  const monthZhi = siZhu.月.zhi;

  const interactionPolicy = assertInteractionPolicy(options?.interactionPolicy, 'enrichBazi.open.interaction_policy');
  const ganRelations = detectGanRelations({
    年: siZhu.年.gan, 月: siZhu.月.gan, 日: siZhu.日.gan, 时: siZhu.时.gan
  });
  const zhiRelations = detectZhiRelations({
    年: siZhu.年.zhi, 月: siZhu.月.zhi, 日: siZhu.日.zhi, 时: siZhu.时.zhi
  });
  const adjudicated = adjudicateInteractions(siZhu, interactionPolicy, zhiRelations, ganRelations);


  // 自坐 — 每柱干在自身支的长生位
  const ziZuo: Record<Pillar, string> = {} as any;
  for (const p of ['年','月','日','时'] as Pillar[]) {
    ziZuo[p] = getChangSheng(siZhu[p].gan, siZhu[p].zhi);
  }

  const geJu = judgeGeJu(siZhu);
  const wangShuai = judgeWangShuai(siZhu, { interactions: adjudicated.items });
  const tiaoHou = getTiaoHou(dm, monthZhi);
  const wxCount = countWuXing(siZhu, dm);
  const wxForYs: Record<string, number> = (wxCount as any).withCangGan || (wxCount as any).surface || (wxCount as any);

  return {
    自坐: ziZuo,
    五行旺相: wuXingMonthStatus(monthZhi),
    五行统计: wxCount,
    调候用神: tiaoHou,
    // v3.12 批B2:传身势供「前提」过滤(财多身弱类条例不再命中中和/身强盘)
    调候条例: evalTiaoLi(siZhu, dm,
      /旺/.test(wangShuai.verdict) ? '强' : /弱/.test(wangShuai.verdict) ? '弱' : '中和'),
    格局: geJu,
    旺衰: wangShuai,
    用神建议: adviseYongShen(dm, wangShuai, tiaoHou, geJu, wxForYs, siZhu), // S1-3:传四柱供相神裁决判重神透干
    作用关系: { policy: 'open(通则+分歧标注)', ...adjudicated },
    天干关系: ganRelations,
    地支关系: zhiRelations,
    整柱: judgePillars(siZhu)
  };
}

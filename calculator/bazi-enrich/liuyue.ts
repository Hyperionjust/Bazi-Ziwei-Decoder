// liuyue.ts — 流月引动(P1-A) v1
// ---------------------------------------------------------------------------
// --currentYear 存在时,对该流年的 12 个流月(按节气分月,五虎遁起月干)各跑一遍
// 与原局/该年大运的引动检测——复用 yunsui.ts 的 gzVsChart/suiVsYun(label='流月'),
// 不另造检测逻辑。节气时刻取 lunar-typescript 精确表(单表覆盖本年立春→次年惊蛰,
// 次周期条目为拼音大写键,如 XIAO_HAN/LI_CHUN,经探测确认)。
// 供 liunian-qa 把「下半年/这个月/几月适合…」类问题落到月级窗口。
// ---------------------------------------------------------------------------

import { Solar } from 'lunar-typescript';
import { gzVsChart, suiVsYun, SiZhuMap, YunSuiHit } from './yunsui';
import { Tiangan, Dizhi } from './tables';

const GAN10 = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHI12 = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
// 五虎遁: 流年年干 → 寅月月干
const WUHU: Record<string, string> = { 甲: '丙', 己: '丙', 乙: '戊', 庚: '戊', 丙: '庚', 辛: '庚', 丁: '壬', 壬: '壬', 戊: '甲', 癸: '甲' };
// 流月月支序(寅月起) 与 各月起点节气(前 11 个在本年,小寒在次年)
const MONTH_ZHI = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
const MONTH_JIEQI = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'];
// 节气月 ≈ 农历月序(近似对照,便于「农历七、八月」类白话表述)
const MONTH_NONGLI = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];

export interface LiuYueMonth {
  序: number;                 // 1-12(寅月=1)
  支: string;
  干支: string;
  节气: string;               // 起点节气名
  公历起: string;             // YYYY-MM-DD(节气精确时刻所在日)
  公历止: string;             // YYYY-MM-DD(下一节气日,不含)
  约农历月: string;           // 近似农历月序(节气分月口径)
  vs原局: YunSuiHit[];
  vs大运: YunSuiHit[];
}

export interface LiuYueResult {
  说明: string;
  年: number;
  年干支: string;
  大运: string;               // 该年所在大运干支(未起运则 '未起运')
  月: LiuYueMonth[];
}

const fmtDate = (s: any) => `${s.getYear()}-${String(s.getMonth()).padStart(2, '0')}-${String(s.getDay()).padStart(2, '0')}`;

/** 流年 year 的 12 流月引动。dayun 为算法层大运数组(取覆盖该年的一步作 vs大运 对象)。 */
export function analyzeLiuYue(siZhu: SiZhuMap, dayun: any[], year: number): LiuYueResult {
  const yGan = GAN10[(year - 4) % 10];
  const yZhi = ZHI12[(year - 4) % 12];

  // 节气表: 取该公历年 6 月 1 日所在农历年的表(必覆盖本年立春→次年立春;次周期为拼音键)
  const table: any = Solar.fromYmd(year, 6, 1).getLunar().getJieQiTable();
  const PINYIN: Record<string, string> = { 小寒: 'XIAO_HAN', 立春: 'LI_CHUN' };
  const jieqiSolar = (name: string, nextCycle: boolean): any => {
    const key = nextCycle ? (PINYIN[name] || name) : name;
    return table[key];
  };

  const cur = (dayun || []).find(d => year >= d.startYear && year <= d.endYear);
  const dGZ = cur ? { gan: cur.ganZhi.gan as Tiangan, zhi: cur.ganZhi.zhi as Dizhi } : null;

  const yinGan = WUHU[yGan];
  const months: LiuYueMonth[] = [];
  for (let i = 0; i < 12; i++) {
    const zhi = MONTH_ZHI[i];
    const gan = GAN10[(GAN10.indexOf(yinGan) + i) % 10];
    const gz = { gan: gan as Tiangan, zhi: zhi as Dizhi };
    const start = jieqiSolar(MONTH_JIEQI[i], MONTH_JIEQI[i] === '小寒');
    const end = i < 11 ? jieqiSolar(MONTH_JIEQI[i + 1], MONTH_JIEQI[i + 1] === '小寒') : jieqiSolar('立春', true);
    months.push({
      序: i + 1,
      支: zhi,
      干支: gan + zhi,
      节气: MONTH_JIEQI[i],
      公历起: start ? fmtDate(start) : '-',
      公历止: end ? fmtDate(end) : '-',
      约农历月: MONTH_NONGLI[i],
      vs原局: gzVsChart(gz, siZhu, '流月'),
      vs大运: dGZ ? suiVsYun(gz, dGZ, '流月') : [],
    });
  }

  return {
    说明: '流月引动=该流年 12 个节气月(月干五虎遁起)与原局/该年大运的合冲刑害检测,复用运岁引动同一套检测器、粒度降到月。供月级窗口选择(「几月适合…」);吉凶随喜忌定,月令力量轻于大运流年,只作窗口微调不改全年定调。',
    年: year,
    年干支: yGan + yZhi,
    大运: cur ? `${cur.ganZhi.gan}${cur.ganZhi.zhi}(${cur.startYear}-${cur.endYear})` : '未起运',
    月: months,
  };
}

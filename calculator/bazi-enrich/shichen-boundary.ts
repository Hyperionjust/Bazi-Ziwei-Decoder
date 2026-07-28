// shichen-boundary.ts — 时辰边界检测(P0-A) v1
// ---------------------------------------------------------------------------
// 全链准确性建立在「时辰输入正确」之上:时辰错一格 → 时柱/紫微命宫/大限全错。
// 本模块计算出生时刻距最近时辰交界(奇数整点 01/03/…/23 点)的分钟差,
// |Δ| ≤ 20 分钟 → boundary: true,并给出相邻的另一个候选时辰。
// 只做检测与候选提示(幕后施工图);核盘流程(追问出生地/双盘核对)见 SKILL.md。
// ---------------------------------------------------------------------------

// 边界阈值(分钟):距交界 ≤ 20 分钟判临界。
export const BOUNDARY_THRESHOLD_MIN = 20;

const ZHI12 = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 时支区间表述(子时跨日: 23:00-01:00)
function zhiRange(zhiIdx: number): string {
  if (zhiIdx === 0) return '23:00-01:00';
  const start = zhiIdx * 2 - 1;
  return `${String(start).padStart(2, '0')}:00-${String(start + 2).padStart(2, '0')}:00`;
}

// 时支索引(与 yiqi-core getHourGanZhi 同口径: floor((hour+1)/2)%12)
function zhiIdxOfHour(hour: number): number {
  return Math.floor((hour + 1) / 2) % 12;
}

export interface ShichenBoundaryResult {
  说明: string;
  口径: string;              // '钟表时间(未做真太阳时校正)' | '真太阳时(经度校正后)'
  排盘时刻: string;          // 归一化后实际用于排盘的 HH:MM
  当前时辰: string;          // 如 '午时(11:00-13:00)'
  最近交界: string;          // 如 '13:00(午→未)'
  距交界分钟: number;        // 有符号: 负=交界前, 正=交界后(0=恰在交界,归后一时辰)
  boundary: boolean;
  候选时辰?: { 支: string; 名: string; 区间: string; 说明: string };
  solar_note?: string;
}

/**
 * 时辰边界检测。
 * @param hour/minute 归一化后的排盘时刻(东八区钟表时;若做了真太阳时校正则为校正后时刻)
 * @param opts.corrected 是否已做真太阳时校正(--longitude);未校正时附 solar_note
 */
export function detectShichenBoundary(hour: number, minute: number, opts?: { corrected?: boolean }): ShichenBoundaryResult {
  const corrected = !!opts?.corrected;
  const m = hour * 60 + minute;

  // 最近交界: 奇数整点 01:00…23:00,按一天 1440 分钟环形取最小 |Δ|
  let best = { delta: Infinity, boundaryHour: -1 };
  for (let k = 0; k < 12; k++) {
    const b = (2 * k + 1) * 60;
    let d = m - b;
    if (d > 720) d -= 1440;
    if (d <= -720) d += 1440;
    if (Math.abs(d) < Math.abs(best.delta)) best = { delta: d, boundaryHour: 2 * k + 1 };
  }
  const { delta, boundaryHour } = best;
  const boundary = Math.abs(delta) <= BOUNDARY_THRESHOLD_MIN;

  const curIdx = zhiIdxOfHour(hour);
  // 交界两侧时支: 交界时刻起属后一时辰(与排盘口径一致)
  const afterIdx = zhiIdxOfHour(boundaryHour);
  const beforeIdx = (afterIdx + 11) % 12;
  const curZhi = ZHI12[curIdx];
  const hhmm = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  const res: ShichenBoundaryResult = {
    说明: `时辰交界为奇数整点;距交界 ≤ ${BOUNDARY_THRESHOLD_MIN} 分钟判临界盘,须走核盘流程(追问出生地换算经度重排,或双盘核对大事年份)后再解读。`,
    口径: corrected ? '真太阳时(经度校正后)' : '钟表时间(未做真太阳时校正)',
    排盘时刻: hhmm,
    当前时辰: `${curZhi}时(${zhiRange(curIdx)})`,
    最近交界: `${String(boundaryHour).padStart(2, '0')}:00(${ZHI12[beforeIdx]}→${ZHI12[afterIdx]})`,
    距交界分钟: delta,
    boundary,
  };

  if (boundary) {
    // 相邻候选: 出生在交界后(含恰在交界) → 候选为交界前一时辰;交界前 → 候选为交界后一时辰
    const candIdx = delta >= 0 ? beforeIdx : afterIdx;
    const candZhi = ZHI12[candIdx];
    const dir = delta >= 0 ? `若实际出生早于 ${String(boundaryHour).padStart(2, '0')}:00` : `若实际出生晚于 ${String(boundaryHour).padStart(2, '0')}:00`;
    // 23:00 交界特殊: 亥/晚子切换同时改变日柱(晚子时日柱按次日推,见 zishi_convention)
    const crossZi = boundaryHour === 23;
    const ziNote = crossZi
      ? (candIdx === 0
        ? ',且日柱将按晚子时约定换为次日——时柱与日柱同时改变,差异极大'
        : ',且日柱将由次日退回当日(不再按晚子时换日)——时柱与日柱同时改变,差异极大')
      : ',时柱(及紫微命宫/大限)随之改变';
    res.候选时辰 = {
      支: candZhi,
      名: `${candZhi}时`,
      区间: zhiRange(candIdx),
      说明: `${dir},时辰应为${candZhi}时${ziNote}。`,
    };
  }

  if (!corrected) {
    res.solar_note = '未做真太阳时校正,本边界判定按「钟表时间」口径。中国境内钟表时间(东八区)与当地真太阳时的偏差按经度约在 -3 小时(西部,如喀什)~ +30 分钟(东部,如抚远)量级,另有均时差 ±16 分钟;临界盘建议追问出生地(城市即可)换算经度后加 --longitude 重排。';
  }

  return res;
}

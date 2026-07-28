// 节气计算模块

// 24节气名称
export const JIEQI_NAMES = [
  '小寒', '大寒', '立春', '雨水', '惊蛰', '春分',
  '清明', '谷雨', '立夏', '小满', '芒种', '夏至',
  '小暑', '大暑', '立秋', '处暑', '白露', '秋分',
  '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'
];

// 节气对应的地支月索引表已随 v3.5 死代码清理移除——活路径一律走 getAccurateMonthGanZhi（精确节气时刻）。

// v3.5 死代码清理：calculateJieqi/getJieqiMonth/getMonthGanZhi 已删除。
// 它们是线性外推的粗近似（误差 ±1-2 天）且无人调用——月柱活路径一律用下方 getAccurateMonthGanZhi（精确节气时刻）。

import type { Tiangan, Dizhi } from './types';

/**
 * 获取当前时刻应该使用的月柱（基于精确节气时刻）
 * 
 * lunar-javascript默认在节气当日的子时（00:00）就换月柱，
 * 但传统命理应该在节气的精确时刻才换月柱。
 * 
 * 例如：某年立秋在公历8月初，那么：
 * - 8月8日 02:28 应该用乙未月（立秋前）
 * - 8月8日 10:00 应该用丙申月（立秋后）
 * 
 * @param solar Solar对象（来自lunar-javascript）
 * @returns 月柱干支
 */
export function getAccurateMonthGanZhi(solar: any): { gan: Tiangan; zhi: Dizhi } {
  const lunar = solar.getLunar();
  
  // 获取lunar-javascript给出的月柱（默认在子时换月）
  const defaultMonthGZ = lunar.getMonthInGanZhi();
  
  // 获取当前节令（节气）
  const currentJieQi = lunar.getJieQi();
  
  // 获取节气表
  const jieQiTable = lunar.getJieQiTable();
  const jieQiSolar = jieQiTable[currentJieQi];
  
  if (!jieQiSolar) {
    // 没有节气信息，使用默认值
    return parseGanZhi(defaultMonthGZ);
  }
  
  // 判断是否在节气当日
  const isJieQiDay = 
    solar.getYear() === jieQiSolar.getYear() &&
    solar.getMonth() === jieQiSolar.getMonth() &&
    solar.getDay() === jieQiSolar.getDay();
  
  if (!isJieQiDay) {
    // 不在节气当日，直接使用默认值
    return parseGanZhi(defaultMonthGZ);
  }
  
  // 在节气当日，需要判断是否已过节气时刻
  const solarTime = solar.getHour() * 3600 + solar.getMinute() * 60 + solar.getSecond();
  const jieQiTime = jieQiSolar.getHour() * 3600 + jieQiSolar.getMinute() * 60 + jieQiSolar.getSecond();
  
  if (solarTime < jieQiTime) {
    // 还没到节气时刻，应该使用上一个月的月柱
    // 获取前一天的月柱
    const prevDaySolar = solar.next(-1); // 往前推一天
    const prevDayLunar = prevDaySolar.getLunar();
    const prevMonthGZ = prevDayLunar.getMonthInGanZhi();
    
    return parseGanZhi(prevMonthGZ);
  }
  
  // 已经过了节气时刻，使用当前月柱
  return parseGanZhi(defaultMonthGZ);
}

/**
 * 解析干支字符串为天干地支对象
 * @param gz 干支字符串，如"甲子"
 * @returns 天干地支对象
 */
function parseGanZhi(gz: string): { gan: Tiangan; zhi: Dizhi } {
  if (!gz || gz.length < 2) {
    throw new Error(`无效的干支字符串: ${gz}`);
  }
  
  return {
    gan: gz[0] as Tiangan,
    zhi: gz[1] as Dizhi
  };
}

/**
 * 获取节气的精确时刻（用于调试和显示）
 * @param solar Solar对象
 * @param jieQiName 节气名称
 * @returns 节气的Solar对象，如果找不到返回null
 */
export function getJieQiTime(solar: any, jieQiName: string): any | null {
  const lunar = solar.getLunar();
  const jieQiTable = lunar.getJieQiTable();
  return jieQiTable[jieQiName] || null;
}
